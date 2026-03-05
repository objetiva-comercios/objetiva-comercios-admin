import {
  Controller,
  Get,
  Post,
  Patch,
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

  @Get(':codigo')
  async findOne(@Param('codigo') codigo: string) {
    const articulo = await this.articulosService.findOne(codigo)
    if (!articulo) {
      throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
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
  @Patch(':codigo')
  update(@Param('codigo') codigo: string, @Body() dto: UpdateArticuloDto) {
    return this.articulosService.update(codigo, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':codigo/toggle')
  toggleActive(@Param('codigo') codigo: string) {
    return this.articulosService.toggleActive(codigo)
  }
}
