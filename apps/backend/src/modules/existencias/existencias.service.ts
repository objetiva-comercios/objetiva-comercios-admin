import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, and, ilike, or, count, sql, sum } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { existencias, articulos, depositos } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ExistenciaQueryDto } from './dto/existencia-query.dto'
import { CreateExistenciaDto } from './dto/create-existencia.dto'
import { UpdateExistenciaDto } from './dto/update-existencia.dto'

@Injectable()
export class ExistenciasService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findByDeposito(depositoId: number, query: ExistenciaQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = [eq(existencias.depositoId, depositoId)]

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(articulos.nombre, pattern),
          ilike(articulos.codigo, pattern),
          ilike(articulos.sku, pattern)
        )!
      )
    }

    if (query.stockStatus === 'sin_stock') {
      conditions.push(eq(existencias.cantidad, 0))
    } else if (query.stockStatus === 'bajo') {
      conditions.push(
        and(
          sql`${existencias.cantidad} > 0`,
          sql`${existencias.cantidad} <= ${existencias.stockMinimo}`,
          sql`${existencias.stockMinimo} > 0`
        )!
      )
    } else if (query.stockStatus === 'normal') {
      conditions.push(
        or(
          sql`${existencias.cantidad} > ${existencias.stockMinimo}`,
          eq(existencias.stockMinimo, 0)
        )!
      )
    }

    const where = and(...conditions)

    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(existencias)
      .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
      .where(where)

    const data = await this.drizzle.db
      .select({
        articuloCodigo: existencias.articuloCodigo,
        depositoId: existencias.depositoId,
        cantidad: existencias.cantidad,
        stockMinimo: existencias.stockMinimo,
        stockMaximo: existencias.stockMaximo,
        updatedAt: existencias.updatedAt,
        articuloNombre: articulos.nombre,
        articuloSku: articulos.sku,
      })
      .from(existencias)
      .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
      .where(where)
      .orderBy(articulos.nombre)
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)
    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findMatrix(query: ExistenciaQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 20
    const offset = (page - 1) * limit

    const conditions = []

    if (query.search) {
      const pattern = `%${query.search}%`
      conditions.push(
        or(
          ilike(articulos.nombre, pattern),
          ilike(articulos.codigo, pattern),
          ilike(articulos.sku, pattern)
        )!
      )
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    // Count distinct articulos
    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(
        this.drizzle.db
          .selectDistinct({ articuloCodigo: existencias.articuloCodigo })
          .from(existencias)
          .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
          .where(where)
          .as('distinct_articulos')
      )

    // Get paginated distinct articulos
    const articuloRows = await this.drizzle.db
      .selectDistinct({
        articuloCodigo: existencias.articuloCodigo,
        articuloNombre: articulos.nombre,
      })
      .from(existencias)
      .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
      .where(where)
      .orderBy(articulos.nombre)
      .limit(limit)
      .offset(offset)

    const articuloCodigos = articuloRows.map(r => r.articuloCodigo)

    // Fetch all existencias for these articulos
    let rows: {
      articuloCodigo: string
      depositoId: number
      cantidad: number
    }[] = []

    if (articuloCodigos.length > 0) {
      rows = await this.drizzle.db
        .select({
          articuloCodigo: existencias.articuloCodigo,
          depositoId: existencias.depositoId,
          cantidad: existencias.cantidad,
        })
        .from(existencias)
        .where(sql`${existencias.articuloCodigo} IN ${articuloCodigos}`)
    }

    // Build matrix rows
    const matrix = articuloRows.map(art => {
      const artStock = rows.filter(r => r.articuloCodigo === art.articuloCodigo)
      const stock: Record<number, number> = {}
      let total = 0
      for (const s of artStock) {
        stock[s.depositoId] = s.cantidad
        total += s.cantidad
      }
      return {
        articuloCodigo: art.articuloCodigo,
        articuloNombre: art.articuloNombre,
        stock,
        total,
      }
    })

    const totalPages = Math.ceil(total / limit)
    return new PaginatedResponseDto(matrix, { total, page, limit, totalPages })
  }

  async findByArticulo(articuloCodigo: string) {
    const data = await this.drizzle.db
      .select({
        articuloCodigo: existencias.articuloCodigo,
        depositoId: existencias.depositoId,
        cantidad: existencias.cantidad,
        stockMinimo: existencias.stockMinimo,
        stockMaximo: existencias.stockMaximo,
        updatedAt: existencias.updatedAt,
        depositoNombre: depositos.nombre,
      })
      .from(existencias)
      .innerJoin(depositos, eq(existencias.depositoId, depositos.id))
      .where(eq(existencias.articuloCodigo, articuloCodigo))
      .orderBy(depositos.nombre)

    return data
  }

  async getKpiStats() {
    const [result] = await this.drizzle.db
      .select({
        totalConStock: count(sql`CASE WHEN ${existencias.cantidad} > 0 THEN 1 END`),
        stockBajo: count(
          sql`CASE WHEN ${existencias.cantidad} > 0 AND ${existencias.cantidad} <= ${existencias.stockMinimo} AND ${existencias.stockMinimo} > 0 THEN 1 END`
        ),
        sinStock: count(sql`CASE WHEN ${existencias.cantidad} = 0 THEN 1 END`),
      })
      .from(existencias)

    return result
  }

  async upsert(dto: CreateExistenciaDto) {
    const rows = await this.drizzle.db
      .insert(existencias)
      .values({
        articuloCodigo: dto.articuloCodigo,
        depositoId: dto.depositoId,
        cantidad: dto.cantidad ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        stockMaximo: dto.stockMaximo ?? 0,
      })
      .onConflictDoUpdate({
        target: [existencias.articuloCodigo, existencias.depositoId],
        set: {
          cantidad: sql`EXCLUDED.cantidad`,
          stockMinimo: sql`EXCLUDED.stock_minimo`,
          stockMaximo: sql`EXCLUDED.stock_maximo`,
          updatedAt: new Date(),
        },
      })
      .returning()

    return rows[0]
  }

  async update(articuloCodigo: string, depositoId: number, dto: UpdateExistenciaDto) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.cantidad !== undefined) updateData.cantidad = dto.cantidad
    if (dto.stockMinimo !== undefined) updateData.stockMinimo = dto.stockMinimo
    if (dto.stockMaximo !== undefined) updateData.stockMaximo = dto.stockMaximo

    const rows = await this.drizzle.db
      .update(existencias)
      .set(updateData)
      .where(
        and(eq(existencias.articuloCodigo, articuloCodigo), eq(existencias.depositoId, depositoId))
      )
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(
        `Existencia para articulo ${articuloCodigo} en deposito ${depositoId} no encontrada`
      )
    }

    return rows[0]
  }

  async getStockSummaryByDeposito(depositoId: number) {
    const [result] = await this.drizzle.db
      .select({
        totalArticulos: count(),
        totalUnidades: sum(existencias.cantidad),
      })
      .from(existencias)
      .where(eq(existencias.depositoId, depositoId))

    return {
      totalArticulos: result?.totalArticulos ?? 0,
      totalUnidades: Number(result?.totalUnidades ?? 0),
    }
  }

  async getLowStockAggregated(limit = 5) {
    const rows = await this.drizzle.db
      .select({
        articuloCodigo: existencias.articuloCodigo,
        articuloNombre: articulos.nombre,
        totalCantidad: sql<number>`COALESCE(sum(${existencias.cantidad}), 0)::int`,
        minStockMinimo: sql<number>`min(${existencias.stockMinimo})`,
      })
      .from(existencias)
      .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
      .groupBy(existencias.articuloCodigo, articulos.nombre)
      .having(
        and(
          sql`min(${existencias.stockMinimo}) > 0`,
          sql`sum(${existencias.cantidad}) <= min(${existencias.stockMinimo})`
        )
      )
      .limit(limit)
    return rows
  }

  async getLowStockCount(): Promise<number> {
    const [result] = await this.drizzle.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(
        this.drizzle.db
          .select({
            articuloCodigo: existencias.articuloCodigo,
          })
          .from(existencias)
          .groupBy(existencias.articuloCodigo)
          .having(
            and(
              sql`min(${existencias.stockMinimo}) > 0`,
              sql`sum(${existencias.cantidad}) <= min(${existencias.stockMinimo})`
            )
          )
          .as('low_stock')
      )
    return result?.count ?? 0
  }
}
