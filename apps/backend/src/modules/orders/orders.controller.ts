import { Controller, Get, Query, Param, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrderQueryDto } from './dto/order-query.dto'

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: OrderQueryDto) {
    return this.ordersService.findAll(query)
  }

  @Get('stats')
  getStats() {
    return this.ordersService.getStats()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const order = this.ordersService.findOne(id)
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`)
    }
    return order
  }
}
