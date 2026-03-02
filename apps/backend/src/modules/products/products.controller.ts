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
} from '@nestjs/common'
import { ProductsService } from './products.service'
import { ProductQueryDto } from './dto/product-query.dto'

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
      throw new NotFoundException(`Product with ID ${id} not found`)
    }
    return product
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.productsService.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.productsService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id)
  }
}
