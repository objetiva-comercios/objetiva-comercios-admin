import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common'
import { eq, and, count, sql, gte, lte, asc, desc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import {
  inventarios,
  inventariosArticulos,
  depositos,
  articulos,
  existencias,
} from '../../db/schema'
import { PaginatedResponseDto } from '../../common/dto/paginated-response.dto'
import { CreateInventarioDto } from './dto/create-inventario.dto'
import { UpdateInventarioDto } from './dto/update-inventario.dto'
import { InventarioQueryDto } from './dto/inventario-query.dto'
import { CreateInventarioArticuloDto } from './dto/create-inventario-articulo.dto'
import { UpdateInventarioArticuloDto } from './dto/update-inventario-articulo.dto'

// Valid status transitions
const TRANSITION_MAP: Record<string, string[]> = {
  pendiente: ['en_curso', 'cancelado'],
  en_curso: ['finalizado', 'cancelado'],
  finalizado: [],
  cancelado: [],
}

@Injectable()
export class InventariosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll(query: InventarioQueryDto) {
    const page = query.page ?? 1
    const limit = query.limit ?? 10
    const offset = (page - 1) * limit

    const conditions = []

    if (query.estado) {
      conditions.push(eq(inventarios.estado, query.estado))
    }

    if (query.fechaDesde) {
      conditions.push(gte(inventarios.fecha, new Date(query.fechaDesde)))
    }

    if (query.fechaHasta) {
      conditions.push(lte(inventarios.fecha, new Date(query.fechaHasta)))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [{ total }] = await this.drizzle.db
      .select({ total: count() })
      .from(inventarios)
      .where(where)

    const data = await this.drizzle.db
      .select({
        id: inventarios.id,
        nombre: inventarios.nombre,
        fecha: inventarios.fecha,
        depositoId: inventarios.depositoId,
        depositoNombre: depositos.nombre,
        descripcion: inventarios.descripcion,
        estado: inventarios.estado,
        createdAt: inventarios.createdAt,
        updatedAt: inventarios.updatedAt,
      })
      .from(inventarios)
      .innerJoin(depositos, eq(inventarios.depositoId, depositos.id))
      .where(where)
      .orderBy(desc(inventarios.fecha))
      .limit(limit)
      .offset(offset)

    const totalPages = Math.ceil(total / limit)
    return new PaginatedResponseDto(data, { total, page, limit, totalPages })
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db
      .select({
        id: inventarios.id,
        nombre: inventarios.nombre,
        fecha: inventarios.fecha,
        depositoId: inventarios.depositoId,
        depositoNombre: depositos.nombre,
        descripcion: inventarios.descripcion,
        estado: inventarios.estado,
        createdAt: inventarios.createdAt,
        updatedAt: inventarios.updatedAt,
      })
      .from(inventarios)
      .innerJoin(depositos, eq(inventarios.depositoId, depositos.id))
      .where(eq(inventarios.id, id))

    if (!rows[0]) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`)
    }

    // Count summary
    const [summary] = await this.drizzle.db
      .select({ totalArticulos: count() })
      .from(inventariosArticulos)
      .where(eq(inventariosArticulos.inventarioId, id))

    return {
      ...rows[0],
      totalArticulos: summary?.totalArticulos ?? 0,
    }
  }

  async create(dto: CreateInventarioDto) {
    const rows = await this.drizzle.db
      .insert(inventarios)
      .values({
        nombre: dto.nombre,
        fecha: new Date(dto.fecha),
        depositoId: dto.depositoId,
        descripcion: dto.descripcion,
        estado: 'pendiente',
      })
      .returning()

    return rows[0]
  }

  async update(id: number, dto: UpdateInventarioDto) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre
    if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion

    const rows = await this.drizzle.db
      .update(inventarios)
      .set(updateData)
      .where(eq(inventarios.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`)
    }

    return rows[0]
  }

  async transitionEstado(id: number, newEstado: string) {
    const rows = await this.drizzle.db.select().from(inventarios).where(eq(inventarios.id, id))

    if (!rows[0]) {
      throw new NotFoundException(`Inventario con ID ${id} no encontrado`)
    }

    const current = rows[0].estado
    if (!this.validateTransition(current, newEstado)) {
      throw new BadRequestException(`Transicion de estado invalida: ${current} -> ${newEstado}`)
    }

    const updated = await this.drizzle.db
      .update(inventarios)
      .set({ estado: newEstado, updatedAt: new Date() })
      .where(eq(inventarios.id, id))
      .returning()

    return updated[0]
  }

  async assertEventEditable(inventarioId: number) {
    const rows = await this.drizzle.db
      .select({ estado: inventarios.estado })
      .from(inventarios)
      .where(eq(inventarios.id, inventarioId))

    if (!rows[0]) {
      throw new NotFoundException(`Inventario con ID ${inventarioId} no encontrado`)
    }

    const estado = rows[0].estado
    if (estado === 'finalizado' || estado === 'cancelado') {
      throw new BadRequestException(`No se puede modificar un inventario con estado "${estado}"`)
    }
  }

  async getArticulosWithDiscrepancy(inventarioId: number) {
    // Get the event to know its depositoId
    const eventRows = await this.drizzle.db
      .select({ depositoId: inventarios.depositoId })
      .from(inventarios)
      .where(eq(inventarios.id, inventarioId))

    if (!eventRows[0]) {
      throw new NotFoundException(`Inventario con ID ${inventarioId} no encontrado`)
    }

    const depositoId = eventRows[0].depositoId

    const rows = await this.drizzle.db
      .select({
        id: inventariosArticulos.id,
        articuloCodigo: inventariosArticulos.articuloCodigo,
        articuloNombre: articulos.nombre,
        cantidadContada: inventariosArticulos.cantidadContada,
        stockSistema: sql<number>`COALESCE(${existencias.cantidad}, 0)`,
        dispositivoId: inventariosArticulos.dispositivoId,
        sectorId: inventariosArticulos.sectorId,
        observaciones: inventariosArticulos.observaciones,
      })
      .from(inventariosArticulos)
      .innerJoin(articulos, eq(inventariosArticulos.articuloCodigo, articulos.codigo))
      .leftJoin(
        existencias,
        and(
          eq(existencias.articuloCodigo, inventariosArticulos.articuloCodigo),
          eq(existencias.depositoId, depositoId)
        )
      )
      .where(eq(inventariosArticulos.inventarioId, inventarioId))
      .orderBy(asc(articulos.nombre))

    return rows.map(row => ({
      ...row,
      diferencia: row.cantidadContada - row.stockSistema,
    }))
  }

  async addArticulo(inventarioId: number, dto: CreateInventarioArticuloDto) {
    await this.assertEventEditable(inventarioId)

    try {
      const rows = await this.drizzle.db
        .insert(inventariosArticulos)
        .values({
          inventarioId,
          articuloCodigo: dto.articuloCodigo,
          cantidadContada: dto.cantidadContada ?? 0,
          dispositivoId: dto.dispositivoId,
          sectorId: dto.sectorId,
          observaciones: dto.observaciones,
        })
        .returning()

      return rows[0]
    } catch (error: unknown) {
      // Handle unique constraint violation
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505'
      ) {
        throw new ConflictException('Articulo ya existe en este conteo')
      }
      throw error
    }
  }

  async updateArticulo(inventarioId: number, articuloId: number, dto: UpdateInventarioArticuloDto) {
    await this.assertEventEditable(inventarioId)

    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.cantidadContada !== undefined) updateData.cantidadContada = dto.cantidadContada
    if (dto.dispositivoId !== undefined) updateData.dispositivoId = dto.dispositivoId
    if (dto.sectorId !== undefined) updateData.sectorId = dto.sectorId
    if (dto.observaciones !== undefined) updateData.observaciones = dto.observaciones

    const rows = await this.drizzle.db
      .update(inventariosArticulos)
      .set(updateData)
      .where(
        and(
          eq(inventariosArticulos.id, articuloId),
          eq(inventariosArticulos.inventarioId, inventarioId)
        )
      )
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(
        `Articulo con ID ${articuloId} no encontrado en inventario ${inventarioId}`
      )
    }

    return rows[0]
  }

  async removeArticulo(inventarioId: number, articuloId: number) {
    await this.assertEventEditable(inventarioId)

    const rows = await this.drizzle.db
      .delete(inventariosArticulos)
      .where(
        and(
          eq(inventariosArticulos.id, articuloId),
          eq(inventariosArticulos.inventarioId, inventarioId)
        )
      )
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(
        `Articulo con ID ${articuloId} no encontrado en inventario ${inventarioId}`
      )
    }

    return rows[0]
  }

  private validateTransition(current: string, target: string): boolean {
    const allowed = TRANSITION_MAP[current]
    if (!allowed) return false
    return allowed.includes(target)
  }
}
