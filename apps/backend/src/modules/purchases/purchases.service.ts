import { Injectable } from '@nestjs/common'
import { Purchase } from '../../data/types'
import { seedAll } from '../../data/seed'
import { PaginatedResponseDto, paginate } from '../../common/dto/paginated-response.dto'
import { PurchaseQueryDto } from './dto/purchase-query.dto'

@Injectable()
export class PurchasesService {
  private purchases: Purchase[]

  constructor() {
    // Initialize once at startup
    const { purchases } = seedAll()
    this.purchases = purchases
  }

  findAll(query: PurchaseQueryDto): PaginatedResponseDto<Purchase> {
    let filtered = [...this.purchases]

    // Text search (purchaseNumber, supplierName)
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter(
        p =>
          p.purchaseNumber.toLowerCase().includes(search) ||
          p.supplierName.toLowerCase().includes(search)
      )
    }

    // Filter by status
    if (query.status) {
      filtered = filtered.filter(p => p.status === query.status)
    }

    // Filter by supplierId
    if (query.supplierId !== undefined) {
      filtered = filtered.filter(p => p.supplierId === query.supplierId)
    }

    // Filter by total range
    if (query.minTotal !== undefined) {
      filtered = filtered.filter(p => p.total >= query.minTotal!)
    }
    if (query.maxTotal !== undefined) {
      filtered = filtered.filter(p => p.total <= query.maxTotal!)
    }

    // Filter by date range
    if (query.startDate) {
      filtered = filtered.filter(p => p.createdAt >= query.startDate!)
    }
    if (query.endDate) {
      filtered = filtered.filter(p => p.createdAt <= query.endDate!)
    }

    // Sorting
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const aVal = a[field as keyof Purchase]
        const bVal = b[field as keyof Purchase]
        if (aVal < bVal) return descending ? 1 : -1
        if (aVal > bVal) return descending ? -1 : 1
        return 0
      })
    }

    // Paginate using helper from common/dto
    return paginate(filtered, query)
  }

  findOne(id: number): Purchase | null {
    return this.purchases.find(p => p.id === id) || null
  }

  getStats() {
    const totalPurchases = this.purchases.length
    const totalSpent = this.purchases.reduce((sum, p) => sum + p.total, 0)

    const pendingOrders = this.purchases.filter(p => p.status === 'ordered')
    const pendingValue = pendingOrders.reduce((sum, p) => sum + p.total, 0)

    const byStatus = {
      draft: this.purchases.filter(p => p.status === 'draft').length,
      ordered: this.purchases.filter(p => p.status === 'ordered').length,
      received: this.purchases.filter(p => p.status === 'received').length,
      cancelled: this.purchases.filter(p => p.status === 'cancelled').length,
    }

    return {
      totalPurchases,
      totalSpent,
      pendingOrders: pendingOrders.length,
      pendingValue,
      byStatus,
    }
  }
}
