import {
  Controller,
  Get,
  Patch,
  Query,
  Param,
  ParseIntPipe,
  NotFoundException,
  Body,
  UseGuards,
} from '@nestjs/common'
import { InventoryService } from './inventory.service'
import { InventoryQueryDto } from './dto/inventory-query.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

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
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const inventoryItem = await this.inventoryService.findOne(id)
    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`)
    }
    return inventoryItem
  }

  @UseGuards(RolesGuard)
  @Roles('admin')
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: Record<string, unknown>) {
    return this.inventoryService.update(id, dto)
  }
}
