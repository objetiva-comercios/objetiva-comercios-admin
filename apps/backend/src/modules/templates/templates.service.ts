import { Injectable, ConflictException, NotFoundException } from '@nestjs/common'
import { eq, asc, sql } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { articulosTemplates, templateAtributos } from '../../db/schema'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'
import { TemplateAtributoDto } from './dto/template-atributos.dto'

/**
 * Service de templates (articulos_templates + template_atributos).
 *
 * - El template `default` se identifica por `nombre = 'default'` (D-13, NO por
 *   columna `is_default`).
 * - `replaceAtributos` es DELETE + INSERT en una transacción (Drizzle no tiene
 *   un upsert limpio con PK compuesta para este caso).
 */
@Injectable()
export class TemplatesService {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Lista templates.
   *
   * - `opts.activo === true`  → solo activos (default desde el controller).
   * - `opts.activo === false` → solo inactivos.
   * - `opts.activo === undefined` → todos.
   */
  async findAll(opts: { activo?: boolean } = {}) {
    const query = this.drizzle.db.select().from(articulosTemplates)
    if (opts.activo !== undefined) {
      return query
        .where(eq(articulosTemplates.activo, opts.activo))
        .orderBy(asc(articulosTemplates.nombre))
    }
    return query.orderBy(asc(articulosTemplates.nombre))
  }

  /** Retorna el template + sus atributos. 404 si el template no existe. */
  async findOne(id: number) {
    const rows = await this.drizzle.db
      .select()
      .from(articulosTemplates)
      .where(eq(articulosTemplates.id, id))
    const template = rows[0]
    if (!template) {
      throw new NotFoundException(`Template con ID ${id} no encontrado`)
    }
    const atributos = await this.findAtributos(id)
    return { ...template, atributos }
  }

  async create(dto: CreateTemplateDto) {
    try {
      const rows = await this.drizzle.db
        .insert(articulosTemplates)
        .values({ nombre: dto.nombre, descripcion: dto.descripcion ?? null })
        .returning()
      return rows[0]
    } catch (error: unknown) {
      this.handleUniqueViolation(error, dto)
      throw error
    }
  }

  async update(id: number, dto: UpdateTemplateDto) {
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.nombre !== undefined) updateData.nombre = dto.nombre
      if (dto.descripcion !== undefined) updateData.descripcion = dto.descripcion
      if (dto.activo !== undefined) updateData.activo = dto.activo

      const rows = await this.drizzle.db
        .update(articulosTemplates)
        .set(updateData)
        .where(eq(articulosTemplates.id, id))
        .returning()

      if (!rows[0]) {
        throw new NotFoundException(`Template con ID ${id} no encontrado`)
      }
      return rows[0]
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error
      this.handleUniqueViolation(error, dto)
      throw error
    }
  }

  /**
   * Lista atributos de un template ordenados por `orden_nombre NULLS LAST,
   * atributo_tipo ASC`. NO valida que el template exista (los consumidores
   * normalmente piden findOne(id) primero).
   */
  async findAtributos(templateId: number) {
    return this.drizzle.db
      .select()
      .from(templateAtributos)
      .where(eq(templateAtributos.templateId, templateId))
      .orderBy(
        sql`${templateAtributos.ordenNombre} ASC NULLS LAST`,
        asc(templateAtributos.atributoTipo)
      )
  }

  /**
   * Reemplaza completo la lista de atributos del template (DELETE + INSERT
   * dentro de una transacción). Si `atributos` viene vacío, deja el template
   * sin atributos.
   *
   * Throws NotFoundException si el template no existe.
   */
  async replaceAtributos(templateId: number, atributos: TemplateAtributoDto[]) {
    // Verificar primero que el template existe — evita devolver lista vacía
    // como si hubiera "reemplazado" un template inexistente.
    const existsRows = await this.drizzle.db
      .select({ id: articulosTemplates.id })
      .from(articulosTemplates)
      .where(eq(articulosTemplates.id, templateId))
    if (!existsRows[0]) {
      throw new NotFoundException(`Template con ID ${templateId} no encontrado`)
    }

    await this.drizzle.db.transaction(async tx => {
      await tx.delete(templateAtributos).where(eq(templateAtributos.templateId, templateId))
      if (atributos.length > 0) {
        await tx.insert(templateAtributos).values(
          atributos.map(a => ({
            templateId,
            atributoTipo: a.atributoTipo,
            ordenNombre: a.ordenNombre ?? null,
            ordenSku: a.ordenSku ?? null,
            esVariante: a.esVariante ?? false,
            customSlot: a.customSlot ?? null,
          }))
        )
      }
    })

    return this.findAtributos(templateId)
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Detecta UNIQUE violations (SQLSTATE 23505) y traduce a ConflictException.
   * `articulos_templates` solo tiene UNIQUE(nombre) — los conflictos en
   * `template_atributos` (PK compuesta) no llegan aquí porque replaceAtributos
   * hace DELETE primero.
   */
  private handleUniqueViolation(error: unknown, dto: { nombre?: string }) {
    const pgError = (error as Record<string, unknown> | undefined)?.cause ?? error
    if (
      !(pgError instanceof Error) ||
      !('code' in pgError) ||
      (pgError as Record<string, unknown>).code !== '23505'
    ) {
      return
    }
    throw new ConflictException(`Ya existe un template con el nombre "${dto.nombre}"`)
  }
}
