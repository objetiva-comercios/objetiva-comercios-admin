import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  ParseIntPipe,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { PropiedadesService } from './propiedades.service'
import { CreatePropiedadDto } from './dto/create-propiedad.dto'
import { UpdatePropiedadDto } from './dto/update-propiedad.dto'
import { PROP_TIPOS, type PropTipo } from './propiedades.constants'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

/**
 * Controller parametrizado por `:tipo` que expone CRUD para las 6 tablas
 * `prop_*`. JWT auth se aplica globalmente vía `CompositeAuthGuard`. RBAC:
 * reads abiertos a admin+viewer; writes restringidos a admin via @Roles.
 */
@Controller('propiedades')
export class PropiedadesController {
  constructor(private readonly service: PropiedadesService) {}

  @Get(':tipo')
  findAll(@Param('tipo') tipo: string, @Query('activo') activo?: string) {
    this.assertValidTipo(tipo)
    // 'all'  → undefined (sin filtro)
    // 'true' → true
    // 'false'→ false
    // (sin query) → true (default per D-18)
    // (cualquier otro valor) → 400 (input mal-formado, no silenciar)
    let activoFilter: boolean | undefined
    if (activo === undefined) activoFilter = true
    else if (activo === 'all') activoFilter = undefined
    else if (activo === 'true') activoFilter = true
    else if (activo === 'false') activoFilter = false
    else {
      throw new BadRequestException(
        `Query param 'activo' debe ser 'true', 'false' o 'all' (recibido: '${activo}')`
      )
    }
    return this.service.findAll(tipo, { activo: activoFilter })
  }

  @Get(':tipo/:id')
  async findOne(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    this.assertValidTipo(tipo)
    const row = await this.service.findOne(tipo, id)
    if (!row) {
      throw new NotFoundException(`Propiedad con ID ${id} no encontrada en ${tipo}`)
    }
    return row
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':tipo')
  create(@Param('tipo') tipo: string, @Body() dto: CreatePropiedadDto) {
    this.assertValidTipo(tipo)
    return this.service.create(tipo, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':tipo/:id')
  update(
    @Param('tipo') tipo: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePropiedadDto
  ) {
    this.assertValidTipo(tipo)
    return this.service.update(tipo, id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':tipo/:id/toggle')
  toggleActive(@Param('tipo') tipo: string, @Param('id', ParseIntPipe) id: number) {
    this.assertValidTipo(tipo)
    return this.service.toggleActive(tipo, id)
  }

  /** Valida el URL param `tipo` contra PROP_TIPOS, narrowing a PropTipo.
   *  Lanza 400 (input inválido) — alineado con `tableFor` en el service. */
  private assertValidTipo(tipo: string): asserts tipo is PropTipo {
    if (!(PROP_TIPOS as readonly string[]).includes(tipo)) {
      throw new BadRequestException(`Tipo de propiedad inválido: ${tipo}`)
    }
  }
}
