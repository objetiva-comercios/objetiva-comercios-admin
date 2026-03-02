import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  ParseIntPipe,
  NotFoundException,
  Body,
} from '@nestjs/common'
import { SalesService } from './sales.service'
import { SaleQueryDto } from './dto/sale-query.dto'

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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const sale = await this.salesService.findOne(id)
    if (!sale) {
      throw new NotFoundException(`Sale with ID ${id} not found`)
    }
    return sale
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.salesService.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.salesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.remove(id)
  }
}
