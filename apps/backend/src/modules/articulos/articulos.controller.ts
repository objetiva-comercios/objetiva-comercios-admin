import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common'
import { ArticulosService } from './articulos.service'
import { ArticuloQueryDto } from './dto/articulo-query.dto'
import { CreateArticuloDto } from './dto/create-articulo.dto'
import { UpdateArticuloDto } from './dto/update-articulo.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('articulos')
export class ArticulosController {
  constructor(private readonly articulosService: ArticulosService) {}

  @Get()
  findAll(@Query() query: ArticuloQueryDto) {
    return this.articulosService.findAll(query)
  }

  // IMPORTANTE: by-codigo/:codigo debe declararse ANTES de :sku para que NestJS
  // no interprete "by-codigo" como un valor de :sku (path-specificity T-31-15).
  @Get('by-codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.articulosService.findByCodigo(codigo)
  }

  @Get(':sku')
  async findOne(@Param('sku') sku: string) {
    const articulo = await this.articulosService.findOne(sku)
    if (!articulo) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }
    return articulo
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: CreateArticuloDto) {
    return this.articulosService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':sku')
  update(@Param('sku') sku: string, @Body() dto: UpdateArticuloDto) {
    return this.articulosService.update(sku, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':sku/toggle')
  toggleActive(@Param('sku') sku: string) {
    return this.articulosService.toggleActive(sku)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':sku')
  @HttpCode(HttpStatus.OK)
  softDelete(@Param('sku') sku: string) {
    return this.articulosService.softDelete(sku)
  }
}
