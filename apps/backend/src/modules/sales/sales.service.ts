import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, gte, lte, desc, asc, count, sql, Column } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { sales, saleItems } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { SaleQueryDto } from './dto/sale-query.dto'

@Injectable()
export class SalesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(query: SaleQueryDto): Promise<PaginatedResponseDto<typeof sales.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(or(ilike(sales.saleNumber, pattern), ilike(sales.customerName, pattern)))
    }

    if (query.status) {
      conditions.push(eq(sales.status, query.status))
    }

    if (query.paymentMethod) {
      conditions.push(eq(sales.paymentMethod, query.paymentMethod))
    }

    if (query.customerId !== undefined) {
      conditions.push(eq(sales.customerId, query.customerId))
    }

    if (query.minTotal !== undefined) {
      conditions.push(gte(sales.total, query.minTotal))
    }

    if (query.maxTotal !== undefined) {
      conditions.push(lte(sales.total, query.maxTotal))
    }

    if (query.startDate) {
      conditions.push(gte(sales.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      conditions.push(lte(sales.createdAt, new Date(query.endDate)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db.select({ total: count() }).from(sales).where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      id: sales.id,
      saleNumber: sales.saleNumber,
      customerName: sales.customerName,
      subtotal: sales.subtotal,
      tax: sales.tax,
      discount: sales.discount,
      total: sales.total,
      paymentMethod: sales.paymentMethod,
      status: sales.status,
      createdAt: sales.createdAt,
      updatedAt: sales.updatedAt,
    }

    let orderBy = desc(sales.createdAt)
    if (query.sort) {
      const descending = query.sort.startsWith('-')
      const field = descending ? query.sort.slice(1) : query.sort
      const col = colMap[field]
      if (col) {
        orderBy = descending ? desc(col) : asc(col)
      }
    }

    // Data query
    const data = await this.drizzle.db
      .select()
      .from(sales)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const saleRows = await this.drizzle.db.select().from(sales).where(eq(sales.id, id))

    if (!saleRows[0]) {
      return null
    }

    const items = await this.drizzle.db.select().from(saleItems).where(eq(saleItems.saleId, id))

    return { ...saleRows[0], items }
  }

  async getStats() {
    // 1. Total count + total revenue
    const [aggregate] = await this.drizzle.db
      .select({
        totalSales: count(),
        totalRevenue: sql<number>`cast(coalesce(sum(${sales.total}), 0) as double precision)`,
      })
      .from(sales)

    const totalSales = aggregate.totalSales
    const totalRevenue = aggregate.totalRevenue
    const averageOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0

    // 2. By payment method
    const paymentMethodRows = await this.drizzle.db
      .select({
        paymentMethod: sales.paymentMethod,
        count: count(),
      })
      .from(sales)
      .groupBy(sales.paymentMethod)

    const byPaymentMethod: Record<string, number> = {
      cash: 0,
      card: 0,
      transfer: 0,
      credit: 0,
    }
    for (const row of paymentMethodRows) {
      byPaymentMethod[row.paymentMethod] = row.count
    }

    // 3. By status
    const statusRows = await this.drizzle.db
      .select({
        status: sales.status,
        count: count(),
      })
      .from(sales)
      .groupBy(sales.status)

    const byStatus: Record<string, number> = {
      completed: 0,
      refunded: 0,
      partial_refund: 0,
    }
    for (const row of statusRows) {
      byStatus[row.status] = row.count
    }

    // 4. Today's sales
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const [todayAggregate] = await this.drizzle.db
      .select({
        count: count(),
        revenue: sql<number>`cast(coalesce(sum(${sales.total}), 0) as double precision)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, todayStart))

    // 5. This week's sales
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 7)
    weekStart.setHours(0, 0, 0, 0)

    const [weekAggregate] = await this.drizzle.db
      .select({
        count: count(),
        revenue: sql<number>`cast(coalesce(sum(${sales.total}), 0) as double precision)`,
      })
      .from(sales)
      .where(gte(sales.createdAt, weekStart))

    return {
      totalSales,
      totalRevenue,
      averageOrderValue,
      byPaymentMethod: {
        cash: byPaymentMethod['cash'] ?? 0,
        card: byPaymentMethod['card'] ?? 0,
        transfer: byPaymentMethod['transfer'] ?? 0,
        credit: byPaymentMethod['credit'] ?? 0,
      },
      byStatus: {
        completed: byStatus['completed'] ?? 0,
        refunded: byStatus['refunded'] ?? 0,
        partial_refund: byStatus['partial_refund'] ?? 0,
      },
      todaySales: todayAggregate.count,
      todayRevenue: todayAggregate.revenue,
      thisWeekSales: weekAggregate.count,
      thisWeekRevenue: weekAggregate.revenue,
    }
  }

  async create(dto: Record<string, unknown>) {
    const { items, ...saleData } = dto as {
      items?: Record<string, unknown>[]
      [key: string]: unknown
    }

    return await this.drizzle.db.transaction(async tx => {
      const [sale] = await tx
        .insert(sales)
        .values(saleData as typeof sales.$inferInsert)
        .returning()

      const insertedItems =
        items && items.length > 0
          ? await tx
              .insert(saleItems)
              .values(
                items.map(item => ({ ...(item as typeof saleItems.$inferInsert), saleId: sale.id }))
              )
              .returning()
          : []

      return { ...sale, items: insertedItems }
    })
  }

  async update(id: number, dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .update(sales)
      .set({ ...(dto as Partial<typeof sales.$inferInsert>), updatedAt: new Date() })
      .where(eq(sales.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Sale with ID ${id} not found`)
    }

    return rows[0]
  }

  async remove(id: number) {
    const rows = await this.drizzle.db.delete(sales).where(eq(sales.id, id)).returning()

    if (!rows[0]) {
      throw new NotFoundException(`Sale with ID ${id} not found`)
    }

    return rows[0]
  }
}
