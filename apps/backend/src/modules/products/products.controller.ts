import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Param,
  ParseIntPipe,
  NotFoundException,
  Body,
  UseGuards,
} from '@nestjs/common'
import { ProductsService } from './products.service'
import { ProductQueryDto } from './dto/product-query.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query)
  }

  @Get('categories')
  getCategories() {
    return this.productsService.getCategories()
  }

  @Get('stats')
  getStats() {
    return this.productsService.getStats()
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id)
    if (!product) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado`)
    }
    return product
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.productsService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.productsService.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id)
  }
}
