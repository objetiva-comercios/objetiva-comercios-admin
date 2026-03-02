import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, gte, lte, desc, asc, count, sql, Column, inArray } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { purchases, purchaseItems } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { PurchaseQueryDto } from './dto/purchase-query.dto'

@Injectable()
export class PurchasesService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(
    query: PurchaseQueryDto
  ): Promise<PaginatedResponseDto<typeof purchases.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(ilike(purchases.purchaseNumber, pattern), ilike(purchases.supplierName, pattern))
      )
    }

    if (query.status) {
      conditions.push(eq(purchases.status, query.status))
    }

    if (query.supplierId !== undefined) {
      conditions.push(eq(purchases.supplierId, query.supplierId))
    }

    if (query.minTotal !== undefined) {
      conditions.push(gte(purchases.total, query.minTotal))
    }

    if (query.maxTotal !== undefined) {
      conditions.push(lte(purchases.total, query.maxTotal))
    }

    if (query.startDate) {
      conditions.push(gte(purchases.createdAt, new Date(query.startDate)))
    }

    if (query.endDate) {
      conditions.push(lte(purchases.createdAt, new Date(query.endDate)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(purchases)
      .where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      id: purchases.id,
      purchaseNumber: purchases.purchaseNumber,
      supplierName: purchases.supplierName,
      subtotal: purchases.subtotal,
      tax: purchases.tax,
      total: purchases.total,
      status: purchases.status,
      expectedDelivery: purchases.expectedDelivery,
      createdAt: purchases.createdAt,
      updatedAt: purchases.updatedAt,
    }

    let orderBy = desc(purchases.createdAt)
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
      .from(purchases)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    // Batch load items for all purchases on this page
    const purchaseIds = data.map(p => p.id)
    const allItems =
      purchaseIds.length > 0
        ? await this.drizzle.db
            .select()
            .from(purchaseItems)
            .where(inArray(purchaseItems.purchaseId, purchaseIds))
        : []

    // Build lookup map
    const itemsByPurchaseId = new Map<number, (typeof allItems)[number][]>()
    for (const item of allItems) {
      const list = itemsByPurchaseId.get(item.purchaseId) ?? []
      list.push(item)
      itemsByPurchaseId.set(item.purchaseId, list)
    }

    // Zip items into purchase rows
    const dataWithItems = data.map(purchase => ({
      ...purchase,
      items: itemsByPurchaseId.get(purchase.id) ?? [],
    }))

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(dataWithItems, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const purchaseRows = await this.drizzle.db.select().from(purchases).where(eq(purchases.id, id))

    if (!purchaseRows[0]) {
      return null
    }

    const items = await this.drizzle.db
      .select()
      .from(purchaseItems)
      .where(eq(purchaseItems.purchaseId, id))

    return { ...purchaseRows[0], items }
  }

  async getStats() {
    // 1. Total count + total spent
    const [aggregate] = await this.drizzle.db
      .select({
        totalPurchases: count(),
        totalSpent: sql<number>`cast(coalesce(sum(${purchases.total}), 0) as double precision)`,
      })
      .from(purchases)

    // 2. Pending orders (status = 'ordered')
    const [pendingAggregate] = await this.drizzle.db
      .select({
        pendingOrders: count(),
        pendingValue: sql<number>`cast(coalesce(sum(${purchases.total}), 0) as double precision)`,
      })
      .from(purchases)
      .where(eq(purchases.status, 'ordered'))

    // 3. By status
    const statusRows = await this.drizzle.db
      .select({
        status: purchases.status,
        count: count(),
      })
      .from(purchases)
      .groupBy(purchases.status)

    const byStatus: Record<string, number> = {
      draft: 0,
      ordered: 0,
      received: 0,
      cancelled: 0,
    }
    for (const row of statusRows) {
      byStatus[row.status] = row.count
    }

    return {
      totalPurchases: aggregate.totalPurchases,
      totalSpent: aggregate.totalSpent,
      pendingOrders: pendingAggregate.pendingOrders,
      pendingValue: pendingAggregate.pendingValue,
      byStatus: {
        draft: byStatus['draft'] ?? 0,
        ordered: byStatus['ordered'] ?? 0,
        received: byStatus['received'] ?? 0,
        cancelled: byStatus['cancelled'] ?? 0,
      },
    }
  }

  async create(dto: Record<string, unknown>) {
    const { items, ...purchaseData } = dto as {
      items?: Record<string, unknown>[]
      [key: string]: unknown
    }

    return await this.drizzle.db.transaction(async tx => {
      const [purchase] = await tx
        .insert(purchases)
        .values(purchaseData as typeof purchases.$inferInsert)
        .returning()

      const insertedItems =
        items && items.length > 0
          ? await tx
              .insert(purchaseItems)
              .values(
                items.map(item => ({
                  ...(item as typeof purchaseItems.$inferInsert),
                  purchaseId: purchase.id,
                }))
              )
              .returning()
          : []

      return { ...purchase, items: insertedItems }
    })
  }

  async update(id: number, dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .update(purchases)
      .set({ ...(dto as Partial<typeof purchases.$inferInsert>), updatedAt: new Date() })
      .where(eq(purchases.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Purchase with ID ${id} not found`)
    }

    return rows[0]
  }

  async remove(id: number) {
    const rows = await this.drizzle.db.delete(purchases).where(eq(purchases.id, id)).returning()

    if (!rows[0]) {
      throw new NotFoundException(`Purchase with ID ${id} not found`)
    }

    return rows[0]
  }
}
