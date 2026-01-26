import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { SalesService } from './sales.service'
import { SaleQueryDto } from './dto/sale-query.dto'
import { Public } from '../../common/decorators/public.decorator'

@Public()
@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Get('stats')
  getStats() {
    return this.salesService.getStats()
  }

  @Get()
  findAll(@Query() query: SaleQueryDto) {
    return this.salesService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const sale = this.salesService.findOne(id)
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`)
    }
    return sale
  }
}
