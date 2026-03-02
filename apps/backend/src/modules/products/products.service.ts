import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, gte, lte, desc, asc, count, Column } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { products } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ProductQueryDto } from './dto/product-query.dto'

@Injectable()
export class ProductsService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(
    query: ProductQueryDto
  ): Promise<PaginatedResponseDto<typeof products.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(products.name, pattern),
          ilike(products.description, pattern),
          ilike(products.sku, pattern)
        )
      )
    }

    if (query.category) {
      conditions.push(eq(products.category, query.category))
    }

    if (query.status) {
      conditions.push(eq(products.status, query.status))
    }

    if (query.minPrice !== undefined) {
      conditions.push(gte(products.price, query.minPrice))
    }

    if (query.maxPrice !== undefined) {
      conditions.push(lte(products.price, query.maxPrice))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db.select({ total: count() }).from(products).where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      id: products.id,
      name: products.name,
      sku: products.sku,
      price: products.price,
      cost: products.cost,
      category: products.category,
      stock: products.stock,
      status: products.status,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
    }

    let orderBy = desc(products.createdAt)
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
      .from(products)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db.select().from(products).where(eq(products.id, id))

    return rows[0] ?? null
  }

  async getCategories(): Promise<string[]> {
    const rows = await this.drizzle.db
      .selectDistinct({ category: products.category })
      .from(products)
      .orderBy(asc(products.category))

    return rows.map(r => r.category)
  }

  async getStats() {
    const rows = await this.drizzle.db
      .select({
        status: products.status,
        count: count(),
      })
      .from(products)
      .groupBy(products.status)

    const byStatus: Record<string, number> = {
      active: 0,
      inactive: 0,
      discontinued: 0,
    }

    let total = 0
    for (const row of rows) {
      byStatus[row.status] = row.count
      total += row.count
    }

    return {
      total,
      byStatus: {
        active: byStatus['active'] ?? 0,
        inactive: byStatus['inactive'] ?? 0,
        discontinued: byStatus['discontinued'] ?? 0,
      },
    }
  }

  async create(dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .insert(products)
      .values(dto as typeof products.$inferInsert)
      .returning()

    return rows[0]
  }

  async update(id: number, dto: Record<string, unknown>) {
    const rows = await this.drizzle.db
      .update(products)
      .set({ ...(dto as Partial<typeof products.$inferInsert>), updatedAt: new Date() })
      .where(eq(products.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }

    return rows[0]
  }

  async remove(id: number) {
    const rows = await this.drizzle.db.delete(products).where(eq(products.id, id)).returning()

    if (!rows[0]) {
      throw new NotFoundException(`Product with ID ${id} not found`)
    }

    return rows[0]
  }
}
