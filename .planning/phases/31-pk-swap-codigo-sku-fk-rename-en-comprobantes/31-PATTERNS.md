# Phase 31: PK Swap codigo→sku + FK rename en comprobantes — Pattern Map

**Mapped:** 2026-05-18
**Files analyzed:** 35 (new + modified) across Deploys 1/2/3
**Analogs found:** 30 / 35 (5 sin analog directo — son superficies nuevas)

---

## File Classification

| New/Modified File                                                                                       | Role                               | Data Flow                    | Closest Analog                                                                      | Match Quality                           |
| ------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------- |
| `apps/backend/drizzle/0009_phase31_expand.sql`                                                          | Migration DDL                      | batch (UPDATE FROM JOIN)     | `apps/backend/drizzle/0008_phase30_templates.sql`                                   | exact (custom .sql Drizzle)             |
| `apps/backend/drizzle/0010_phase31_switch.sql`                                                          | Migration DDL                      | batch (LOCK + 7-step)        | `apps/backend/src/db/migrate-unidades.sql` + `0008_phase30_templates.sql`           | role-match (no hay otro 7-step en repo) |
| `apps/backend/drizzle/0011_phase31_contract.sql`                                                        | Migration DDL                      | batch (DROP COLUMN)          | `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql`                             | exact                                   |
| `apps/backend/drizzle/meta/_journal.json`                                                               | Drizzle metadata                   | append-only                  | mismo archivo (idx 0-8 ya existen)                                                  | self-analog                             |
| `apps/backend/src/db/schema.ts`                                                                         | Schema TS (Drizzle ORM)            | declarative                  | mismo archivo (líneas 179-298, 361-386)                                             | self-analog                             |
| `apps/backend/src/modules/articulos/articulos-helper.ts`                                                | Helper utility (NestJS Injectable) | request-response (1 query)   | `apps/backend/src/modules/articulos/articulos.service.ts` (linea 91-95)             | role-match                              |
| `apps/backend/src/modules/articulos/articulos.module.ts`                                                | Module wiring                      | declarative                  | mismo archivo                                                                       | self-analog                             |
| `apps/backend/src/modules/articulos/articulos.service.ts`                                               | Backend service                    | CRUD + event-driven          | mismo archivo (line 91-159)                                                         | self-analog                             |
| `apps/backend/src/modules/articulos/articulos.controller.ts`                                            | Backend controller                 | request-response             | mismo archivo (line 31-67)                                                          | self-analog                             |
| `apps/backend/src/modules/articulos/articulos-imagenes.controller.ts`                                   | Backend controller                 | request-response (multipart) | mismo archivo                                                                       | self-analog                             |
| `apps/backend/src/modules/articulos/articulos-imagenes.service.ts`                                      | Backend service                    | request-response             | servicio con `eq(articulos.codigo, ...)`                                            | self-analog                             |
| `apps/backend/src/modules/existencias/existencias.service.ts`                                           | Backend service                    | CRUD (upsert + update)       | mismo archivo (line 209-254)                                                        | self-analog                             |
| `apps/backend/src/modules/existencias/existencias.module.ts`                                            | Module wiring                      | declarative                  | mismo archivo                                                                       | self-analog                             |
| `apps/backend/src/modules/inventarios/inventarios.service.ts`                                           | Backend service                    | CRUD (addArticulo)           | mismo archivo (line 244-272)                                                        | self-analog                             |
| `apps/backend/src/modules/inventarios/inventarios.module.ts`                                            | Module wiring                      | declarative                  | mismo archivo                                                                       | self-analog                             |
| `apps/backend/src/modules/dashboard/dashboard.service.ts`                                               | Backend service                    | aggregation                  | self-analog (referencia mínima)                                                     | self-analog                             |
| `apps/backend/src/modules/webhooks/webhooks.listener.ts`                                                | Event listener                     | event-driven                 | mismo archivo (line 10-22)                                                          | self-analog (no-op semántico)           |
| `apps/backend/src/db/seed.ts`                                                                           | DB seeder                          | batch INSERT                 | mismo archivo (faker.\* generators)                                                 | self-analog                             |
| `apps/backend/src/db/generators/{order,sale,purchase,existencia,inventario}.generator.ts`               | Generators                         | factory functions            | mismo archivos                                                                      | self-analog                             |
| `scripts/phase31-preflight-audit.sh`                                                                    | Bash script (audit)                | one-shot SQL → markdown      | `scripts/phase38-preflight-backup.sh`                                               | role-match (no hay audit script previo) |
| `scripts/phase31-validation.sh`                                                                         | Bash script (validation)           | one-shot SQL → exit code     | `scripts/phase38-preflight-backup.sh`                                               | role-match                              |
| `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` → renombrar a `[sku]/editar/page.tsx` | Next.js page (client)              | request-response             | mismo archivo (líneas 28-79)                                                        | self-analog                             |
| `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx`                                           | Frontend client component          | event-driven (router.push)   | mismo archivo (línea 152-157)                                                       | self-analog                             |
| `apps/web/src/components/articulos/articulo-sheet.tsx`                                                  | Frontend component                 | event-driven                 | mismo archivo (línea 162, 199)                                                      | self-analog                             |
| `apps/web/src/components/articulos/imagen-slot.tsx`                                                     | Frontend component                 | request-response (upload)    | mismo archivo (línea 37-44 props)                                                   | self-analog                             |
| `apps/web/src/components/articulos/imagen-slot-grid.tsx`                                                | Frontend component                 | request-response             | mismo archivo (idem)                                                                | self-analog                             |
| `apps/web/src/lib/api.client.ts`                                                                        | API client wrapper                 | request-response (fetch)     | mismo archivo (líneas 128-223)                                                      | self-analog                             |
| `apps/web/src/types/{order,sale,purchase,existencia,inventario,dashboard}.ts`                           | TypeScript types                   | declarative                  | `apps/web/src/types/existencia.ts` (líneas 1-11)                                    | self-analog                             |
| `apps/web/src/components/settings/webhooks/webhooks-client.tsx`                                         | Frontend component                 | request-response             | mismo archivo (línea 272-282 return block) + `apps/web/src/components/ui/alert.tsx` | self-analog + import                    |
| `.planning/phases/31-.../31-PREFLIGHT-AUDIT.md`                                                         | Plan artifact (audit output)       | one-shot generation          | (output del script)                                                                 | n/a                                     |

---

## Pattern Assignments

### `apps/backend/drizzle/0009_phase31_expand.sql` (Migration DDL, batch)

**Analog:** `apps/backend/drizzle/0008_phase30_templates.sql`

**Header pattern** (líneas 1-25 de 0008):

```sql
-- Migration 0008: Phase 30 — Templates de composicion SKU/Nombre + taxonomia 3er nivel
-- Origen: Phase 30 (templates-composici-n-sku-nombre), Plan 02 (Wave 1 — schema migration)
--
-- Alcance:
--   1) Crear N tablas nuevas: ...
--   2) Agregar M columnas a articulos: ...
--   3) Drop K columnas legacy ...
--
-- Pre-flight realizado por operador (unattended <fecha>):
--   - Backup server-side: ...
--   - Verificacion COUNT(*) ... = 0
--   - Journal current entries length: 8 (idx 0..7)
--
-- Aplicar con:
--   psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0008_phase30_templates.sql
--
-- Refs: TPL-01, TPL-05. Threats mitigados: T-30-01, T-30-04.
```

**ALTER TABLE pattern** (líneas 66-78 de 0008):

```sql
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "familia" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES "articulos_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "rubro";--> statement-breakpoint
```

**Idempotencia pattern:**

- `ADD COLUMN IF NOT EXISTS` y `DROP COLUMN IF EXISTS` (Drizzle estándar).
- Cada statement termina con `;--> statement-breakpoint` (Drizzle lo agrega; psql lo lee como comentario inocuo).

**Divergencias respecto al analog:**

- 0009 NO crea tablas nuevas (solo agrega columnas en 5 hijas).
- 0009 incluye `UPDATE` con `regexp_replace` para overwrite de `articulos.sku` (P-05) — patrón de UPDATE no existe en 0008.
- 0009 incluye `DO $$ ... $$` blocks (analog directo: ver `migrate-unidades.sql` línea 15-21 abajo) para validar post-overwrite y post-backfill — pattern no usado en 0008.
- 0009 incluye `UPDATE ... FROM articulos a WHERE x.articulo_codigo = a.codigo` (UPDATE FROM JOIN). El analog literal es `apps/backend/src/db/migrate-unidades.sql:28-41` (`INSERT INTO ... SELECT FROM ... ON CONFLICT`), pero el patrón UPDATE FROM JOIN es estándar Postgres — research lo entrega completo en líneas 154-159 del RESEARCH.

---

### `apps/backend/drizzle/0010_phase31_switch.sql` (Migration DDL, batch + LOCK + transaction)

**Analog primario (trigger DDL):** `apps/backend/src/db/migrate-unidades.sql`
**Analog secundario (header + estructura):** `apps/backend/drizzle/0008_phase30_templates.sql`

**Pre-check DO block pattern** (de `migrate-unidades.sql:15-21`):

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = 1) THEN
    RAISE EXCEPTION 'Deposito principal (id=1) no encontrado. Abortando migracion.';
  END IF;
  RAISE NOTICE 'OK: Deposito principal (id=1) encontrado.';
END $$;
```

**CREATE OR REPLACE FUNCTION pattern** (de `migrate-unidades.sql:48-70` — el cuerpo a reescribir):

```sql
CREATE OR REPLACE FUNCTION update_articulo_unidades()
RETURNS TRIGGER AS $$
DECLARE
  target_codigo TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_codigo := OLD.articulo_codigo;
  ELSE
    target_codigo := NEW.articulo_codigo;
  END IF;

  UPDATE articulos
  SET unidades = COALESCE((
    SELECT SUM(cantidad) FROM existencias
    WHERE articulo_codigo = target_codigo
  ), 0)
  WHERE codigo = target_codigo;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

**Recompute pattern** (de `migrate-unidades.sql:88-92`):

```sql
UPDATE articulos
SET unidades = COALESCE((
  SELECT SUM(cantidad) FROM existencias
  WHERE articulo_codigo = articulos.codigo
), 0);
```

**LOCK ACCESS EXCLUSIVE pattern:** No existe analog en el repo. Research entrega el SQL completo en líneas 287-289 (`LOCK TABLE articulos, order_items, ... IN ACCESS EXCLUSIVE MODE;`). Plan debe seguir literalmente `PITFALLS.md §P-01 líneas 28-67`.

**Divergencias respecto al analog:**

- 0010 mantiene mismo nombre de función (`update_articulo_unidades`) pero cuerpo nuevo keyea por `articulo_sku` y `articulos.sku` en lugar de `articulo_codigo` y `articulos.codigo`. Trigger NO se re-crea (apunta a la misma función reemplazada).
- 0010 incluye `ALTER TABLE ... DISABLE/ENABLE TRIGGER` — patrón nuevo (capa 1 de P-02).
- 0010 incluye `DROP CONSTRAINT articulos_pkey CASCADE` + `ADD PRIMARY KEY (sku)` — patrón NO existe en repo (es la operación crítica).
- 0010 incluye `DROP CONSTRAINT existencias_pkey` + re-`ADD PRIMARY KEY (articulo_sku, deposito_id)` — PK compuesta, sin analog directo.
- 0010 re-crea `inv_articulos_unique_idx` sobre `(inventario_id, articulo_sku)` — pattern: `apps/backend/src/db/schema.ts:384` (`uniqueIndex('inv_articulos_unique_idx').on(...)`) traducido a DDL.

**Validación final DO block** (idem pattern de pre-check, con `pg_constraint` y `pg_trigger` queries).

---

### `apps/backend/drizzle/0011_phase31_contract.sql` (Migration DDL, batch)

**Analog:** `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql`

**Excerpt completo del analog** (7 líneas):

```sql
-- Migration 0007: drop inventarios_articulos.sector_id (columna huerfana legacy)
-- Origen: residual de quick task 260429-rec donde sector_id fue reemplazada por columna.
-- La columna nunca se uso en codigo y tiene 0 filas con valor no-null.
-- Documentada en .planning/2026-05-15-REPORTE-HECHO-VS-FALTANTE.md seccion 5.2.

ALTER TABLE "inventarios_articulos" DROP COLUMN IF EXISTS "sector_id";
```

**Divergencias:**

- 0011 hace `DROP COLUMN articulo_codigo` en 5 tablas (no 1). Patrón se repite 5×.
- 0011 prepend `LOCK TABLE ... IN ACCESS EXCLUSIVE MODE` (riesgo bajo pero defensive — research línea 589-590).
- 0011 incluye `DROP INDEX IF EXISTS *_articulo_codigo_idx` antes del DROP COLUMN (defensive cleanup).
- 0011 incluye DO block final que verifica `information_schema.columns` → 0 columnas `articulo_codigo` en las 5 hijas.

---

### `apps/backend/drizzle/meta/_journal.json` (Drizzle metadata, append-only)

**Self-analog:** mismo archivo, líneas 60-66 (entry idx=8 actual).

**Excerpt del actual idx=8:**

```json
{
  "idx": 8,
  "version": "7",
  "when": 1778988507778,
  "tag": "0008_phase30_templates",
  "breakpoints": true
}
```

**Pattern para agregar 3 entries (idx 9, 10, 11):**

- Cada entry: incrementar `idx`, asignar `when` con `Date.now()` al momento de aplicar, `tag` = nombre del .sql sin extensión, `breakpoints: true`, `version: "7"`.
- Plan: el commit que agrega la migration 0009 también actualiza este archivo con la entry idx=9. Idem 0010 → idx=10, 0011 → idx=11.

**Divergencias:** ninguna — es append puro.

---

### `apps/backend/src/db/schema.ts` (Schema TS, declarative)

**Self-analog para todas las modificaciones:** mismo archivo en distintas líneas.

**Pattern para agregar columna nullable + index** (de `schema.ts:187, 253`):

```typescript
sku: (text('sku'),
  // ...
  table => [index('articulos_sku_idx').on(table.sku)])
```

**Pattern para FK con onDelete/onUpdate** (de `schema.ts:282-284`):

```typescript
articuloCodigo: text('articulo_codigo')
  .notNull()
  .references(() => articulos.codigo, { onDelete: 'restrict' }),
```

**Pattern para PK compuesta** (de `schema.ts:293-297`):

```typescript
table => [
  primaryKey({ columns: [table.articuloCodigo, table.depositoId] }),
  index('existencias_deposito_id_idx').on(table.depositoId),
  index('existencias_articulo_codigo_idx').on(table.articuloCodigo),
]
```

**Pattern para unique index compuesto** (de `schema.ts:384`):

```typescript
uniqueIndex('inv_articulos_unique_idx').on(table.inventarioId, table.articuloCodigo),
```

**Divergencias por Deploy:**

- **Deploy 1 schema.ts:** agregar `articuloSku: text('articulo_sku')` (nullable, sin `.notNull()`, sin `.references()`) + `index('*_articulo_sku_idx').on(table.articuloSku)` en 5 hijas.
- **Deploy 2 schema.ts:** `articulos.codigo` deja de tener `.primaryKey()` (mover constraint a `primaryKey({ columns: [table.sku] })` en el array, o usar `.primaryKey()` sobre sku); agregar `articulos_codigo_idx`; quitar `articulos_sku_idx` (redundante con PK); `articuloSku.notNull().references(() => articulos.sku, { onDelete: 'restrict', onUpdate: 'cascade' })` en 5 hijas; existencias PK = `[articuloSku, depositoId]`; inv_articulos_unique_idx = `[inventarioId, articuloSku]`.
- **Deploy 3 schema.ts:** eliminar `articuloCodigo: text('articulo_codigo')` de las 5 hijas + sus índices viejos.

**Regla atómica (lección `feedback_schema_drift_silencioso.md`):** cada Deploy commitea schema.ts + migration .sql + \_journal.json en un solo commit. Nunca uno sin los otros.

---

### `apps/backend/src/modules/articulos/articulos-helper.ts` (Helper utility, NestJS Injectable, request-response)

**Analog:** `apps/backend/src/modules/articulos/articulos.service.ts` líneas 91-95 (método `findOne` que keyea por codigo).

**Imports + class pattern** (de `articulos.service.ts:1-17`):

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, ilike, or, and, desc, asc, count, sql, Column } from 'drizzle-orm'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { DrizzleService } from '../../db/index'
import { articulos } from '../../db/schema'
// ...

@Injectable()
export class ArticulosService {
  constructor(
    private readonly drizzle: DrizzleService,
    private readonly eventEmitter: EventEmitter2
  ) {}
```

**SELECT por codigo pattern** (de `articulos.service.ts:91-95`):

```typescript
async findOne(codigo: string) {
  const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.codigo, codigo))
  return rows[0] ?? null
}
```

**Stub completo del helper (research entrega en líneas 900-922):**

```typescript
// apps/backend/src/modules/articulos/articulos-helper.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db'
import { articulos } from '../../db/schema'

@Injectable()
export class ArticulosHelper {
  constructor(private readonly drizzle: DrizzleService) {}

  async resolveSku(articuloCodigo: string): Promise<string> {
    const [row] = await this.drizzle.db
      .select({ sku: articulos.sku })
      .from(articulos)
      .where(eq(articulos.codigo, articuloCodigo))
      .limit(1)
    if (!row?.sku) {
      throw new NotFoundException(`Articulo ${articuloCodigo} no tiene sku asignado`)
    }
    return row.sku
  }
}
```

**Divergencias respecto al analog:**

- No emite eventos (no inyecta EventEmitter2).
- Retorna `string` (no fila completa).
- `.limit(1)` explícito + projection a `{ sku: articulos.sku }`.
- Lanza `NotFoundException` si sku es null (defensive — durante Deploy 1 el overwrite ya corrió pero en Deploy 0 pre-migration podría haber filas null; helper falla loudly).

---

### `apps/backend/src/modules/articulos/articulos.module.ts` (Module wiring)

**Self-analog:** mismo archivo (líneas 1-12).

**Excerpt completo del actual:**

```typescript
import { Module } from '@nestjs/common'
import { ArticulosController } from './articulos.controller'
import { ArticulosService } from './articulos.service'
import { ArticulosImagenesController } from './articulos-imagenes.controller'
import { ArticulosImagenesService } from './articulos-imagenes.service'

@Module({
  controllers: [ArticulosController, ArticulosImagenesController],
  providers: [ArticulosService, ArticulosImagenesService],
  exports: [ArticulosService],
})
export class ArticulosModule {}
```

**Divergencias:**

- Agregar `ArticulosHelper` a `providers` y `exports` (para que `ExistenciasModule` e `InventariosModule` puedan inyectarlo).

---

### `apps/backend/src/modules/articulos/articulos.service.ts` (Backend service, CRUD + event-driven)

**Self-analog:** líneas 91-159 del mismo archivo.

**Pattern findOne by codigo** (a reescribir keyeando por sku, líneas 91-95):

```typescript
async findOne(codigo: string) {
  const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.codigo, codigo))
  return rows[0] ?? null
}
```

**Pattern update + event emit** (líneas 109-123, a reescribir keyeando por sku):

```typescript
async update(codigo: string, dto: UpdateArticuloDto) {
  const rows = await this.drizzle.db
    .update(articulos)
    .set({ ...(dto as Partial<typeof articulos.$inferInsert>), updatedAt: new Date() })
    .where(eq(articulos.codigo, codigo))
    .returning()

  if (!rows[0]) {
    throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
  }

  this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_UPDATED, { articulo: rows[0] })
  return rows[0]
}
```

**Pattern create + event emit** (líneas 97-107):

```typescript
async create(dto: CreateArticuloDto) {
  const rows = await this.drizzle.db
    .insert(articulos)
    .values(dto as typeof articulos.$inferInsert)
    .returning()

  const articulo = rows[0]
  // Fire and forget — non-blocking
  this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_CREATED, { articulo })
  return articulo
}
```

**Divergencias en Deploy 2:**

- Todas las menciones de `eq(articulos.codigo, codigo)` se cambian a `eq(articulos.sku, sku)` excepto las búsquedas por agrupador.
- Nuevo método `findByCodigo(codigo: string): Promise<typeof articulos.$inferSelect[]>` que retorna array, ordenado por `asc(articulos.sku)`, sin envelope ni paginación (research líneas 712-721):
  ```typescript
  async findByCodigo(codigo: string): Promise<typeof articulos.$inferSelect[]> {
    return this.drizzle.db
      .select()
      .from(articulos)
      .where(eq(articulos.codigo, codigo))
      .orderBy(asc(articulos.sku))
  }
  ```
- `findAll` línea 19-89: el `colMap` puede agregar `sku: articulos.sku` para que sea ordenable.
- El `eventEmitter.emit` NO cambia — `rows[0]` ya incluye `sku` desde Deploy 1 (semantic bump, no structural).

---

### `apps/backend/src/modules/articulos/articulos.controller.ts` (Backend controller, request-response)

**Self-analog:** mismo archivo, líneas 31-67.

**Pattern @Get(':codigo') + 404** (líneas 31-38):

```typescript
@Get(':codigo')
async findOne(@Param('codigo') codigo: string) {
  const articulo = await this.articulosService.findOne(codigo)
  if (!articulo) {
    throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
  }
  return articulo
}
```

**Pattern @UseGuards + @Roles para write routes** (líneas 40-67):

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Patch(':codigo')
update(@Param('codigo') codigo: string, @Body() dto: UpdateArticuloDto) {
  return this.articulosService.update(codigo, dto)
}

@UseGuards(RolesGuard)
@Roles('admin')
@Patch(':codigo/toggle')
toggleActive(@Param('codigo') codigo: string) {
  return this.articulosService.toggleActive(codigo)
}

@UseGuards(RolesGuard)
@Roles('admin')
@Delete(':codigo')
@HttpCode(HttpStatus.OK)
softDelete(@Param('codigo') codigo: string) {
  return this.articulosService.softDelete(codigo)
}
```

**Divergencias en Deploy 2:**

- Rekey 100% `:codigo` → `:sku` en las 5 rutas existentes (GET, PATCH, PATCH /toggle, DELETE, también las imagenes en `articulos-imagenes.controller.ts`).
- Agregar nueva ruta ANTES de las rutas parametrizadas (orden importa por path-specificity — research §A6):
  ```typescript
  @Get('by-codigo/:codigo')
  findByCodigo(@Param('codigo') codigo: string) {
    return this.articulosService.findByCodigo(codigo)  // retorna Articulo[]
  }
  ```
- NO se mantiene alias `:codigo` (D-08). Las URLs viejas mueren en Deploy 2.
- Auth: el decorator `@UseGuards(RolesGuard) @Roles('admin')` migra inalterado al rekey (research §V4).

---

### `apps/backend/src/modules/articulos/articulos-imagenes.controller.ts` (Backend controller, multipart upload)

**Self-analog:** mismo archivo.

**Pattern @Post con FileInterceptor + ParseIntPipe** (líneas 36-55):

```typescript
@UseGuards(RolesGuard)
@Roles('admin')
@Post(':codigo/imagenes')
@UseInterceptors(
  FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter,
  })
)
uploadImagen(
  @Param('codigo') codigo: string,
  @UploadedFile() file: Express.Multer.File,
  @Body() dto: UploadImagenDto
) {
  if (!file) {
    throw new BadRequestException('Archivo requerido')
  }
  return this.articulosImagenesService.uploadImagen(codigo, file.buffer, dto)
}
```

**Divergencias en Deploy 2:**

- Rekey `:codigo` → `:sku` en las 3 rutas (`@Post(':codigo/imagenes')`, `@Post(':codigo/imagenes/from-url')`, `@Delete(':codigo/imagenes/:tipo/:slot')`).
- El service correspondiente actualiza sus queries internas (`eq(articulos.codigo, ...)` → `eq(articulos.sku, ...)`).

---

### `apps/backend/src/modules/articulos/articulos-imagenes.service.ts` (Backend service)

**Self-analog:** el propio service (no leído en detalle, pero usa el mismo patrón Drizzle que `articulos.service.ts`).

**Divergencia en Deploy 2:** todos los `where(eq(articulos.codigo, codigo))` → `where(eq(articulos.sku, sku))`.

---

### `apps/backend/src/modules/existencias/existencias.service.ts` (Backend service, CRUD with upsert)

**Self-analog:** líneas 209-254 del mismo archivo.

**Pattern upsert (onConflictDoUpdate)** (líneas 209-231):

```typescript
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
```

**Pattern JOIN existencias × articulos** (líneas 55-71):

```typescript
const data = await this.drizzle.db
  .select({
    articuloCodigo: existencias.articuloCodigo,
    depositoId: existencias.depositoId,
    cantidad: existencias.cantidad,
    // ...
    articuloNombre: articulos.nombre,
    articuloSku: articulos.sku,
  })
  .from(existencias)
  .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
// ...
```

**Divergencias por Deploy:**

- **Deploy 1:** Inyectar `ArticulosHelper` en constructor. En `upsert()` y `update()`, antes del `.insert()`/`.update()`, llamar `const articuloSku = await this.articulosHelper.resolveSku(dto.articuloCodigo)`. Doble-escribir `articuloCodigo` Y `articuloSku` en `.values()` y en `.onConflictDoUpdate.set` (research líneas 928-957). El `target` del onConflictDoUpdate sigue siendo `[existencias.articuloCodigo, existencias.depositoId]` (PK actual).
- **Deploy 2:** Todos los `eq(existencias.articuloCodigo, ...)` y `eq(existencias.articuloCodigo, articulos.codigo)` → `eq(existencias.articuloSku, ...)` y `eq(existencias.articuloSku, articulos.sku)`. El `target` del onConflictDoUpdate cambia a `[existencias.articuloSku, existencias.depositoId]` (PK nueva).
- **Deploy 3:** El DTO `CreateExistenciaDto` se rename de `articuloCodigo` → `articuloSku`. El service deja de escribir `articuloCodigo` (la columna ya no existe). El helper queda como pass-through.

---

### `apps/backend/src/modules/existencias/existencias.module.ts` (Module wiring)

**Self-analog:** mismo archivo.

**Excerpt completo del actual:**

```typescript
import { Module } from '@nestjs/common'
import { ExistenciasController } from './existencias.controller'
import { ExistenciasService } from './existencias.service'

@Module({
  controllers: [ExistenciasController],
  providers: [ExistenciasService],
  exports: [ExistenciasService],
})
export class ExistenciasModule {}
```

**Divergencias en Deploy 1:**

- Importar `ArticulosModule`:

  ```typescript
  import { ArticulosModule } from '../articulos/articulos.module'

  @Module({
    imports: [ArticulosModule],
    controllers: [ExistenciasController],
    providers: [ExistenciasService],
    exports: [ExistenciasService],
  })
  ```

---

### `apps/backend/src/modules/inventarios/inventarios.service.ts` (Backend service, CRUD)

**Self-analog:** líneas 244-272 del mismo archivo.

**Pattern addArticulo with insert + 23505 catch** (líneas 244-272):

```typescript
async addArticulo(inventarioId: number, dto: CreateInventarioArticuloDto) {
  await this.assertEventEditable(inventarioId)
  try {
    const rows = await this.drizzle.db
      .insert(inventariosArticulos)
      .values({
        inventarioId,
        articuloCodigo: dto.articuloCodigo,
        cantidadContada: dto.cantidadContada ?? 0,
        columna: dto.columna,
        dispositivoId: dto.dispositivoId,
        observaciones: dto.observaciones,
      })
      .returning()
    return rows[0]
  } catch (error: unknown) {
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
```

**Divergencias en Deploy 1:**

- Inyectar `ArticulosHelper`, agregar `articuloSku: await this.articulosHelper.resolveSku(dto.articuloCodigo)` en `.values()`. La catch de 23505 sigue válida (el unique index post-swap se llamará igual, sobre `(inventario_id, articulo_sku)`).

---

### `apps/backend/src/modules/inventarios/inventarios.module.ts` (Module wiring)

**Self-analog:** mismo archivo (idéntico patrón al de existencias).

**Divergencia en Deploy 1:** importar `ArticulosModule` (mismo cambio que en existencias.module.ts arriba).

---

### `apps/backend/src/modules/dashboard/dashboard.service.ts` (Backend service, aggregation)

**Self-analog:** mismo archivo.

**Divergencia en Deploy 2:** todas las queries con `existencias.articuloCodigo` o `inventariosArticulos.articuloCodigo` migran a `*.articuloSku`. La `LowStockItem` projection (research línea 822) renombra el field `articuloCodigo` → puede mantenerse semánticamente pero el column subyacente cambia.

---

### `apps/backend/src/modules/webhooks/webhooks.listener.ts` (Event listener, event-driven)

**Self-analog:** mismo archivo, líneas 10-22.

**Excerpt completo del actual:**

```typescript
@Injectable()
export class WebhooksListener {
  constructor(private readonly webhooksService: WebhooksService) {}

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_CREATED)
  async handleArticuloCreated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_CREATED, payload)
  }

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_UPDATED)
  async handleArticuloUpdated(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_UPDATED, payload)
  }

  @OnEvent(WEBHOOK_EVENTS.ARTICULO_DELETED)
  async handleArticuloDeleted(payload: { articulo: unknown }) {
    await this.webhooksService.dispatchEvent(WEBHOOK_EVENTS.ARTICULO_DELETED, payload)
  }
}
```

**Divergencias:** **NINGUNA estructural.** Research líneas 503-505 confirma: `articulo` es la fila completa de Drizzle (`articulos.$inferSelect`), que post-Deploy-1 ya incluye `sku`. El "bump v2" es semántico — no requiere cambio de código. El payload v2 emerge automáticamente.

**Nota para el planner:** este archivo NO cambia, pero el plan debe incluir un test E2E que capture un webhook delivery post-Deploy-2 y assert `payload.articulo.sku !== null` (research líneas 731-735).

---

### `apps/backend/src/db/seed.ts` + `apps/backend/src/db/generators/*.generator.ts` (DB seeders + factories)

**Self-analog:** mismos archivos.

**Divergencias:**

- **Deploy 1:** cada `.values()` o factory que inserta en las 5 hijas agrega `articuloSku: articulo.sku` (el seed ya tiene el `articulo` object como referencia).
- **Deploy 3:** quita `articuloCodigo`, queda solo `articuloSku`.

**Pattern guía:** ya están escritos con el patrón actual `articuloCodigo: articulo.codigo`. Agregar la línea hermana `articuloSku: articulo.sku` al lado.

---

### `scripts/phase31-preflight-audit.sh` (Bash script, audit → markdown)

**Analog:** `scripts/phase38-preflight-backup.sh` (en repo root, no en `apps/backend/scripts/` — ese directorio NO existe aún y debe crearse).

**Header + safety pattern** (de `phase38-preflight-backup.sh:1-27`):

```bash
#!/usr/bin/env bash
set -e

echo "Phase 38 — Pre-flight backup + restore-test (D-05)"
echo "============================================================"
echo ""

# 0) Computar nombre canónico (D-15): backup-YYMMDD-HHMM.dump
TIMESTAMP="$(date +%y%m%d-%H%M)"
BACKUP_NAME="backup-${TIMESTAMP}.dump"
BACKUP_PATH_HOST="/var/backups/erp_sanchez/${BACKUP_NAME}"
BACKUP_PATH_CTR="/tmp/${BACKUP_NAME}"

# 1) Verificar que /var/backups/erp_sanchez/ existe y es escribible
if [ ! -d /var/backups/erp_sanchez ]; then
  echo "❌ /var/backups/erp_sanchez/ does not exist. Create it first: sudo mkdir -p /var/backups/erp_sanchez && sudo chown $(whoami) /var/backups/erp_sanchez"
  exit 1
fi
```

**docker exec psql pattern** (de `phase38-preflight-backup.sh:64-65`):

```bash
C1=$(docker exec postgres psql -U sanchez -d erp_sanchez -tAc "SELECT count(*) FROM ${T}")
```

**docker exec pg_dump pattern** (de `phase38-preflight-backup.sh:31`):

```bash
docker exec postgres pg_dump -U sanchez -d erp_sanchez -F c -f "${BACKUP_PATH_CTR}"
```

**Divergencias respecto al analog:**

- 31-preflight NO hace pg_dump (eso es responsabilidad del operador en Wave 0 Step 2 — Deploy 2 lo invoca aparte).
- 31-preflight produce un archivo markdown (`31-PREFLIGHT-AUDIT.md`) con los counts. Pattern de heredoc + `cat >> file` que research entrega completo en líneas 654-695.
- 31-preflight es **non-blocking** (D-01): nunca exit 1 por counts altos, siempre exit 0.
- 31-preflight usa `set -euo pipefail` (más estricto que `set -e`).
- Output path: `.planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-PREFLIGHT-AUDIT.md` (relativo a project root).

**Decisión de directorio:** Los scripts viven en `/scripts/` root del repo (consistente con `scripts/phase38-preflight-backup.sh` y demás scripts operacionales existentes). El directorio `apps/backend/scripts/` NO se crea — esa propuesta inicial fue descartada por divergir de la convención del repo. Ver Critical Note #2 más abajo.

---

### `scripts/phase31-validation.sh` (Bash script, validation → exit code)

**Analog:** `scripts/phase38-preflight-backup.sh` líneas 60-72 (row count diff with exit code).

**Diff loop with exit code pattern** (de `phase38-preflight-backup.sh:60-85`):

```bash
TABLES=("articulos" "existencias" "inventarios_articulos" "comprobantes_cabecera" "comprobantes_detalle" "comprobantes_pagos")
DIFF_FOUND=0
for T in "${TABLES[@]}"; do
  C1=$(docker exec postgres psql -U sanchez -d erp_sanchez -tAc "SELECT count(*) FROM ${T}")
  C2=$(docker exec postgres psql -U sanchez -d erp_restore_test -tAc "SELECT count(*) FROM ${T}")
  if [ "$C1" = "$C2" ]; then
    echo "  ✓ ${T}: ${C1} (match)"
  else
    echo "  ❌ ${T}: erp_sanchez=${C1} erp_restore_test=${C2} (MISMATCH)"
    DIFF_FOUND=1
  fi
done

if [ $DIFF_FOUND -ne 0 ]; then
  echo "❌ ABORT: row counts mismatch. Phase 38 must NOT proceed."
  exit 1
fi

echo "✓ ALL CHECKS PASSED"
```

**Divergencias:**

- 31-validation acepta un argumento `--check=<type>` (`integrity`, `pk-swap`, `triggers`) para correr distinto SQL según gate (research línea 1023).
- Para `--check=integrity`: ejecutar las 5 queries SC#5 (research líneas 240-245) y verificar que todas retornen 0.
- Para `--check=pk-swap`: verificar `articulos.sku` es PK, los 5 fkeys terminan en `_articulo_sku_fkey` (research líneas 1011-1014).
- Para `--check=triggers`: verificar `tgenabled='O'` y `articulos.unidades` consistente con `SUM(existencias.cantidad)` (research líneas 1124-1126).
- Exit 1 si cualquier check falla → consumido por el plan como gate hard-stop antes de Wave 2 / Wave 3.

---

### `apps/web/src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` → renombrar a `[sku]/editar/page.tsx`

**Self-analog:** mismo archivo, líneas 28-79.

**Pattern useParams + handler** (líneas 28-50):

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { fetchArticuloByCodigoClient, toggleArticuloActivo, deleteArticulo } from '@/lib/api.client'
// ...

export default function EditarArticuloPage() {
  const params = useParams<{ codigo: string }>()
  const router = useRouter()
  const codigo = decodeURIComponent(params.codigo)
  // ...

  const loadArticulo = useCallback(async () => {
    try {
      const data = await fetchArticuloByCodigoClient(codigo)
      setArticulo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar el articulo')
    } finally {
      setLoading(false)
    }
  }, [codigo])
```

**Pattern actions on articulo** (líneas 56-79):

```typescript
async function handleConfirmToggle() {
  if (!articulo) return
  try {
    if (articulo.activo) {
      await deleteArticulo(articulo.codigo)
      // ...
      router.push('/articulos')
    } else {
      const updated = await toggleArticuloActivo(articulo.codigo)
      setArticulo(updated)
    }
  } catch (err) {
    /* ... */
  }
}
```

**Divergencias en Deploy 2:**

- **Path rename**: `[codigo]/` → `[sku]/` (operación `git mv` del directorio completo).
- `useParams<{ codigo: string }>()` → `useParams<{ sku: string }>()`.
- `const codigo = decodeURIComponent(params.codigo)` → `const sku = decodeURIComponent(params.sku)`.
- `fetchArticuloByCodigoClient(codigo)` → `fetchArticuloBySkuClient(sku)` (nueva función en api.client.ts).
- `deleteArticulo(articulo.codigo)` → `deleteArticulo(articulo.sku)` (param renombrado).
- `toggleArticuloActivo(articulo.codigo)` → `toggleArticuloActivo(articulo.sku)`.
- Props `articuloCodigo={articulo.codigo}` en `<ImagenSlotGrid>` y `<ImagenSlot>` → `articuloSku={articulo.sku}` (rename prop name por coherencia — research Discretion #3 / §A5).

---

### `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` (Frontend client component, event-driven)

**Self-analog:** línea 152-157 del mismo archivo.

**Pattern handleEdit con router.push** (líneas 152-157):

```typescript
const handleEdit = useCallback(
  (articulo: Articulo) => {
    router.push(`/articulos/${encodeURIComponent(articulo.codigo)}/editar`)
  },
  [router]
)
```

**Divergencias en Deploy 2:**

- Línea 154: `articulo.codigo` → `articulo.sku`.

---

### `apps/web/src/components/articulos/articulo-sheet.tsx` (Frontend component)

**Self-analog:** líneas 162 y 199.

**Pattern Link a editar** (línea 199):

```typescript
<Link href={`/articulos/${encodeURIComponent(articulo.codigo)}/editar`}>
```

**Pattern fetch existencias by articulo** (línea 162):

```typescript
fetchExistenciasByArticuloClient(articulo.codigo)
```

**Divergencias en Deploy 2:**

- Línea 199: `articulo.codigo` → `articulo.sku` para el path del Link.
- Línea 162: **MANTENER** `articulo.codigo` — la ruta `/api/existencias/articulo/:articuloCodigo` sigue siendo "by-codigo" (agrupador, Phase 32 retorna N rows) según research línea 507.
- Línea 190 (`{articulo.codigo}` como display text): mantener — el codigo es el identificador visible. Phase 32 puede separar el display en `codigo` (agrupador) vs `sku` (variante) en columnas distintas.

---

### `apps/web/src/components/articulos/imagen-slot.tsx` (Frontend component)

**Self-analog:** líneas 37-44 del mismo archivo.

**Pattern props interface** (líneas 37-44):

```typescript
interface ImagenSlotProps {
  tipo: 'etiqueta' | 'producto'
  slot: number
  url: string | null
  articuloCodigo: string
  onUpdated: (articulo: Articulo) => void
  onPreview: () => void
}
```

**Divergencias en Deploy 2:**

- Prop name `articuloCodigo: string` → `articuloSku: string`.
- Internal calls a `uploadArticuloImagen(articuloCodigo, ...)` → `uploadArticuloImagen(articuloSku, ...)`.
- Caller (`editar/page.tsx`) actualiza el prop name al hacer el rekey.

---

### `apps/web/src/components/articulos/imagen-slot-grid.tsx` (Frontend component)

**Self-analog:** mismo archivo (idem `imagen-slot.tsx`).

**Divergencias en Deploy 2:** mismo rename `articuloCodigo` → `articuloSku` en props y forwarded calls.

---

### `apps/web/src/lib/api.client.ts` (API client wrapper, request-response)

**Self-analog:** mismo archivo, líneas 128-223.

**Pattern fetch with auth headers** (líneas 128-135):

```typescript
export async function fetchArticuloByCodigoClient(codigo: string): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  await throwIfError(response)
  return response.json()
}
```

**Pattern update (PATCH)** (líneas 148-160):

```typescript
export async function updateArticulo(
  codigo: string,
  data: Record<string, unknown>
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const response = await fetch(`${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  })
  await throwIfError(response)
  return response.json()
}
```

**Pattern multipart upload** (líneas 185-206):

```typescript
export async function uploadArticuloImagen(
  codigo: string,
  tipo: 'etiqueta' | 'producto',
  slot: number,
  file: File
): Promise<Articulo> {
  const headers = await getAuthHeaders()
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tipo', tipo)
  formData.append('slot', slot.toString())
  const response = await fetch(
    `${API_BASE_URL}/api/articulos/${encodeURIComponent(codigo)}/imagenes`,
    { method: 'POST', headers, body: formData }
  )
  await throwIfError(response)
  return response.json()
}
```

**Divergencias en Deploy 2:**

- Renombrar 6 funciones:
  - `fetchArticuloByCodigoClient(codigo)` → `fetchArticuloBySkuClient(sku)` (URL `/api/articulos/{sku}`).
  - `updateArticulo(codigo, data)` → `updateArticulo(sku, data)`.
  - `toggleArticuloActivo(codigo)` → `toggleArticuloActivo(sku)`.
  - `deleteArticulo(codigo)` → `deleteArticulo(sku)`.
  - `uploadArticuloImagen(codigo, ...)` → `uploadArticuloImagen(sku, ...)`.
  - `deleteArticuloImagen(codigo, ...)` → `deleteArticuloImagen(sku, ...)`.
- Agregar nueva función `fetchArticulosByCodigoClient(codigo: string): Promise<Articulo[]>` que llama a `GET /api/articulos/by-codigo/{codigo}` y retorna array (research líneas 532).

---

### `apps/web/src/types/existencia.ts` (TypeScript type, declarative)

**Self-analog:** mismo archivo, líneas 1-11.

**Pattern interface con articulo refs** (líneas 1-11):

```typescript
export interface Existencia {
  articuloCodigo: string
  depositoId: number
  cantidad: number
  stockMinimo: number
  stockMaximo: number
  updatedAt: string
  articuloNombre: string
  articuloSku: string | null
  depositoNombre?: string
}
```

**Divergencias por Deploy:**

- **Deploy 2:** Agregar `articuloSku: string` notnull (la línea 9 ya tiene `articuloSku: string | null` — cambiar a `string` no-nullable). Mantener `articuloCodigo: string` durante coexistencia (research §"Open Questions (RESOLVED)" #4 — Discretion implícito).
- **Deploy 3:** Quitar `articuloCodigo: string` (queda solo `articuloSku`).
- `ExistenciaMatrixRow` (línea 29-34): agregar `articuloSku: string` en Deploy 2, quitar `articuloCodigo` en Deploy 3.

**Aplica mismo patrón a:** `order.ts`, `sale.ts`, `purchase.ts`, `inventario.ts`, `dashboard.ts` (cada uno tiene una interfaz con `articuloCodigo: string`).

---

### `apps/web/src/components/settings/webhooks/webhooks-client.tsx` (Frontend component)

**Self-analog estructural:** líneas 272-282 (return block top-level).
**Analog de componente Alert:** `apps/web/src/components/ui/alert.tsx`.

**Excerpt del Alert de shadcn instalado** (líneas 1-50 de `alert.tsx`):

```typescript
import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@objetiva/ui/lib/utils'

const alertVariants = cva(
  'relative w-full rounded-md border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
  {
    variants: {
      variant: {
        default: 'bg-background text-foreground',
        destructive: 'border-destructive/50 text-destructive ...',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

const Alert = React.forwardRef<...>({ ... })
const AlertTitle = React.forwardRef<...>({ ... })
const AlertDescription = React.forwardRef<...>({ ... })

export { Alert, AlertTitle, AlertDescription }
```

**Top-level return pattern en webhooks-client.tsx** (líneas 272-282):

```typescript
return (
  <div className="space-y-4">
    {webhooks.length === 0 ? (
      <div className="flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center">
        <Webhook className="h-8 w-8 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground mb-4">No hay webhooks configurados</p>
        <Button size="sm" onClick={openCreateDialog}>Nuevo Webhook</Button>
      </div>
    ) : (
      <>
        <div className="flex justify-end">
          <Button size="sm" onClick={openCreateDialog}>Nuevo Webhook</Button>
        </div>
```

**Divergencias en Deploy 2:**

- Agregar import del Alert al top del archivo:
  ```typescript
  import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
  import { Info } from 'lucide-react'
  ```
- Insertar el Alert dentro del `<div className="space-y-4">` (línea 273), antes del bloque condicional `{webhooks.length === 0 ? ... : ...}`. Texto en es-AR (research líneas 559-571):
  ```tsx
  <Alert>
    <Info className="h-4 w-4" />
    <AlertTitle>Cambio en el payload de articulo.* desde v1.3</AlertTitle>
    <AlertDescription>
      Los eventos <code>articulo.created</code>, <code>articulo.updated</code> y{' '}
      <code>articulo.deleted</code> ahora incluyen el campo <code>sku</code> dentro del objeto{' '}
      <code>articulo</code>, además del <code>codigo</code> existente. <strong>sku</strong> es el
      identificador único de cada fila; <strong>codigo</strong> puede agrupar variantes cuando una
      misma referencia tiene atributos múltiples. Los suscriptores que solo leen <code>codigo</code>{' '}
      siguen funcionando sin cambios.
    </AlertDescription>
  </Alert>
  ```
- Notice posicionado **arriba del bloque de tabla** (visible apenas se carga el tab Webhooks).

---

## Shared Patterns

### Authentication (sin cambio en Phase 31)

**Source:** `apps/backend/src/common/guards/roles.guard.ts` + `apps/backend/src/common/decorators/roles.decorator.ts`
**Apply to:** Todos los controllers con write routes (articulos.controller, articulos-imagenes.controller).

```typescript
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@UseGuards(RolesGuard)
@Roles('admin')
@Post()
create(@Body() dto: CreateArticuloDto) { ... }
```

**Regla Phase 31:** los decorators `@UseGuards(RolesGuard) @Roles('admin')` migran inalterados cuando se rekeyan las rutas `:codigo` → `:sku`. No agregar/quitar guards.

---

### Error Handling (centralizado en Nest)

**Source:** `apps/backend/src/modules/articulos/articulos.service.ts:117, 128, 146` + `apps/backend/src/modules/inventarios/inventarios.service.ts:262-269`
**Apply to:** Todos los services nuevos/modificados.

**Pattern NotFoundException post-update:**

```typescript
if (!rows[0]) {
  throw new NotFoundException(`Articulo con codigo ${codigo} no encontrado`)
}
```

**Pattern ConflictException (23505 unique violation) post-insert:**

```typescript
} catch (error: unknown) {
  if (
    error instanceof Error &&
    'code' in error &&
    (error as Record<string, unknown>).code === '23505'
  ) {
    throw new ConflictException('Articulo ya existe en este conteo')
  }
  throw error
}
```

**Regla Phase 31:** rekey de mensajes — `Articulo con codigo ${codigo}` → `Articulo con sku ${sku}` en métodos que ahora keyean por sku. Mantener `${codigo}` en `findByCodigo` (el método sigue siendo by-codigo).

---

### Drizzle migration application (`--single-transaction --set ON_ERROR_STOP=1`)

**Source:** `apps/backend/drizzle/0008_phase30_templates.sql:22-23` + quick `260428-mig`
**Apply to:** Las 3 migrations (0009, 0010, 0011).

```bash
psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0009_phase31_expand.sql
```

**Regla:** todo plan que aplique una migration debe explicitar este comando en la sección de Apply. NUNCA usar `db:push --force` (lección `feedback_db_push_force_prod.md`).

---

### Atomic schema.ts + .sql + journal commit

**Source:** lección global `feedback_schema_drift_silencioso.md` (memoria).
**Apply to:** Cada uno de los 3 deploys.

**Regla:** cada commit que toca DB debe incluir SIMULTÁNEAMENTE:

1. `apps/backend/src/db/schema.ts` actualizado.
2. `apps/backend/drizzle/00XX_*.sql` nuevo.
3. `apps/backend/drizzle/meta/_journal.json` con entry agregada.

Faltar uno → drizzle queries con 500 silenciosos (lección 2026-05-15).

---

### Bash script idempotency + safety

**Source:** `scripts/phase38-preflight-backup.sh:2-26` (set -e, pre-checks, refuse overwrites)
**Apply to:** Los 2 scripts nuevos (preflight-audit, validation).

```bash
#!/usr/bin/env bash
set -euo pipefail

if [ ! -d /var/backups/erp_sanchez ]; then
  echo "❌ /var/backups/erp_sanchez/ does not exist. Create it first."
  exit 1
fi
```

**Regla Phase 31:** todo script bash debe:

- Empezar con `set -euo pipefail` (script falla a la primera).
- Verificar precondiciones antes de operar (dirs existen, container postgres running, no colisiones de naming).
- Imprimir output con `✓`/`❌` para que el operador lea visualmente el resultado.
- Exit 1 en validation failure (excepto preflight-audit que es non-blocking por D-01).

---

### NestJS Module wiring para inter-module DI

**Source:** `apps/backend/src/modules/articulos/articulos.module.ts:1-12` + paths existentes de import inter-modules en otros módulos.
**Apply to:** `existencias.module.ts`, `inventarios.module.ts` que necesitan `ArticulosHelper`.

```typescript
import { Module } from '@nestjs/common'
import { ArticulosModule } from '../articulos/articulos.module'

@Module({
  imports: [ArticulosModule],   // ← agregar
  controllers: [...],
  providers: [...],
  exports: [...],
})
export class ExistenciasModule {}
```

**Regla:** `ArticulosModule` debe exportar `ArticulosHelper` (`exports: [ArticulosService, ArticulosHelper]`) y los módulos consumidores deben importar `ArticulosModule` en `imports: []`.

---

### Frontend: shadcn/ui + Tabler aesthetic

**Source:** `apps/web/src/components/ui/alert.tsx` (componente shadcn ya instalado).
**Apply to:** El notice en `webhooks-client.tsx`.

**Regla Phase 31:** el único componente UI nuevo es el `<Alert>` del notice. Usar el componente shadcn ya instalado (`@/components/ui/alert`), no crear un Alert custom. Si se necesita ajustar la estética a Tabler (border-radius, padding), consultar `shadcn-tabler-mcp.query-aesthetic`.

---

## No Analog Found

Estas superficies son nuevas en el repo — no existe analog directo. El planner debe entregar el código completo siguiendo el research:

| File                                                                    | Role                   | Data Flow        | Razón                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------- | ---------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/backend/drizzle/0010_phase31_switch.sql` (7-step transaction)     | Migration DDL          | LOCK + DDL + DML | No hay PK swap previo en el repo. Pattern viene de `PITFALLS.md §P-01 líneas 28-67` (canonical). Research entrega el SQL completo en líneas 278-433.                                                                                                                                                                                                                                    |
| `apps/backend/src/modules/articulos/articulos-helper.ts`                | Helper utility         | request-response | No hay helpers Injectable separados de servicios en el repo. Pattern viene del minimum NestJS service template; research entrega stub completo.                                                                                                                                                                                                                                         |
| `scripts/phase31-preflight-audit.sh`                                    | Bash audit script      | one-shot         | No hay scripts de audit previos. Pattern combina `phase38-preflight-backup.sh` (safety) + heredoc markdown generation; research entrega completo en líneas 644-696.                                                                                                                                                                                                                     |
| `scripts/phase31-validation.sh`                                         | Bash validation script | exit-code gate   | No hay scripts de validation con subcomandos previos. Pattern combina `phase38-preflight-backup.sh` (diff loop) + arg parsing; research line 1023 menciona los sub-comandos pero NO entrega el script completo. **Planner debe redactarlo.**                                                                                                                                            |
| `apps/backend/test/articulos-phase31.e2e-spec.ts`                       | E2E test               | request-response | **No hay framework de testing instalado en backend** (`apps/backend/package.json` no incluye jest/vitest/supertest). El research asume Vitest+supertest pero la instalación NO existe. **Planner debe decidir:** (a) instalar el framework como parte de Wave 0, o (b) marcar SC#3/SC#4 como manual-only (psql + curl + jq) en este phase y diferir el framework a una tech-debt phase. |
| `apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts` | Unit test              | pure function    | Idem arriba — no hay framework de testing. **Diferir o instalar.**                                                                                                                                                                                                                                                                                                                      |

---

## Critical Notes for the Planner

1. **Testing framework gap:** El backend (`apps/backend/`) NO tiene framework de testing instalado. `package.json` no incluye `jest`, `@nestjs/testing`, `supertest`, `vitest` ni scripts `test:*`. Los archivos de test propuestos en research (`articulos-phase31.e2e-spec.ts`, `articulos-helper.spec.ts`) NO se pueden ejecutar tal como están descritos. **El plan debe decidir explícitamente:** (a) Wave 0 incluye step "instalar framework de testing" — agregar deps, jest.config, sample test — o (b) reemplazar tests E2E por smoke checks vía bash (psql + curl + jq). La opción (b) es más rápida pero deja deuda. La opción (a) es más cara pero hace que los SC tests sean repetibles.

2. **Scripts dir (DECIDIDO):** Los scripts viven en `/scripts/` root del repo, NO en `apps/backend/scripts/`. Convención existente del repo (phase38-preflight-backup, restore-selectivo-260502, test-auth). Plans 31-01..31-04 deben usar `scripts/phase31-*.sh` consistentemente.

3. **`feedback_schema_drift_silencioso.md` (memoria global) es ley** — cada deploy commitea schema.ts + 00XX\_\*.sql + \_journal.json juntos. Plan debe asignar cada commit Wave-N a tener los 3 archivos.

4. **`feedback_db_push_force_prod.md` (memoria global) es ley** — nunca `pnpm db:push --force`. Las 3 migrations se aplican con `psql --single-transaction --set ON_ERROR_STOP=1`.

5. **`feedback_docker_compose.md` (memoria global)** — pg_dump y psql corren `docker exec postgres ...` (no `pnpm` ni psql local).

6. **`feedback_never_drop_tables.md` (memoria global)** — Phase 31 hace `DROP COLUMN articulo_codigo` (no DROP TABLE). Está permitido por D-08/D-13. Si emerge necesidad de DROP TABLE, parar y consultar.

7. **D-08 sin alias:** las URLs viejas `/api/articulos/:codigo` mueren con Deploy 2. Si un suscriptor externo rompe, queda fuera de scope (descartado en deferred).

8. **Webhook payload v2 = bump semántico, no estructural** (research §"Open Questions (RESOLVED)" #5 + memoria del `articulos.service.ts:105`): el código emit NO cambia. Solo cambia que post-Deploy-1 el `articulo.sku` ya no es null. El planner NO debe agregar lógica de "enriquecimiento" — sería ruido.

---

## Metadata

**Analog search scope:**

- `apps/backend/drizzle/` (10 archivos .sql)
- `apps/backend/src/db/` (schema.ts, seed.ts, migrate-unidades.sql, generators/)
- `apps/backend/src/modules/articulos/` (5 archivos)
- `apps/backend/src/modules/existencias/` (4 archivos)
- `apps/backend/src/modules/inventarios/` (4 archivos)
- `apps/backend/src/modules/webhooks/` (listener, service, events)
- `apps/web/src/app/(dashboard)/articulos/` (page + client)
- `apps/web/src/components/articulos/` (sheet + slot + slot-grid)
- `apps/web/src/components/settings/webhooks/` (webhooks-client)
- `apps/web/src/components/ui/alert.tsx`
- `apps/web/src/lib/api.client.ts`
- `apps/web/src/types/*.ts` (6 archivos)
- `scripts/*.sh` (3 archivos root)

**Files scanned:** ~55
**Pattern extraction date:** 2026-05-18
