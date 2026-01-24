import { Injectable } from '@nestjs/common'
import { Order } from '../../data/types'
import { seedAll } from '../../data/seed'
import { PaginatedResponseDto, paginate } from '../../common/dto/paginated-response.dto'
import { OrderQueryDto } from './dto/order-query.dto'

@Injectable()
export class OrdersService {
  private orders: Order[]

  constructor() {
    // Initialize once at startup
    const { orders } = seedAll()
    this.orders = orders
  }

  findAll(query: OrderQueryDto): PaginatedResponseDto<Order> {
    let filtered = [...this.orders]

    // Text search (orderNumber, customerName, customerEmail)
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter(
        o =>
          o.orderNumber.toLowerCase().includes(search) ||
          o.customerName.toLowerCase().includes(search) ||
          o.customerEmail.toLowerCase().includes(search)
      )
    }

    // Filter by status
    if (query.status) {
      filtered = filtered.filter(o => o.status === query.status)
    }

    // Filter by customerId
    if (query.customerId !== undefined) {
      filtered = filtered.filter(o => o.customerId === query.customerId)
    }

    // Filter by total range
    if (query.minTotal !== undefined) {
      filtered = filtered.filter(o => o.total >= query.minTotal!)
    }
    if (query.maxTotal !== undefined) {
      filtered = filtered.filter(o => o.total <= query.maxTotal!)
    }

    // Filter by date range
    if (query.startDate) {
      filtered = filtered.filter(o => o.createdAt >= query.startDate!)
    }
    if (query.endDate) {
      filtered = filtered.filter(o => o.createdAt <= query.endDate!)
    }

    // Sorting
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const aVal = a[field as keyof Order]
        const bVal = b[field as keyof Order]
        if (aVal < bVal) return descending ? 1 : -1
        if (aVal > bVal) return descending ? -1 : 1
        return 0
      })
    }

    // Paginate using helper from common/dto
    return paginate(filtered, query)
  }

  findOne(id: number): Order | null {
    return this.orders.find(o => o.id === id) || null
  }

  getStats() {
    const total = this.orders.length
    const byStatus = {
      pending: this.orders.filter(o => o.status === 'pending').length,
      processing: this.orders.filter(o => o.status === 'processing').length,
      shipped: this.orders.filter(o => o.status === 'shipped').length,
      delivered: this.orders.filter(o => o.status === 'delivered').length,
      cancelled: this.orders.filter(o => o.status === 'cancelled').length,
    }

    return {
      total,
      byStatus,
    }
  }
}
