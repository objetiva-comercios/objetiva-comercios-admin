import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { depositos } from '../../db/schema'
import { CreateDepositoDto } from './dto/create-deposito.dto'
import { UpdateDepositoDto } from './dto/update-deposito.dto'

@Injectable()
export class DepositosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    const data = await this.drizzle.db.select().from(depositos).orderBy(asc(depositos.nombre))

    return data.map(deposito => ({
      ...deposito,
      stockSummary: {
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
}
