import { Controller, Get, Query, Param, ParseIntPipe, NotFoundException } from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { InventoryQueryDto } from './dto/inventory-query.dto'
import { Public } from '../../common/decorators/public.decorator'

@Public()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  findAll(@Query() query: InventoryQueryDto) {
    return this.inventoryService.findAll(query)
  }

  @Get('stats')
  getStats() {
    return this.inventoryService.getStats()
  }

  @Get('low-stock')
  getLowStock() {
    return this.inventoryService.getLowStock()
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const inventoryItem = this.inventoryService.findOne(id)
    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`)
    }
    return inventoryItem
  }
}
