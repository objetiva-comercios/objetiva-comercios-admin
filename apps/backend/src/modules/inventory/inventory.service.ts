import { Injectable } from '@nestjs/common'
import { InventoryItem } from '../../data/types'
import { seedAll } from '../../data/seed'
import { PaginatedResponseDto, paginate } from '../../common/dto/paginated-response.dto'
import { InventoryQueryDto } from './dto/inventory-query.dto'

@Injectable()
export class InventoryService {
  private inventory: InventoryItem[]

  constructor() {
    // Initialize once at startup
    const { inventory } = seedAll()
    this.inventory = inventory
  }

  findAll(query: InventoryQueryDto): PaginatedResponseDto<InventoryItem> {
    let filtered = [...this.inventory]

    // Text search (productName, sku, location)
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter(
        i =>
          i.productName.toLowerCase().includes(search) ||
          i.sku.toLowerCase().includes(search) ||
          i.location.toLowerCase().includes(search)
      )
    }

    // Filter by status
    if (query.status) {
      filtered = filtered.filter(i => i.status === query.status)
    }

    // Filter by location
    if (query.location) {
      filtered = filtered.filter(i => i.location === query.location)
    }

    // Filter by quantity range
    if (query.minQuantity !== undefined) {
      filtered = filtered.filter(i => i.quantity >= query.minQuantity!)
    }
    if (query.maxQuantity !== undefined) {
      filtered = filtered.filter(i => i.quantity <= query.maxQuantity!)
    }

    // Sorting
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const aVal = a[field as keyof InventoryItem]
        const bVal = b[field as keyof InventoryItem]
        if (aVal < bVal) return descending ? 1 : -1
        if (aVal > bVal) return descending ? -1 : 1
        return 0
      })
    }

    // Paginate using helper from common/dto
    return paginate(filtered, query)
  }

  findOne(id: number): InventoryItem | null {
    return this.inventory.find(i => i.id === id) || null
  }

  getStats() {
    const totalItems = this.inventory.length
    const byStatus = {
      in_stock: this.inventory.filter(i => i.status === 'in_stock').length,
      low_stock: this.inventory.filter(i => i.status === 'low_stock').length,
      out_of_stock: this.inventory.filter(i => i.status === 'out_of_stock').length,
    }
    const lowStockItems = this.inventory.filter(i => i.status === 'low_stock')

    return {
      totalItems,
      byStatus,
      lowStockItems,
    }
  }

  getLowStock(): InventoryItem[] {
    return this.inventory.filter(i => i.status === 'low_stock')
  }
}
