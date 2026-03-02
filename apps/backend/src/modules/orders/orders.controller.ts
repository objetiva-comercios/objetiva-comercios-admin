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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.findOne(id)
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`)
    }
    return order
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.ordersService.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.ordersService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id)
  }
}
