import { Controller, Get, Param, Query, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { PurchasesService } from './purchases.service'
import { PurchaseQueryDto } from './dto/purchase-query.dto'
import { Public } from '../../common/decorators/public.decorator'

@Public()
@Controller('purchases')
export class PurchasesController {
  constructor(private readonly purchasesService: PurchasesService) {}

  @Get('stats')
  getStats() {
    return this.purchasesService.getStats()
  }

  @Get()
  findAll(@Query() query: PurchaseQueryDto) {
    return this.purchasesService.findAll(query)
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const purchase = this.purchasesService.findOne(id)
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`)
    }
    return purchase
  }
}
