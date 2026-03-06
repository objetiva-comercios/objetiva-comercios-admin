import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { InventariosService } from './inventarios.service'
import { CreateInventarioDto } from './dto/create-inventario.dto'
import { UpdateInventarioDto } from './dto/update-inventario.dto'
import { InventarioQueryDto } from './dto/inventario-query.dto'
import { CreateInventarioArticuloDto } from './dto/create-inventario-articulo.dto'
import { UpdateInventarioArticuloDto } from './dto/update-inventario-articulo.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('inventarios')
export class InventariosController {
  constructor(private readonly inventariosService: InventariosService) {}

  @Get()
  findAll(@Query() query: InventarioQueryDto) {
    return this.inventariosService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.inventariosService.findOne(id)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateInventarioDto) {
    return this.inventariosService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateInventarioDto) {
    return this.inventariosService.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/estado')
  transitionEstado(@Param('id', ParseIntPipe) id: number, @Body('estado') estado: string) {
    return this.inventariosService.transitionEstado(id, estado)
  }

  @Get(':id/articulos')
  getArticulos(@Param('id', ParseIntPipe) id: number) {
    return this.inventariosService.getArticulosWithDiscrepancy(id)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post(':id/articulos')
  @HttpCode(HttpStatus.CREATED)
  addArticulo(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateInventarioArticuloDto) {
    return this.inventariosService.addArticulo(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id/articulos/:articuloId')
  updateArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('articuloId', ParseIntPipe) articuloId: number,
    @Body() dto: UpdateInventarioArticuloDto
  ) {
    return this.inventariosService.updateArticulo(id, articuloId, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id/articulos/:articuloId')
  removeArticulo(
    @Param('id', ParseIntPipe) id: number,
    @Param('articuloId', ParseIntPipe) articuloId: number
  ) {
    return this.inventariosService.removeArticulo(id, articuloId)
  }
}
