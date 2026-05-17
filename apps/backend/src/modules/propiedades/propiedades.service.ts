import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { eq, asc, sql } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { PROP_TABLES, PROP_LABELS, type PropTipo } from './propiedades.constants'
import { CreatePropiedadDto } from './dto/create-propiedad.dto'
import { UpdatePropiedadDto } from './dto/update-propiedad.dto'

/**
 * Service genérico parametrizado por `tipo: PropTipo`.
 *
 * Resuelve la tabla Drizzle desde `PROP_TABLES[tipo]` y aplica el patrón
 * canónico del repo (ver DispositivosService) extendido con:
 * - manejo per-constraint de UNIQUE LOWER(nombre) vs UNIQUE(abrev) (CAT-03)
 * - soft-delete via toggle de `activo` (CAT-04)
 * - listado parametrizado por `activo` boolean | undefined (D-18)
 */
@Injectable()
export class PropiedadesService {
  constructor(private readonly drizzle: DrizzleService) {}

  /** Resuelve la tabla del tipo, lanzando 400 si el tipo es inválido. */
  private tableFor(tipo: PropTipo) {
    const table = PROP_TABLES[tipo]
    if (!table) {
      throw new BadRequestException(`Tipo de propiedad inválido: ${tipo}`)
    }
    return table
  }

  /**
   * Lista propiedades del tipo dado.
   *
   * - `opts.activo === true`  → sólo activas (default — manejado por el controller).
   * - `opts.activo === false` → sólo inactivas.
   * - `opts.activo === undefined` → todas (sin filtro). Lo usa el modo `?activo=all`.
   */
  async findAll(tipo: PropTipo, opts: { activo?: boolean } = {}) {
    const table = this.tableFor(tipo)
    const query = this.drizzle.db.select().from(table)
    if (opts.activo !== undefined) {
      return query.where(eq(table.activo, opts.activo)).orderBy(asc(table.nombre))
    }
    return query.orderBy(asc(table.nombre))
  }

  async findOne(tipo: PropTipo, id: number) {
    const table = this.tableFor(tipo)
    const rows = await this.drizzle.db.select().from(table).where(eq(table.id, id))
    return rows[0] ?? null
  }

  async create(tipo: PropTipo, dto: CreatePropiedadDto) {
    const table = this.tableFor(tipo)
    const values: Record<string, unknown> = { nombre: dto.nombre, abrev: dto.abrev }
    // Phase 30: `familia` requiere FK a prop_subcategoria; `subcategoria`
    // requiere FK a prop_categoria. Los demás tipos (incluyendo `aplicacion` y
    // `categoria`) ignoran `parentId` aunque venga en el body.
    if (tipo === 'familia') {
      if (dto.parentId === undefined || dto.parentId === null) {
        throw new BadRequestException('subcategoria_id requerido para familia')
      }
      values.subcategoriaId = dto.parentId
    } else if (tipo === 'subcategoria') {
      if (dto.parentId === undefined || dto.parentId === null) {
        throw new BadRequestException('categoria_id requerido para subcategoria')
      }
      values.categoriaId = dto.parentId
    }
    try {
      // Cast a `any` localizado: PROP_TABLES es un union heterogéneo (familia tiene
      // subcategoriaId, los otros 7 no), por lo que la inferencia de `.values()`
      // colapsa a la intersección. La validación de runtime la hace Drizzle + PG.
      const rows = await this.drizzle.db
        .insert(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(values as any)
        .returning()
      return rows[0]
    } catch (error: unknown) {
      this.handleUniqueViolation(error, tipo, dto)
      throw error
    }
  }

  async update(tipo: PropTipo, id: number, dto: UpdatePropiedadDto) {
    const table = this.tableFor(tipo)
    try {
      const updateData: Record<string, unknown> = { updatedAt: new Date() }
      if (dto.nombre !== undefined) updateData.nombre = dto.nombre
      if (dto.abrev !== undefined) updateData.abrev = dto.abrev

      const rows = await this.drizzle.db
        .update(table)
        .set(updateData)
        .where(eq(table.id, id))
        .returning()

      if (!rows[0]) {
        const label = PROP_LABELS[tipo].singular
        throw new NotFoundException(`${capitalize(label)} con ID ${id} no encontrada`)
      }
      return rows[0]
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error
      this.handleUniqueViolation(error, tipo, dto)
      throw error
    }
  }

  async toggleActive(tipo: PropTipo, id: number) {
    const table = this.tableFor(tipo)
    // Atomic flip in 1 roundtrip: NOT activo evaluated server-side, no race window.
    const rows = await this.drizzle.db
      .update(table)
      .set({ activo: sql`NOT ${table.activo}`, updatedAt: new Date() })
      .where(eq(table.id, id))
      .returning()
    if (!rows[0]) {
      const label = PROP_LABELS[tipo].singular
      throw new NotFoundException(`${capitalize(label)} con ID ${id} no encontrada`)
    }
    return rows[0]
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Detecta UNIQUE violations (SQLSTATE 23505) y traduce a ConflictException
   * con mensaje específico según el constraint violado.
   *
   * Los nombres de constraint los define el factory `definePropTable` en
   * apps/backend/src/db/schema.ts:
   *   - `{tabla}_nombre_lower_uniq` (UNIQUE LOWER(nombre))
   *   - `{tabla}_abrev_uniq` (UNIQUE(abrev))
   *
   * El shape del error en `postgres.js` puede exponer el constraint vía
   * `constraint_name`, `constraint`, o sólo en `detail`. Chequeamos los tres.
   */
  private handleUniqueViolation(
    error: unknown,
    tipo: PropTipo,
    dto: { nombre?: string; abrev?: string }
  ) {
    // Drizzle 0.45 wraps postgres.js errors in DrizzleQueryError; the original
    // PG error (with `.code`, `.constraint_name`, `.detail`) lives on `.cause`.
    const pgError = (error as Record<string, unknown> | undefined)?.cause ?? error
    if (
      !(pgError instanceof Error) ||
      !('code' in pgError) ||
      (pgError as Record<string, unknown>).code !== '23505'
    ) {
      return
    }

    const detail = String((pgError as Record<string, unknown>).detail ?? '')
    const constraint = String(
      (pgError as Record<string, unknown>).constraint_name ??
        (pgError as Record<string, unknown>).constraint ??
        ''
    )
    const label = PROP_LABELS[tipo]

    // UNIQUE LOWER(nombre)
    if (constraint.includes('nombre_lower_uniq') || detail.toLowerCase().includes('lower')) {
      throw new ConflictException(`Ya existe una ${label.singular} con el nombre "${dto.nombre}"`)
    }
    // UNIQUE(abrev)
    if (constraint.includes('abrev_uniq') || detail.includes('abrev')) {
      throw new ConflictException(`La abreviación "${dto.abrev}" ya existe en ${label.plural}`)
    }
    // Fallback genérico
    throw new ConflictException(`Conflicto de unicidad en ${label.plural}`)
  }
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
