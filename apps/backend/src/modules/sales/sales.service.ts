import { Injectable } from '@nestjs/common'
import { Sale } from '../../data/types'
import { seedAll } from '../../data/seed'
import { PaginatedResponseDto, paginate } from '../../common/dto/paginated-response.dto'
import { SaleQueryDto } from './dto/sale-query.dto'

@Injectable()
export class SalesService {
  private sales: Sale[]

  constructor() {
    // Initialize once at startup
    const { sales } = seedAll()
    this.sales = sales
  }

  findAll(query: SaleQueryDto): PaginatedResponseDto<Sale> {
    let filtered = [...this.sales]

    // Text search (saleNumber, customerName)
    if (query.search) {
      const search = query.search.toLowerCase()
      filtered = filtered.filter(
        s =>
          s.saleNumber.toLowerCase().includes(search) ||
          s.customerName.toLowerCase().includes(search)
      )
    }

    // Filter by status
    if (query.status) {
      filtered = filtered.filter(s => s.status === query.status)
    }

    // Filter by paymentMethod
    if (query.paymentMethod) {
      filtered = filtered.filter(s => s.paymentMethod === query.paymentMethod)
    }

    // Filter by customerId
    if (query.customerId !== undefined) {
      filtered = filtered.filter(s => s.customerId === query.customerId)
    }

    // Filter by total range
    if (query.minTotal !== undefined) {
      filtered = filtered.filter(s => s.total >= query.minTotal!)
    }
    if (query.maxTotal !== undefined) {
      filtered = filtered.filter(s => s.total <= query.maxTotal!)
    }

    // Filter by date range
    if (query.startDate) {
      filtered = filtered.filter(s => s.createdAt >= query.startDate!)
    }
    if (query.endDate) {
      filtered = filtered.filter(s => s.createdAt <= query.endDate!)
    }

    // Sorting
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      filtered.sort((a, b) => {
        const aVal = a[field as keyof Sale]
        const bVal = b[field as keyof Sale]
        if (aVal < bVal) return descending ? 1 : -1
        if (aVal > bVal) return descending ? -1 : 1
        return 0
      })
    }

    // Paginate using helper from common/dto
    return paginate(filtered, query)
  }

  findOne(id: number): Sale | null {
    return this.sales.find(s => s.id === id) || null
  }

  getStats() {
    const totalSales = this.sales.length
    const totalRevenue = this.sales.reduce((sum, s) => sum + s.total, 0)
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    const byPaymentMethod = {
      cash: this.sales.filter(s => s.paymentMethod === 'cash').length,
      card: this.sales.filter(s => s.paymentMethod === 'card').length,
      transfer: this.sales.filter(s => s.paymentMethod === 'transfer').length,
      credit: this.sales.filter(s => s.paymentMethod === 'credit').length,
    }

    const byStatus = {
      completed: this.sales.filter(s => s.status === 'completed').length,
      refunded: this.sales.filter(s => s.status === 'refunded').length,
      partial_refund: this.sales.filter(s => s.status === 'partial_refund').length,
    }

    // Date calculations
    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const todaySales = this.sales.filter(s => s.createdAt.startsWith(today))
    const thisWeekSales = this.sales.filter(s => s.createdAt >= weekAgo)

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      byPaymentMethod,
      byStatus,
      todaySales: todaySales.length,
      todayRevenue: todaySales.reduce((sum, s) => sum + s.total, 0),
      thisWeekSales: thisWeekSales.length,
      thisWeekRevenue: thisWeekSales.reduce((sum, s) => sum + s.total, 0),
    }
  }
}
