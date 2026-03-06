import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, and, asc, count, sum, sql } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { depositos, existencias, inventarioSectores } from '../../db/schema'
import { CreateDepositoDto } from './dto/create-deposito.dto'
import { UpdateDepositoDto } from './dto/update-deposito.dto'
import { CreateSectorDto } from './dto/create-sector.dto'
import { UpdateSectorDto } from './dto/update-sector.dto'

@Injectable()
export class DepositosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    const data = await this.drizzle.db.select().from(depositos).orderBy(asc(depositos.nombre))

    // Aggregate stock summary per deposito
    const summaries = await this.drizzle.db
      .select({
        depositoId: existencias.depositoId,
        totalArticulos: count(),
        totalUnidades: sum(existencias.cantidad),
      })
      .from(existencias)
      .groupBy(existencias.depositoId)

    const summaryMap = new Map(
      summaries.map(s => [
        s.depositoId,
        {
          totalArticulos: s.totalArticulos,
          totalUnidades: Number(s.totalUnidades ?? 0),
        },
      ])
    )

    return data.map(deposito => ({
      ...deposito,
      stockSummary: summaryMap.get(deposito.id) ?? {
        totalArticulos: 0,
        totalUnidades: 0,
      },
    }))
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db.select().from(depositos).where(eq(depositos.id, id))

    return rows[0] ?? null
  }

  async create(dto: CreateDepositoDto) {
    const rows = await this.drizzle.db
      .insert(depositos)
      .values(dto as typeof depositos.$inferInsert)
      .returning()

    return rows[0]
  }

  async update(id: number, dto: UpdateDepositoDto) {
    const rows = await this.drizzle.db
      .update(depositos)
      .set({ ...(dto as Partial<typeof depositos.$inferInsert>), updatedAt: new Date() })
      .where(eq(depositos.id, id))
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(`Deposito con ID ${id} no encontrado`)
    }

    return rows[0]
  }

  async toggleActive(id: number) {
    const existing = await this.findOne(id)
    if (!existing) {
      throw new NotFoundException(`Deposito con ID ${id} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(depositos)
      .set({ activo: !existing.activo, updatedAt: new Date() })
      .where(eq(depositos.id, id))
      .returning()

    return rows[0]
  }

  // ─── Sectores CRUD ──────────────────────────────────────────────────────────

  async findSectores(depositoId: number) {
    return this.drizzle.db
      .select()
      .from(inventarioSectores)
      .where(eq(inventarioSectores.depositoId, depositoId))
      .orderBy(asc(inventarioSectores.nombre))
  }

  async createSector(depositoId: number, dto: CreateSectorDto) {
    const rows = await this.drizzle.db
      .insert(inventarioSectores)
      .values({
        depositoId,
        nombre: dto.nombre,
        columnas: dto.columnas ?? [],
      })
      .returning()

    return rows[0]
  }

  async updateSector(depositoId: number, sectorId: number, dto: UpdateSectorDto) {
    const updateData: Record<string, unknown> = { updatedAt: new Date() }
    if (dto.nombre !== undefined) updateData.nombre = dto.nombre
    if (dto.columnas !== undefined) updateData.columnas = dto.columnas

    const rows = await this.drizzle.db
      .update(inventarioSectores)
      .set(updateData)
      .where(
        and(eq(inventarioSectores.id, sectorId), eq(inventarioSectores.depositoId, depositoId))
      )
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(
        `Sector con ID ${sectorId} no encontrado en deposito ${depositoId}`
      )
    }

    return rows[0]
  }

  async deleteSector(depositoId: number, sectorId: number) {
    const rows = await this.drizzle.db
      .delete(inventarioSectores)
      .where(
        and(eq(inventarioSectores.id, sectorId), eq(inventarioSectores.depositoId, depositoId))
      )
      .returning()

    if (!rows[0]) {
      throw new NotFoundException(
        `Sector con ID ${sectorId} no encontrado en deposito ${depositoId}`
      )
    }

    return rows[0]
  }
}
