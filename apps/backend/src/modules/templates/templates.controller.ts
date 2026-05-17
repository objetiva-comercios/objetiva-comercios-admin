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
  BadRequestException,
} from '@nestjs/common'
import { TemplatesService } from './templates.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { ReplaceTemplateAtributosDto } from './dto/template-atributos.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

/**
 * Controller de templates. JWT auth se aplica globalmente vía CompositeAuthGuard.
 * RBAC: reads abiertos a admin+viewer; writes restringidos a admin via @Roles.
 *
 * Endpoints:
 *   GET    /templates[?activo=true|false|all]
 *   GET    /templates/:id                     → template + atributos[]
 *   POST   /templates                         (admin) → crear template
 *   PATCH  /templates/:id                     (admin) → update parcial
 *   GET    /templates/:id/atributos           → solo lista de atributos
 *   PATCH  /templates/:id/atributos           (admin) → reemplaza atributos
 */
@Controller('templates')
export class TemplatesController {
  constructor(private readonly service: TemplatesService) {}

  @Get()
  findAll(@Query('activo') activo?: string) {
    // Mismo patrón de parsing del PropiedadesController:
    //   default → true; 'all' → undefined; 'true'/'false' → boolean; otro → 400.
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
    return this.service.findAll({ activo: activoFilter })
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateTemplateDto) {
    return this.service.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTemplateDto) {
    return this.service.update(id, dto)
  }

  @Get(':id/atributos')
  findAtributos(@Param('id', ParseIntPipe) id: number) {
    return this.service.findAtributos(id)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/atributos')
  replaceAtributos(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplaceTemplateAtributosDto
  ) {
    return this.service.replaceAtributos(id, dto.atributos)
  }
}
