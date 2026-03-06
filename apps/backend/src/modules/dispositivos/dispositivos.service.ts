import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { dispositivosMoviles } from '../../db/schema'
import { CreateDispositivoDto } from './dto/create-dispositivo.dto'
import { UpdateDispositivoDto } from './dto/update-dispositivo.dto'

@Injectable()
export class DispositivosService {
  constructor(private readonly drizzle: DrizzleService) {}

  async findAll() {
    return this.drizzle.db
      .select()
      .from(dispositivosMoviles)
      .orderBy(asc(dispositivosMoviles.nombre))
  }

  async findOne(id: number) {
    const rows = await this.drizzle.db
      .select()
      .from(dispositivosMoviles)
      .where(eq(dispositivosMoviles.id, id))

    return rows[0] ?? null
  }

  async create(dto: CreateDispositivoDto) {
    try {
      const rows = await this.drizzle.db
        .insert(dispositivosMoviles)
        .values({
          nombre: dto.nombre,
          identificador: dto.identificador,
          descripcion: dto.descripcion,
        })
        .returning()

      return rows[0]
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505'
      ) {
        throw new ConflictException(
          `Ya existe un dispositivo con identificador "${dto.identificador}"`
        )
      }
      throw error
    }
  }

  async update(id: number, dto: UpdateDispositivoDto) {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.nombre !== undefined) updateData.nombre = dto.nombre
      if (dto.identificador !== undefined) updateData.identificador = dto.identificador
      if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion

      const rows = await this.drizzle.db
        .update(dispositivosMoviles)
        .set(updateData)
        .where(eq(dispositivosMoviles.id, id))
        .returning()

      if (!rows[0]) {
        throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
      }

      return rows[0]
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as Record<string, unknown>).code === '23505'
      ) {
        throw new ConflictException(
          `Ya existe un dispositivo con identificador "${dto.identificador}"`
        )
      }
      throw error
    }
  }

  async toggleActive(id: number) {
    const existing = await this.findOne(id)
    if (!existing) {
      throw new NotFoundException(`Dispositivo con ID ${id} no encontrado`)
    }

    const rows = await this.drizzle.db
      .update(dispositivosMoviles)
      .set({ activo: !existing.activo, updatedAt: new Date() })
      .where(eq(dispositivosMoviles.id, id))
      .returning()

    return rows[0]
  }
}
