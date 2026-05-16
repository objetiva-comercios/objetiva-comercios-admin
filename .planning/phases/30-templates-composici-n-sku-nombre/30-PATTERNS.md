# Phase 30: Templates + Composición SKU/Nombre - Pattern Map

**Mapped:** 2026-05-16
**Files analyzed:** 18
**Analogs found:** 17 / 18

---

## File Classification

| Archivo nuevo / modificado | Role | Data Flow | Analog más cercano | Match |
|---|---|---|---|---|
| `apps/backend/drizzle/0008_phase30_templates.sql` | migration | batch DDL | `0006_categorias_subcategorias.sql` | exact |
| `apps/backend/drizzle/meta/_journal.json` | config | batch | `_journal.json` (entries 0-7) | exact |
| `apps/backend/src/db/schema.ts` (MODIFY) | model | CRUD | `schema.ts` líneas 548-568 (`propSubcategoria`) | exact |
| `apps/backend/src/modules/propiedades/propiedades.constants.ts` (MODIFY) | config | — | mismo archivo líneas 12-44 | exact |
| `apps/backend/src/modules/propiedades/propiedades.service.ts` (MODIFY) | service | CRUD | mismo archivo líneas 57-69 (`create`) | exact |
| `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` (MODIFY) | dto | request-response | mismo archivo | exact |
| `apps/backend/src/modules/templates/templates.controller.ts` (NEW) | controller | request-response | `webhooks.controller.ts` | role-match |
| `apps/backend/src/modules/templates/templates.service.ts` (NEW) | service | CRUD | `propiedades.service.ts` | role-match |
| `apps/backend/src/modules/templates/templates.module.ts` (NEW) | module | — | `propiedades.module.ts` | exact |
| `apps/backend/src/modules/templates/dto/create-template.dto.ts` (NEW) | dto | request-response | `create-webhook.dto.ts` | role-match |
| `apps/backend/src/app.module.ts` (MODIFY) | module | — | mismo archivo líneas 1-51 | exact |
| `apps/backend/package.json` (MODIFY) | config | — | mismo archivo | exact |
| `packages/utils/src/composer.ts` (NEW) | utility | transform | `packages/utils/src/formatters.ts` | role-match |
| `packages/utils/src/index.ts` (MODIFY) | utility | — | mismo archivo | exact |
| `packages/types/src/template.ts` (NEW) | types | — | `packages/types/src/index.ts` (interfaces existentes) | role-match |
| `packages/types/src/index.ts` (MODIFY) | types | — | mismo archivo | exact |
| `apps/web/src/lib/composer.test.ts` (NEW) | test | — | `apps/web/src/lib/abrev.test.ts` | exact |
| `apps/web/src/types/propiedad.ts` (MODIFY) | types | — | mismo archivo líneas 11-87 | exact |
| `apps/web/src/components/propiedades/propiedad-table.tsx` (MODIFY) | component | request-response | mismo archivo líneas 31-34 (`PropiedadTableProps`) | exact |
| `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` (MODIFY) | component | request-response | mismo archivo | exact |

---

## Pattern Assignments

---

### `apps/backend/drizzle/0008_phase30_templates.sql` (NEW migration)

**Role:** migration, batch DDL
**Analog:** `apps/backend/drizzle/0006_categorias_subcategorias.sql` (líneas 1-38) + `0007_drop_sector_id_huerfana.sql` (líneas 1-6)
**Data flow:** psql aplica → `__drizzle_migrations` + `_journal.json` se actualizan manualmente

**Patrón de cabecera y comentario** (de `0006_categorias_subcategorias.sql:1-9`):
```sql
-- Migration 0006: agregar categoria/subcategoria a articulos + crear catalogos prop_categoria/prop_subcategoria
-- Origen: bug detectado 2026-05-15. ...
--
-- Aplicar con: psql --single-transaction --set ON_ERROR_STOP=1 -f 0006_categorias_subcategorias.sql
```

**Patrón CREATE TABLE con FK y CHECK** (de `0006_categorias_subcategorias.sql:21-31`):
```sql
CREATE TABLE "prop_subcategoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_subcategoria_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$'),
	CONSTRAINT "prop_subcategoria_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "prop_categoria"("id") ON DELETE RESTRICT
);--> statement-breakpoint
```

**Patrón ADD COLUMN IF NOT EXISTS** (de `0006_categorias_subcategorias.sql:10-11`):
```sql
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "categoria" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "subcategoria" text;--> statement-breakpoint
```

**Patrón DROP COLUMN IF EXISTS** (de `0007_drop_sector_id_huerfana.sql:6`):
```sql
ALTER TABLE "inventarios_articulos" DROP COLUMN IF EXISTS "sector_id";
```

**Patrón índices con expresión lower()** (de `0006_categorias_subcategorias.sql:35-38`):
```sql
CREATE UNIQUE INDEX "prop_subcategoria_nombre_lower_uniq" ON "prop_subcategoria" USING btree ("categoria_id", lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_subcategoria_abrev_uniq" ON "prop_subcategoria" USING btree ("categoria_id", "abrev");--> statement-breakpoint
CREATE INDEX "prop_subcategoria_categoria_id_idx" ON "prop_subcategoria" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "prop_subcategoria_activo_idx" ON "prop_subcategoria" USING btree ("activo");
```

**Notas:**
- Separar cada statement con `--> statement-breakpoint` para compatibilidad con drizzle-kit.
- `prop_familia`: misma estructura que `prop_subcategoria` pero FK apunta a `prop_subcategoria(id)` y el nombre del constraint cambia a `prop_familia_subcategoria_id_fk`.
- `prop_aplicacion`: shape mínimo sin FK, igual a `prop_categoria` (id, nombre, abrev, activo, timestamps + CHECK abrev).
- `articulos_templates`: shape plano (id serial PK, nombre TEXT UNIQUE NOT NULL, descripcion TEXT, activo BOOLEAN DEFAULT true, timestamps).
- `template_atributos`: PK compuesta `(template_id, atributo_tipo)`, FK `template_id` → `articulos_templates(id) ON DELETE CASCADE`.
- Los 8 DROPs de columnas legacy van DESPUÉS de los ADD COLUMN, agrupados en el mismo transaction.
- Seed del template default (INSERT ... ON CONFLICT DO NOTHING) va AL FINAL de la migration — patrón documentado en RESEARCH.md §9.

---

### `apps/backend/drizzle/meta/_journal.json` (MODIFY)

**Role:** config
**Analog:** mismo archivo líneas 46-61

**Patrón de nueva entry** (de `_journal.json:53-61`):
```json
{
  "idx": 7,
  "version": "7",
  "when": 1779000000000,
  "tag": "0007_drop_sector_id_huerfana",
  "breakpoints": true
}
```

**Notas:**
- Agregar entry con `idx: 8`, `tag: "0008_phase30_templates"`, `when: <timestamp epoch ms al momento de aplicar>`.
- Actualizar también `__drizzle_migrations` en la DB con INSERT INTO (patrón del operativo 2026-05-15).

---

### `apps/backend/src/db/schema.ts` — sección Phase 30 (MODIFY)

**Role:** model
**Analog:** `apps/backend/src/db/schema.ts:512-585`

**Patrón `definePropTable` para `prop_aplicacion`** (líneas 518-543):
```typescript
function definePropTable(tableName: string, indexPrefix: string) {
  return pgTable(
    tableName,
    {
      id: serial('id').primaryKey(),
      nombre: text('nombre').notNull(),
      abrev: text('abrev').notNull(),
      activo: boolean('activo').notNull().default(true),
      createdAt: timestamp('created_at').notNull().defaultNow(),
      updatedAt: timestamp('updated_at').notNull().defaultNow(),
    },
    table => [
      uniqueIndex(`${indexPrefix}_nombre_lower_uniq`).on(lower(table.nombre)),
      uniqueIndex(`${indexPrefix}_abrev_uniq`).on(table.abrev),
      check(`${indexPrefix}_abrev_format_chk`, ABREV_REGEX_SQL),
      index(`${indexPrefix}_activo_idx`).on(table.activo),
    ]
  )
}
// Uso: export const propAplicacion = definePropTable('prop_aplicacion', 'prop_aplicacion')
```

**Patrón `pgTable` custom con FK para `prop_familia`** (líneas 548-568):
```typescript
export const propSubcategoria = pgTable(
  'prop_subcategoria',
  {
    id: serial('id').primaryKey(),
    categoriaId: integer('categoria_id')
      .notNull()
      .references(() => propCategoria.id, { onDelete: 'restrict' }),
    nombre: text('nombre').notNull(),
    abrev: text('abrev').notNull(),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    uniqueIndex('prop_subcategoria_nombre_lower_uniq').on(table.categoriaId, lower(table.nombre)),
    uniqueIndex('prop_subcategoria_abrev_uniq').on(table.categoriaId, table.abrev),
    check('prop_subcategoria_abrev_format_chk', ABREV_REGEX_SQL),
    index('prop_subcategoria_categoria_id_idx').on(table.categoriaId),
    index('prop_subcategoria_activo_idx').on(table.activo),
  ]
)
```

**Columnas en `articulos` a ELIMINAR** (líneas 198-200, 211-215):
```typescript
// ESTAS LÍNEAS SE ELIMINAN:
rubro: text('rubro'),
subrubro: text('subrubro'),
adjetivo: text('adjetivo'),
propAux1: text('prop_aux_1'),
propAux2: text('prop_aux_2'),
propAux3: text('prop_aux_3'),
propAux4: text('prop_aux_4'),
propAux5: text('prop_aux_5'),
```

**Notas para `schema.ts`:**
- `propFamilia`: copiar forma exacta de `propSubcategoria`, cambiar `categoriaId → subcategoriaId`, FK referencia a `propSubcategoria.id`. Todos los index names usan prefijo `prop_familia_`.
- `propAplicacion`: usar `definePropTable('prop_aplicacion', 'prop_aplicacion')` — shape idéntico a las 6 de Phase 29.
- `articulosTemplates`: `pgTable` custom plano (id serial PK, nombre text unique, descripcion text nullable, activo boolean, timestamps).
- `templateAtributos`: PK compuesta con `primaryKey({ columns: [table.templateId, table.atributoTipo] })` — verificar import `primaryKey` desde `drizzle-orm/pg-core`.
- Para `template_atributos.custom_slot`: usar `integer` (el repo no tiene `smallint` actualmente; rango 1-3 no lo justifica).
- Columnas nuevas en `articulos`: `familia text`, `custom1 text('custom_1')`, `custom2 text('custom_2')`, `custom3 text('custom_3')`, `templateId integer('template_id').references(() => articulosTemplates.id, { onDelete: 'set null' })`.
- Agregar exports de tipo al final de la sección: `export type PropFamilia = typeof propFamilia.$inferSelect`, etc.
- Modificar `schema.ts` y `0008_*.sql` EN EL MISMO COMMIT (lección incidente 2026-05-15).

---

### `apps/backend/src/modules/propiedades/propiedades.constants.ts` (MODIFY)

**Role:** config
**Analog:** mismo archivo, líneas 1-44

**Patrón PROP_TIPOS array** (líneas 12-19):
```typescript
export const PROP_TIPOS = [
  'marca',
  'color',
  'talle',
  'material',
  'presentacion',
  'objeto',
] as const
```

**Patrón PROP_TABLES map** (líneas 25-32):
```typescript
export const PROP_TABLES = {
  marca: propMarca,
  color: propColor,
  // ...
} as const
```

**Patrón PROP_LABELS** (líneas 37-44):
```typescript
export const PROP_LABELS: Record<PropTipo, { singular: string; plural: string }> = {
  marca: { singular: 'marca', plural: 'marcas' },
  // ...
}
```

**Notas:**
- Agregar `'familia'` y `'aplicacion'` al array `PROP_TIPOS` (al final, manteniendo el orden existente).
- Agregar `familia: propFamilia` y `aplicacion: propAplicacion` a `PROP_TABLES` — requiere importar los nuevos exports de `schema.ts`.
- Agregar `familia: { singular: 'familia', plural: 'familias' }` y `aplicacion: { singular: 'aplicación', plural: 'aplicaciones' }` a `PROP_LABELS`.
- PITFALL-7: hay un espejo de `PROP_TIPOS` en `apps/web/src/types/propiedad.ts` — ambos se deben actualizar.

---

### `apps/backend/src/modules/propiedades/propiedades.service.ts` (MODIFY)

**Role:** service, CRUD
**Analog:** mismo archivo, líneas 57-69 (`create`)

**Patrón `create()` actual** (líneas 57-69):
```typescript
async create(tipo: PropTipo, dto: CreatePropiedadDto) {
  const table = this.tableFor(tipo)
  try {
    const rows = await this.drizzle.db
      .insert(table)
      .values({ nombre: dto.nombre, abrev: dto.abrev })
      .returning()
    return rows[0]
  } catch (error: unknown) {
    this.handleUniqueViolation(error, tipo, dto)
    throw error
  }
}
```

**Notas:**
- Extender `create()` para manejar el campo `parentId` cuando `tipo === 'familia'`:
  ```typescript
  const values: Record<string, unknown> = { nombre: dto.nombre, abrev: dto.abrev }
  if (tipo === 'familia') {
    if (!dto.parentId) throw new BadRequestException('subcategoria_id requerido para familia')
    values.subcategoriaId = dto.parentId
  }
  ```
- Luego `this.drizzle.db.insert(table).values(values).returning()`.
- No tocar `handleUniqueViolation` — maneja correctamente UNIQUE compuesto (detecta por nombre del constraint que incluye el prefijo `prop_familia_`).

---

### `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` (MODIFY)

**Role:** dto, request-response
**Analog:** mismo archivo, líneas 1-17

**DTO actual** (líneas 1-17):
```typescript
import { IsString, IsNotEmpty, MaxLength, Matches } from 'class-validator'
import { Transform } from 'class-transformer'

export class CreatePropiedadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  nombre!: string

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z0-9]{1,8}$/, {
    message: 'La abreviación debe tener 1 a 8 caracteres en mayúsculas o dígitos',
  })
  abrev!: string
}
```

**Notas:**
- Agregar campo opcional `parentId`:
  ```typescript
  import { IsInt, IsOptional } from 'class-validator'
  // ...
  @IsOptional()
  @IsInt()
  parentId?: number
  ```
- Los decoradores `@IsOptional()` e `@IsInt()` ya los usa el proyecto (ver otros DTOs). No requiere nueva instalación.

---

### `apps/backend/src/modules/templates/templates.module.ts` (NEW)

**Role:** module
**Analog:** `apps/backend/src/modules/propiedades/propiedades.module.ts` (líneas 1-10)

**Patrón NestJS module mínimo** (líneas 1-10):
```typescript
import { Module } from '@nestjs/common'
import { PropiedadesController } from './propiedades.controller'
import { PropiedadesService } from './propiedades.service'

@Module({
  controllers: [PropiedadesController],
  providers: [PropiedadesService],
  exports: [PropiedadesService],
})
export class PropiedadesModule {}
```

**Notas:**
- Copiar exactamente, cambiar nombres: `TemplatesController`, `TemplatesService`, `TemplatesModule`.
- Exportar `TemplatesService` por si `ArticulosModule` lo necesita en Phase 32.

---

### `apps/backend/src/modules/templates/templates.controller.ts` (NEW)

**Role:** controller, request-response
**Analog:** `apps/backend/src/modules/webhooks/webhooks.controller.ts` (líneas 1-77)

**Patrón controller con RBAC y CRUD** (líneas 1-50):
```typescript
import {
  Controller, Get, Post, Patch, Param, Body,
  HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common'
import { WebhooksService } from './webhooks.service'
import { CreateWebhookDto } from './dto/create-webhook.dto'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('webhooks')
@UseGuards(RolesGuard)
@Roles('admin')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get()
  findAll() { return this.webhooksService.findAll() }

  @Get(':id')
  findOne(@Param('id') id: string) { return this.webhooksService.findOne(+id) }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWebhookDto) { return this.webhooksService.create(dto) }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWebhookDto) {
    return this.webhooksService.update(+id, dto)
  }
}
```

**Notas:**
- Rutas del controller de templates:
  - `GET /templates` — lista templates (admin + viewer)
  - `GET /templates/:id` — detalle con atributos (admin + viewer)
  - `POST /templates` — crear template (solo admin)
  - `PATCH /templates/:id` — editar template (solo admin)
  - `GET /templates/:id/atributos` — lista atributos del template
  - `PATCH /templates/:id/atributos` — reemplazar lista completa (upsert, solo admin)
- Para reads abiertos a viewer: ver patrón de `propiedades.controller.ts` que aplica `@UseGuards(RolesGuard)` + `@Roles('admin')` solo en los métodos write, no en el controller completo.
- Auth JWT global via `CompositeAuthGuard` en `app.module.ts` — no declarar en este controller.

---

### `apps/backend/src/modules/templates/templates.service.ts` (NEW)

**Role:** service, CRUD
**Analog:** `apps/backend/src/modules/propiedades/propiedades.service.ts` (líneas 1-165)

**Patrón service con DrizzleService** (líneas 1-25):
```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq, asc } from 'drizzle-orm'
import { DrizzleService } from '../../db/index'
import { PROP_TABLES, PROP_LABELS, type PropTipo } from './propiedades.constants'

@Injectable()
export class PropiedadesService {
  constructor(private readonly drizzle: DrizzleService) {}
  // ...
}
```

**Patrón findAll con orderBy** (líneas 42-48):
```typescript
async findAll(tipo: PropTipo, opts: { activo?: boolean } = {}) {
  const table = this.tableFor(tipo)
  const query = this.drizzle.db.select().from(table)
  if (opts.activo !== undefined) {
    return query.where(eq(table.activo, opts.activo)).orderBy(asc(table.nombre))
  }
  return query.orderBy(asc(table.nombre))
}
```

**Patrón insert con .returning()** (líneas 57-69):
```typescript
async create(tipo: PropTipo, dto: CreatePropiedadDto) {
  const table = this.tableFor(tipo)
  const rows = await this.drizzle.db
    .insert(table)
    .values({ nombre: dto.nombre, abrev: dto.abrev })
    .returning()
  return rows[0]
}
```

**Notas:**
- Para `templates.service.ts`: las dos entidades son `articulosTemplates` y `templateAtributos`.
- El `findOne(id)` del template debe hacer JOIN con `templateAtributos` para retornar `{ ...template, atributos: [...] }`.
- El endpoint `PATCH /templates/:id/atributos` requiere lógica de upsert: DELETE todos los atributos del template + INSERT los nuevos (dentro de una transacción). Drizzle no tiene `upsert` con PK compuesta fácil — usar `DELETE WHERE template_id = id` + `INSERT ... VALUES [...]`.

---

### `apps/backend/src/modules/templates/dto/create-template.dto.ts` (NEW)

**Role:** dto, request-response
**Analog:** `apps/backend/src/modules/webhooks/dto/create-webhook.dto.ts` (líneas 1-16) + `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` (líneas 1-17)

**Patrón DTO con class-validator** (de `create-webhook.dto.ts:1-16`):
```typescript
import { IsString, IsUrl, IsArray, ArrayMinSize, IsIn } from 'class-validator'

export class CreateWebhookDto {
  @IsString()
  name!: string

  @IsArray()
  @ArrayMinSize(1)
  events!: string[]
}
```

**Patrón campo con Transform** (de `create-propiedad.dto.ts:4-9`):
```typescript
@IsString()
@IsNotEmpty()
@MaxLength(255)
@Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
nombre!: string
```

**Notas:**
- `CreateTemplateDto`: `nombre: string`, `descripcion?: string`.
- Crear también `CreateTemplateAtributoDto`: `atributoTipo: string`, `ordenNombre?: number | null`, `ordenSku?: number | null`, `esVariante?: boolean`, `customSlot?: number | null`.
- `UpdateTemplateDto`: partial de `CreateTemplateDto` (misma forma que `update-propiedad.dto.ts` — PartialType o campos opcionales manuales).

---

### `apps/backend/src/app.module.ts` (MODIFY)

**Role:** module registration
**Analog:** mismo archivo, líneas 1-51

**Patrón de registro de módulo** (líneas 13-14, 27-35):
```typescript
import { PropiedadesModule } from './modules/propiedades/propiedades.module'
// ...
@Module({
  imports: [
    // ...
    PropiedadesModule,
    // agregar TemplatesModule aquí
  ],
})
```

**Notas:**
- Agregar `import { TemplatesModule } from './modules/templates/templates.module'` al bloque de imports del archivo.
- Agregar `TemplatesModule` al array `imports` del `@Module` decorator, después de `PropiedadesModule`.

---

### `apps/backend/package.json` (MODIFY)

**Role:** config
**Analog:** mismo archivo, línea 24 (`"@objetiva/types": "workspace:*"`)

**Patrón workspace dependency** (línea 24):
```json
"@objetiva/types": "workspace:*",
```

**Notas:**
- Agregar `"@objetiva/utils": "workspace:*"` a `dependencies` (no `devDependencies`), inmediatamente después de `@objetiva/types`.
- PITFALL-5: sin esta línea el backend no resuelve `import from '@objetiva/utils'` en build.

---

### `packages/utils/src/composer.ts` (NEW)

**Role:** utility, transform (función pura)
**Analog:** `packages/utils/src/formatters.ts` (líneas 1-12) para la estructura del archivo

**Patrón función pura en utils** (de `formatters.ts:1-12`):
```typescript
export function formatCurrency(amount: number, currency = 'MXN', locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}
```

**Notas:**
- El archivo exporta 3 funciones puras: `stripSep`, `composeSku`, `composeNombre`.
- Los tipos `Template`, `TemplateAtributo`, `AtributosMap` se importan desde `@objetiva/types`.
- Sin side effects, sin deps externas (no instalar `slugify` — PITFALL-6).
- Implementación según RESEARCH.md §Technical Approach — Composer functions (funciones ya documentadas con código completo).

---

### `packages/utils/src/index.ts` (MODIFY)

**Role:** barrel export
**Analog:** mismo archivo, línea 1

**Patrón barrel** (línea 1):
```typescript
export * from './formatters'
```

**Notas:**
- Agregar `export * from './composer'` al final del archivo.

---

### `packages/types/src/template.ts` (NEW)

**Role:** types
**Analog:** `packages/types/src/index.ts` (líneas 1-41, interfaces y tipos existentes)

**Patrón de tipos exportados** (de `packages/types/src/index.ts:1-5`):
```typescript
import { z } from 'zod'

// App role type for RBAC
export type AppRole = 'admin' | 'viewer'
```

**Notas:**
- Archivo nuevo con solo tipos (sin Zod, sin lógica):
  ```typescript
  export interface TemplateAtributo {
    atributoTipo: string
    ordenNombre: number | null
    ordenSku: number | null
    esVariante: boolean
    customSlot: number | null
  }
  export interface Template {
    id: number
    nombre: string
    atributos: TemplateAtributo[]
  }
  export type AtributosMap = Record<string, string | undefined>
  ```
- No importar `zod` en este archivo — tipos puros únicamente.

---

### `packages/types/src/index.ts` (MODIFY)

**Role:** barrel export
**Analog:** mismo archivo

**Notas:**
- Agregar al final: `export * from './template'`.
- El archivo ya tiene `export type AppRole` y funciones Zod — no tocar esas secciones.

---

### `apps/web/src/lib/composer.test.ts` (NEW)

**Role:** test, unit
**Analog:** `apps/web/src/lib/abrev.test.ts` (líneas 1-57) — patrón canónico exacto

**Patrón test de función pura con Vitest** (líneas 1-20):
```typescript
import { describe, it, expect } from 'vitest'
import { suggestAbrev } from './abrev'

/**
 * Tests para `suggestAbrev` (Phase 29 - RED phase).
 *
 * Esta suite se escribe ANTES de la implementacion `abrev.ts` (TDD strict).
 * Cubre los 9 casos del research (Pattern 6) + 1 caso de cap-test
 */
describe('suggestAbrev', () => {
  it('takes first 4 ASCII chars uppercase from a simple word', () => {
    expect(suggestAbrev('Shimano')).toBe('SHIM')
  })
  // ...
})
```

**Notas:**
- Los tests importan desde `@objetiva/utils` (no desde path relativo a `packages/`) — verificar que el alias esté resuelto en `vitest.config.ts`. Si no, importar temporalmente con alias relativo `'../../../../packages/utils/src/composer'` o configurar el alias.
- Los 8 casos de borde a cubrir están documentados en `30-RESEARCH.md §Casos de borde críticos para el composer`.
- Un `describe('composeSku', ...)` y otro `describe('composeNombre', ...)` + `describe('stripSep', ...)`.
- Seguir el comentario de cabecera explicando qué phase y qué requirements cubre la suite.
- Framework: Vitest 2.1.9, `environment: 'node'` (configurado en `apps/web/vitest.config.ts:12`).

---

### `apps/web/src/types/propiedad.ts` (MODIFY)

**Role:** types + copy helpers
**Analog:** mismo archivo, líneas 11-87

**Patrón `PROP_TIPOS` array** (línea 11):
```typescript
export const PROP_TIPOS = ['marca', 'color', 'talle', 'material', 'presentacion', 'objeto'] as const
```

**Patrón `PROP_LABELS` con gender** (líneas 27-37):
```typescript
export const PROP_LABELS: Record<
  PropTipo,
  { singular: string; plural: string; gender: 'f' | 'm' }
> = {
  marca: { singular: 'Marca', plural: 'Marcas', gender: 'f' },
  color: { singular: 'Color', plural: 'Colores', gender: 'm' },
  // ...
}
```

**Patrón `PROP_NOMBRE_PLACEHOLDERS`** (líneas 80-87):
```typescript
export const PROP_NOMBRE_PLACEHOLDERS: Record<PropTipo, string> = {
  marca: 'Ej: Shimano',
  // ...
}
```

**Notas:**
- Agregar `'familia'` y `'aplicacion'` al array `PROP_TIPOS` (al final).
- Agregar a `PROP_LABELS`:
  - `familia: { singular: 'Familia', plural: 'Familias', gender: 'f' }`
  - `aplicacion: { singular: 'Aplicación', plural: 'Aplicaciones', gender: 'f' }`
- Agregar a `PROP_NOMBRE_PLACEHOLDERS`:
  - `familia: 'Ej: Amortiguadores delanteros'`
  - `aplicacion: 'Ej: Fiat Cronos 1.3 2020-2024'`
- La interfaz `Propiedad` (líneas 15-22) puede necesitar campo opcional `subcategoriaId?: number` para que `familia` rows lo porten — evalúa en la fase de implementación.
- La función `copyFor` (líneas 50-77) no requiere cambios — ya es genérica.

---

### `apps/web/src/components/propiedades/propiedad-table.tsx` (MODIFY)

**Role:** component, request-response
**Analog:** mismo archivo, líneas 31-269

**Patrón `PropiedadTableProps` actual** (líneas 31-33):
```typescript
export interface PropiedadTableProps {
  propTipo: PropTipo
}
```

**Patrón row render** (líneas 183-195):
```typescript
propiedades.map(p => (
  <TableRow key={p.id} className={p.activo ? '' : 'text-muted-foreground'}>
    <TableCell className="font-mono text-sm text-muted-foreground">{p.id}</TableCell>
    <TableCell className="font-medium text-sm">{p.nombre}</TableCell>
    <TableCell className="font-mono text-sm">{p.abrev}</TableCell>
    <TableCell>
      <Badge variant={p.activo ? 'default' : 'secondary'}>{p.activo ? 'Activo' : 'Inactivo'}</Badge>
    </TableCell>
    <TableCell className="text-right">...</TableCell>
  </TableRow>
))
```

**Notas:**
- Extender `PropiedadTableProps` con slot de columnas extra (Opción A del RESEARCH.md):
  ```typescript
  import type { ReactNode } from 'react'
  
  export interface ExtraColumn<T = Propiedad> {
    header: string
    cell: (row: T) => ReactNode
    className?: string
  }
  
  export interface PropiedadTableProps {
    propTipo: PropTipo
    extraColumns?: ExtraColumn[]
  }
  ```
- En el `<TableHeader>` agregar las `<TableHead>` de `extraColumns` antes de la columna "Estado".
- En el `<TableBody>` agregar las `<TableCell>` de `extraColumns` en las mismas posiciones.
- Los 6 tabs existentes no pasan `extraColumns` → comportamiento idéntico al actual (extensión backward-compatible).
- El tab "Familias" pasará `extraColumns={[{ header: 'Subcategoría', cell: row => row.subcategoriaNombre ?? '—' }]}`.

---

### `apps/web/src/components/propiedades/propiedad-create-dialog.tsx` (MODIFY)

**Role:** component, request-response
**Analog:** mismo archivo, líneas 1-193

**Patrón `PropiedadCreateDialogProps`** (líneas 46-56):
```typescript
export interface PropiedadCreateDialogProps {
  propTipo: PropTipo
  onCreated?: (created: Propiedad) => void
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}
```

**Patrón campo de formulario con FormField** (líneas 143-155):
```typescript
<FormField
  control={form.control}
  name="nombre"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Nombre</FormLabel>
      <FormControl>
        <Input placeholder={PROP_NOMBRE_PLACEHOLDERS[propTipo]} {...field} />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Notas:**
- Agregar slot de campos extra en `PropiedadCreateDialogProps`:
  ```typescript
  extraFields?: ReactNode   // se renderiza entre "abrev" y DialogFooter
  ```
- El dialog de Familias inyectará un `<Select>` de subcategorías vía `extraFields`.
- El Zod schema base (`nombre` + `abrev`) no cambia. El campo `parentId` será manejado por el componente padre que envuelve el dialog (o via `extraFields` con su propio estado).
- Alternativamente la lógica del select de subcategoria puede vivir en una página de familias dedicada que componga `<PropiedadCreateDialog extraFields={<SubcategoriaSelect .../>} />`.

---

## Shared Patterns

### Auth / RBAC en controllers NestJS

**Fuente:** `apps/backend/src/modules/propiedades/propiedades.controller.ts:18-19, 61-67`
**Aplicar a:** `templates.controller.ts`

```typescript
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

// En métodos write:
@UseGuards(RolesGuard)
@Roles('admin')
@Post(':tipo')
create(...) { ... }
```

JWT global via `CompositeAuthGuard` en `app.module.ts` — no declarar en controllers individuales.

---

### Error handling en services NestJS

**Fuente:** `apps/backend/src/modules/propiedades/propiedades.service.ts:65-68, 82-87`
**Aplicar a:** `templates.service.ts`

```typescript
// NotFoundException para ID no encontrado:
if (!rows[0]) {
  throw new NotFoundException(`Template con ID ${id} no encontrado`)
}

// ConflictException para UNIQUE violations — detectar SQLSTATE 23505:
const pgError = (error as Record<string, unknown>)?.cause ?? error
if ((pgError as Record<string, unknown>).code === '23505') {
  throw new ConflictException(`Ya existe un template con ese nombre`)
}
```

---

### Drizzle query pattern

**Fuente:** `apps/backend/src/modules/propiedades/propiedades.service.ts:42-55`
**Aplicar a:** `templates.service.ts`

```typescript
const rows = await this.drizzle.db
  .select()
  .from(articulosTemplates)
  .where(eq(articulosTemplates.activo, true))
  .orderBy(asc(articulosTemplates.nombre))
```

Siempre `.returning()` en INSERT y UPDATE para evitar un SELECT de confirmación separado.

---

### Schema index pattern con expresión lower()

**Fuente:** `apps/backend/src/db/schema.ts:512-534`
**Aplicar a:** `propFamilia` en `schema.ts`

```typescript
function lower(col: AnyPgColumn) {
  return sql`lower(${col})`
}
const ABREV_REGEX_SQL = sql`abrev ~ '^[A-Z0-9]{1,8}$'`

// En pgTable tercer argumento:
uniqueIndex('prop_familia_nombre_lower_uniq').on(table.subcategoriaId, lower(table.nombre)),
```

Los nombres de índice DEBEN ser explícitos (no auto-generados) para evitar error de drizzle-kit al regenerar.

---

### Migration SQL patrón de aplicación segura

**Fuente:** `apps/backend/drizzle/0006_categorias_subcategorias.sql:8` + operativo 2026-05-15

```bash
# Siempre:
psql --single-transaction --set ON_ERROR_STOP=1 -f 0008_phase30_templates.sql
```

Pre-flight (ejecutar ANTES en prod):
```sql
SELECT COUNT(*) FROM articulos
WHERE rubro IS NOT NULL OR subrubro IS NOT NULL OR adjetivo IS NOT NULL
   OR prop_aux_1 IS NOT NULL OR prop_aux_2 IS NOT NULL
   OR prop_aux_3 IS NOT NULL OR prop_aux_4 IS NOT NULL OR prop_aux_5 IS NOT NULL;
-- Debe devolver 0. Si no, ABORTAR.
```

---

### Vitest test de función pura

**Fuente:** `apps/web/src/lib/abrev.test.ts:1-57`
**Aplicar a:** `apps/web/src/lib/composer.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { stripSep, composeSku, composeNombre } from '@objetiva/utils'  // o path relativo

describe('stripSep', () => {
  it('removes hyphens from codigo', () => {
    expect(stripSep('AMOR-001')).toBe('AMOR001')
  })
})
```

Comando de ejecución: `cd apps/web && pnpm test`.

---

## No Analog Found

Ningún archivo queda sin analog — todos los patrones existen en el codebase. Los archivos más "nuevos" (módulo `templates`) tienen analog funcional en `webhooks` (estructura) y `propiedades` (query pattern).

---

## Metadata

**Scope de búsqueda de analogs:** `apps/backend/src/`, `apps/web/src/`, `packages/utils/src/`, `packages/types/src/`, `apps/backend/drizzle/`
**Archivos leídos como fuente:** 22
**Fecha de extracción:** 2026-05-16
