import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, gte, lte, desc, asc, count, Column } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { inventory } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { InventoryQueryDto } from './dto/inventory-query.dto'

@Injectable()
export class InventoryService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(
    query: InventoryQueryDto
  ): Promise<PaginatedResponseDto<typeof inventory.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(inventory.productName, pattern),
          ilike(inventory.sku, pattern),
          ilike(inventory.location, pattern)
        )
      )
    }

    if (query.status) {
      conditions.push(eq(inventory.status, query.status))
    }

    if (query.location) {
      conditions.push(eq(inventory.location, query.location))
    }

    if (query.minQuantity !== undefined) {
      conditions.push(gte(inventory.quantity, query.minQuantity))
    }

    if (query.maxQuantity !== undefined) {
      conditions.push(lte(inventory.quantity, query.maxQuantity))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(inventory)
      .where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      id: inventory.id,
      productName: inventory.productName,
      sku: inventory.sku,
      quantity: inventory.quantity,
      minStock: inventory.minStock,
      maxStock: inventory.maxStock,
      location: inventory.location,
      status: inventory.status,
      lastRestocked: inventory.lastRestocked,
    }

    let orderBy = desc(inventory.id)
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
      .from(inventory)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db.select().from(inventory).where(eq(inventory.id, id))

    return rows[0] ?? null
  }

  async getStats() {
    const rows = await this.drizzle.db
      .select({
        status: inventory.status,
        count: count(),
      })
      .from(inventory)
      .groupBy(inventory.status)

    const byStatus: Record<string, number> = {
      in_stock: 0,
      low_stock: 0,
      out_of_stock: 0,
    }

    let totalItems = 0
    for (const row of rows) {
      byStatus[row.status] = row.count
      totalItems += row.count
    }

    const lowStockItems = await this.drizzle.db
      .select()
      .from(inventory)
      .where(eq(inventory.status, 'low_stock'))

    return {
      totalItems,
      byStatus: {
        in_stock: byStatus['in_stock'] ?? 0,
        low_stock: byStatus['low_stock'] ?? 0,
        out_of_stock: byStatus['out_of_stock'] ?? 0,
      },
      lowStockItems,
    }
  }

  async getLowStock() {
    return this.drizzle.db.select().from(inventory).where(eq(inventory.status, 'low_stock'))
  }

  async update(id: number, dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .update(inventory)
      .set(dto as Partial<typeof inventory.$inferInsert>)
      .where(eq(inventory.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`)
    }

    return rows[0]
  }
}
