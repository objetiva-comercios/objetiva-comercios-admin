import { Controller, Get, Query, Param, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { ProductsService } from './products.service'
import { ProductQueryDto } from './dto/product-query.dto'
import { Public } from '../../common/decorators/public.decorator'

@Public()
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

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const product = this.productsService.findOne(id)
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }
    return product
  }
}
