import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, desc, asc, count, sql, Column } from 'drizzle-orm'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { codigoToSku } from '@objetiva/utils'
import { DrizzleService } from '../../db/index'
import { articulos } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ArticuloQueryDto } from './dto/articulo-query.dto'
import { CreateArticuloDto } from './dto/create-articulo.dto'
import { UpdateArticuloDto } from './dto/update-articulo.dto'
import { WEBHOOK_EVENTS } from '../webhooks/webhook-events'

@Injectable()
export class ArticulosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly eventEmitter: EventEmitter2
  ) {}

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
          ilike(articulos.erpCodigo, pattern),
          ilike(articulos.marca, pattern),
          ilike(articulos.modelo, pattern),
          ilike(articulos.talle, pattern),
          ilike(articulos.color, pattern),
          ilike(articulos.material, pattern),
          ilike(articulos.presentacion, pattern),
          ilike(articulos.medida, pattern),
          ilike(articulos.observaciones, pattern)
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

  // Phase 31 Deploy 2: findOne keyea por sku (PK)
  async findOne(sku: string) {
    const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.sku, sku))
    return rows[0] ?? null
  }

  // Phase 31 Deploy 2: nuevo método — retorna todas las filas con ese codigo (agrupador)
  // En Phase 31 tipicamente 1 fila; Phase 32 puede ser N variantes.
  async findByCodigo(codigo: string): Promise<(typeof articulos.$inferSelect)[]> {
    return this.drizzle.db
      .select()
      .from(articulos)
      .where(eq(articulos.codigo, codigo))
      .orderBy(asc(articulos.sku))
  }

  async create(dto: CreateArticuloDto) {
    // Phase 31 D-17: sku is the canonical PK (post Deploy 2). Auto-derive from
    // codigo when the caller didn't supply one so new rows never land with sku=null.
    const sku = dto.sku ?? codigoToSku(dto.codigo)

    const rows = await this.drizzle.db
      .insert(articulos)
      .values({ ...dto, sku } as typeof articulos.$inferInsert)
      .returning()

    const articulo = rows[0]
    // Fire and forget — non-blocking
    this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_CREATED, { articulo })
    return articulo
  }

  // Phase 31 Deploy 2: update keyea por sku
  async update(sku: string, dto: UpdateArticuloDto) {
    const rows = await this.drizzle.db
      .update(articulos)
      .set({ ...(dto as Partial<typeof articulos.$inferInsert>), updatedAt: new Date() })
      .where(eq(articulos.sku, sku))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }

    // Fire and forget — non-blocking
    this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_UPDATED, { articulo: rows[0] })
    return rows[0]
  }

  // Phase 31 Deploy 2: toggleActive keyea por sku
  async toggleActive(sku: string) {
    const existing = await this.findOne(sku)
    if (!existing) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(articulos)
      .set({ activo: !existing.activo, updatedAt: new Date() })
      .where(eq(articulos.sku, sku))
      .returning()

    const result = rows[0]
    // Toggle is a field change — emit updated (fire and forget, non-blocking)
    this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_UPDATED, { articulo: result })
    return result
  }

  // Phase 31 Deploy 2: softDelete keyea por sku
  async softDelete(sku: string) {
    const existing = await this.findOne(sku)
    if (!existing) {
      throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(articulos)
      .set({ activo: false, updatedAt: new Date() })
      .where(eq(articulos.sku, sku))
      .returning()

    const articulo = rows[0]
    // Emit deleted event (distinct from toggleActive which emits updated)
    this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_DELETED, { articulo })
    return articulo
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
