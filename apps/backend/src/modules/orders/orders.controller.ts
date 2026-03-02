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
import { OrdersService } from './orders.service'
import { OrderQueryDto } from './dto/order-query.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

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

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.ordersService.create(dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.ordersService.update(id, dto)
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id)
  }
}
