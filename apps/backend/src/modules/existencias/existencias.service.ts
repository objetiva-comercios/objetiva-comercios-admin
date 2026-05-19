import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, and, ilike, or, count, sql, sum } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { existencias, articulos, depositos } from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { ExistenciaQueryDto } from './dto/existencia-query.dto'
import { CreateExistenciaDto } from './dto/create-existencia.dto'
import { UpdateExistenciaDto } from './dto/update-existencia.dto'
import { ArticulosHelper } from '../articulos/articulos-helper'

@Injectable()
export class ExistenciasService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly articulosHelper: ArticulosHelper
  ) {}

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
      // Phase 31 Deploy 2: join por articuloSku → articulos.sku (PK)
      .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
      .where(where)

    const data = await this.drizzle.db
      .select({
        depositoId: existencias.depositoId,
        cantidad: existencias.cantidad,
        stockMinimo: existencias.stockMinimo,
        stockMaximo: existencias.stockMaximo,
        updatedAt: existencias.updatedAt,
        articuloNombre: articulos.nombre,
        articuloSku: articulos.sku,
      })
      .from(existencias)
      // Phase 31 Deploy 3: join por articuloSku → articulos.sku (PK)
      .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
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
    const [{ total }] = await this.drizzle.db.select({ total: count() }).from(
      this.drizzle.db
        .selectDistinct({ articuloSku: existencias.articuloSku })
        .from(existencias)
        // Phase 31 Deploy 3: join por articuloSku → articulos.sku (PK)
        .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
        .where(where)
        .as('distinct_articulos')
    )

    // Get paginated distinct articulos
    const articuloRows = await this.drizzle.db
      .selectDistinct({
        articuloSku: existencias.articuloSku,
        articuloNombre: articulos.nombre,
      })
      .from(existencias)
      // Phase 31 Deploy 3: join por articuloSku → articulos.sku (PK)
      .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
      .where(where)
      .orderBy(articulos.nombre)
      .limit(limit)
      .offset(offset)

    const articuloSkus = articuloRows.map(r => r.articuloSku)

    // Fetch all existencias for these articulos
    let rows: {
      articuloSku: string
      depositoId: number
      cantidad: number
    }[] = []

    if (articuloSkus.length > 0) {
      rows = await this.drizzle.db
        .select({
          articuloSku: existencias.articuloSku,
          depositoId: existencias.depositoId,
          cantidad: existencias.cantidad,
        })
        .from(existencias)
        .where(sql`${existencias.articuloSku} IN ${articuloSkus}`)
    }

    // Build matrix rows
    const matrix = articuloRows.map(art => {
      const artStock = rows.filter(r => r.articuloSku === art.articuloSku)
      const stock: Record<number, number> = {}
      let total = 0
      for (const s of artStock) {
        stock[s.depositoId] = s.cantidad
        total += s.cantidad
      }
      return {
        articuloSku: art.articuloSku,
        articuloNombre: art.articuloNombre,
        stock,
        total,
      }
    })

    const totalPages = Math.ceil(total / limit)
    return new PaginatedResponseDto(matrix, { total, page, limit, totalPages })
  }

  // Phase 31 Deploy 3: findByArticulo toma articuloCodigo (agrupador) como param de path.
  // Internamente filtra por articulo.codigo (o sku si coincide) para retornar todas las
  // existencias de variantes del mismo codigo (Phase 31 = 1 articulo; Phase 32 = N variantes).
  async findByArticulo(articuloCodigo: string) {
    const data = await this.drizzle.db
      .select({
        articuloSku: existencias.articuloSku,
        depositoId: existencias.depositoId,
        cantidad: existencias.cantidad,
        stockMinimo: existencias.stockMinimo,
        stockMaximo: existencias.stockMaximo,
        updatedAt: existencias.updatedAt,
        depositoNombre: depositos.nombre,
      })
      .from(existencias)
      .innerJoin(depositos, eq(existencias.depositoId, depositos.id))
      // Join con articulos para filtrar por codigo (agrupador) o sku (post-Deploy-3)
      .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
      .where(or(eq(articulos.codigo, articuloCodigo), eq(articulos.sku, articuloCodigo))!)
      .orderBy(depositos.nombre)

    return data
  }

  async getKpiStats() {
    const [[stockResult], [articuloResult]] = await Promise.all([
      this.drizzle.db
        .select({
          totalConStock: count(sql`CASE WHEN ${existencias.cantidad} > 0 THEN 1 END`),
          totalUnidades: sql<number>`COALESCE(sum(${existencias.cantidad}), 0)::int`,
          stockBajo: count(
            sql`CASE WHEN ${existencias.cantidad} > 0 AND ${existencias.cantidad} <= ${existencias.stockMinimo} AND ${existencias.stockMinimo} > 0 THEN 1 END`
          ),
          sinStock: count(sql`CASE WHEN ${existencias.cantidad} = 0 THEN 1 END`),
        })
        .from(existencias),
      this.drizzle.db
        .select({
          totalArticulos: count(),
        })
        .from(articulos)
        .where(eq(articulos.activo, true)),
    ])

    return { ...stockResult, ...articuloResult }
  }

  async upsert(dto: CreateExistenciaDto) {
    // Phase 31 Deploy 3 (contract): DTO tiene articuloSku directo (T-31-20 mitigado).
    // articulosHelper.resolveSku() ya no se invoca aquí — helper disponible para Phase 32.
    const rows = await this.drizzle.db
      .insert(existencias)
      .values({
        articuloSku: dto.articuloSku,
        depositoId: dto.depositoId,
        cantidad: dto.cantidad ?? 0,
        stockMinimo: dto.stockMinimo ?? 0,
        stockMaximo: dto.stockMaximo ?? 0,
      })
      .onConflictDoUpdate({
        target: [existencias.articuloSku, existencias.depositoId],
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

  // Phase 31 Deploy 3: update acepta articuloCodigo (agrupador por codigo) o articuloSku
  // (path param se mantiene para backward compat; frontend puede pasar codigo o sku).
  async update(articuloCodigo: string, depositoId: number, dto: UpdateExistenciaDto) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.cantidad !== undefined) updateData.cantidad = dto.cantidad
    if (dto.stockMinimo !== undefined) updateData.stockMinimo = dto.stockMinimo
    if (dto.stockMaximo !== undefined) updateData.stockMaximo = dto.stockMaximo

    // Resolver el sku del articulo via codigo (agrupador) o sku directo (post-Deploy-3)
    const articuloRows = await this.drizzle.db
      .select({ sku: articulos.sku })
      .from(articulos)
      .where(or(eq(articulos.codigo, articuloCodigo), eq(articulos.sku, articuloCodigo))!)
      .limit(1)

    if (!articuloRows[0]) {
      throw new NotFoundException(
        `Existencia para articulo ${articuloCodigo} en deposito ${depositoId} no encontrada`
      )
    }

    const articuloSku = articuloRows[0].sku

    const rows = await this.drizzle.db
      .update(existencias)
      .set(updateData)
      .where(and(eq(existencias.articuloSku, articuloSku), eq(existencias.depositoId, depositoId)))
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
        articuloSku: existencias.articuloSku,
        articuloNombre: articulos.nombre,
        totalCantidad: sql<number>`COALESCE(sum(${existencias.cantidad}), 0)::int`,
        minStockMinimo: sql<number>`min(${existencias.stockMinimo})`,
      })
      .from(existencias)
      // Phase 31 Deploy 3: join por articuloSku → articulos.sku (PK)
      .innerJoin(articulos, eq(existencias.articuloSku, articulos.sku))
      .groupBy(existencias.articuloSku, articulos.nombre)
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
            articuloSku: existencias.articuloSku,
          })
          .from(existencias)
          .groupBy(existencias.articuloSku)
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
