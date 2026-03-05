import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, desc, asc, count, sql, Column } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { articulos } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ArticuloQueryDto } from './dto/articulo-query.dto'
import { CreateArticuloDto } from './dto/create-articulo.dto'
import { UpdateArticuloDto } from './dto/update-articulo.dto'

@Injectable()
export class ArticulosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(
    query: ArticuloQueryDto
  ): Promise<PaginatedResponseDto<typeof articulos.$inferSelect>> {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    // Build conditions
    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(articulos.codigo, pattern),
          ilike(articulos.nombre, pattern),
          ilike(articulos.sku, pattern),
          ilike(articulos.codigoBarras, pattern),
          ilike(articulos.erpCodigo, pattern)
        )
      )
    }

    if (query.activo !== undefined) {
      conditions.push(eq(articulos.activo, query.activo))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count query
    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(articulos)
      .where(where)

    // Build order by
    const colMap: Record<string, Column> = {
      codigo: articulos.codigo,
      nombre: articulos.nombre,
      precio: articulos.precio,
      costo: articulos.costo,
      createdAt: articulos.createdAt,
      updatedAt: articulos.updatedAt,
    }

    const sortField = query.sortBy ?? 'createdAt'
    const sortDir = query.sortOrder ?? 'desc'
    const col = colMap[sortField] ?? articulos.createdAt
    const orderBy = sortDir === 'asc' ? asc(col) : desc(col)

    // Data query
    const data = await this.drizzle.db
      .select()
      .from(articulos)
      .where(where)
      .orderBy(orderBy)
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)

    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findOne(codigo: string) {
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.codigo, codigo))

    return rows[0] ?? null
  }

  async create(dto: CreateArticuloDto) {
    const rows = await this.drizzle.db
      .insert(articulos)
      .values(dto as typeof articulos.$inferInsert)
      .returning()

    return rows[0]
  }

  async update(codigo: string, dto: UpdateArticuloDto) {
    const rows = await this.drizzle.db
      .update(articulos)
      .set({ ...(dto as Partial<typeof articulos.$inferInsert>), updatedAt: new Date() })
      .where(eq(articulos.codigo, codigo))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
    }

    return rows[0]
  }

  async toggleActive(codigo: string) {
    const existing = await this.findOne(codigo)
    if (!existing) {
      throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(articulos)
      .set({ activo: !existing.activo, updatedAt: new Date() })
      .where(eq(articulos.codigo, codigo))
      .returning()

    return rows[0]
  }

  async getStats() {
    const [result] = await this.drizzle.db
      .select({
        total: count(),
        active: count(sql`CASE WHEN ${articulos.activo} = true THEN 1 END`),
      })
      .from(articulos)
    return { total: result.total, active: result.active }
  }
}
