import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, gte, lte, desc, asc, count, Column, inArray } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { orders, orderItems } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { OrderQueryDto } from './dto/order-query.dto'

@Injectable()
export class OrdersService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(query: OrderQueryDto): Promise<PaginatedResponseDto<typeof orders.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(orders.orderNumber, pattern),
          ilike(orders.customerName, pattern),
          ilike(orders.customerEmail, pattern)
        )
      )
    }

    if (query.status) {
      conditions.push(eq(orders.status, query.status))
    }

    if (query.customerId !== undefined) {
      conditions.push(eq(orders.customerId, query.customerId))
    }

    if (query.minTotal !== undefined) {
      conditions.push(gte(orders.total, query.minTotal))
    }

    if (query.maxTotal !== undefined) {
      conditions.push(lte(orders.total, query.maxTotal))
    }

    if (query.startDate) {
      conditions.push(gte(orders.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      conditions.push(lte(orders.createdAt, new Date(query.endDate)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db.select({ total: count() }).from(orders).where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      id: orders.id,
      orderNumber: orders.orderNumber,
      customerName: orders.customerName,
      customerEmail: orders.customerEmail,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      status: orders.status,
      createdAt: orders.createdAt,
      updatedAt: orders.updatedAt,
    }

    let orderBy = desc(orders.createdAt)
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
      .from(orders)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Batch load items for all orders on this page
    const orderIds = data.map(o => o.id)
    const allItems =
      orderIds.length > 0
        ? await this.drizzle.db
            .select()
            .from(orderItems)
            .where(inArray(orderItems.orderId, orderIds))
        : []

    // Build lookup map
    const itemsByOrderId = new Map<number, (typeof allItems)[number][]>()
    for (const item of allItems) {
      const list = itemsByOrderId.get(item.orderId) ?? []
      list.push(item)
      itemsByOrderId.set(item.orderId, list)
    }

    // Zip items into order rows
    const dataWithItems = data.map(order => ({
      ...order,
      items: itemsByOrderId.get(order.id) ?? [],
    }))

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(dataWithItems, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const orderRows = await this.drizzle.db.select().from(orders).where(eq(orders.id, id))

    if (!orderRows[0]) {
      return null
    }

    const items = await this.drizzle.db.select().from(orderItems).where(eq(orderItems.orderId, id))

    return { ...orderRows[0], items }
  }

  async getStats() {
    const rows = await this.drizzle.db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .groupBy(orders.status)

    const byStatus: Record<string, number> = {
      pending: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
    }

    let total = 0
    for (const row of rows) {
      byStatus[row.status] = row.count
      total += row.count
    }

    return {
      total,
      byStatus: {
        pending: byStatus['pending'] ?? 0,
        processing: byStatus['processing'] ?? 0,
        shipped: byStatus['shipped'] ?? 0,
        delivered: byStatus['delivered'] ?? 0,
        cancelled: byStatus['cancelled'] ?? 0,
      },
    }
  }

  async create(dto: Record<string, unknown>) {
    const { items, ...orderData } = dto as {
      items?: Record<string, unknown>[]
      [key: string]: unknown
    }

    return await this.drizzle.db.transaction(async tx => {
      const [order] = await tx
        .insert(orders)
        .values(orderData as typeof orders.$inferInsert)
        .returning()

      const insertedItems =
        items && items.length > 0
          ? await tx
              .insert(orderItems)
              .values(
                items.map(item => ({
                  ...(item as typeof orderItems.$inferInsert),
                  orderId: order.id,
                }))
              )
              .returning()
          : []

      return { ...order, items: insertedItems }
    })
  }

  async update(id: number, dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .update(orders)
      .set({ ...(dto as Partial<typeof orders.$inferInsert>), updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Order with ID ${id} not found`)
    }

    return rows[0]
  }

  async remove(id: number) {
    const rows = await this.drizzle.db.delete(orders).where(eq(orders.id, id)).returning()

    if (!rows[0]) {
      throw new NotFoundException(`Order with ID ${id} not found`)
    }

    return rows[0]
  }
}
