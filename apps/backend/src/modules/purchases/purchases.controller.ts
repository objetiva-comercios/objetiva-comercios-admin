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
import { PurchasesService } from './purchases.service'
import { PurchaseQueryDto } from './dto/purchase-query.dto'

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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const purchase = await this.purchasesService.findOne(id)
    if (!purchase) {
      throw new NotFoundException(`Purchase with ID ${id} not found`)
    }
    return purchase
  }

  @Post()
  create(@Body() dto: Record<string, unknown>) {
    return this.purchasesService.create(dto)
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.purchasesService.update(id, dto)
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.purchasesService.remove(id)
  }
}
