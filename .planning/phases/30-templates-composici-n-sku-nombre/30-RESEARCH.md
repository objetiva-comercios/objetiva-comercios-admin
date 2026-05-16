# Phase 30: Templates + Composición SKU/Nombre - Research

**Researched:** 2026-05-16
**Domain:** Drizzle ORM schema + migrations PostgreSQL, NestJS modular CRUD, composer functions, Vitest unit testing
**Confidence:** HIGH (todo verificado contra codebase real; Drizzle confirmado vía Context7)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01** Las 6 propiedades fijas con catálogo se mantienen exactamente como en Phase 29.
- **D-02** `modelo` y `medida` continúan como TEXT libre en `articulos` (sin tabla catálogo).
- **D-03** DROP COLUMN `articulos.rubro`, `articulos.subrubro`, `articulos.adjetivo` y `articulos.prop_aux_1..5`. Verificado: 0 filas con valor no-null entre los 101.021 artículos. Sin migración de datos.
- **D-04** `calificador` NO entra al modelo.
- **D-05** Jerarquía 3 niveles fijos: `categoria → subcategoria → familia`. Phase 30 agrega `prop_familia`.
- **D-06** Naming del 3er nivel = `familia`.
- **D-07** Columnas cacheadas en `articulos`: `familia`, `custom_1`, `custom_2`, `custom_3` (TEXT, nullable). Sin FK estructural desde `articulos` todavía.
- **D-08** UNIQUE compuesto `(subcategoria_id, lower(nombre))` y `(subcategoria_id, abrev)` en `prop_familia`.
- **D-09** 3 slots fijos en `articulos` para propiedades custom del rubro: `custom_1`, `custom_2`, `custom_3`.
- **D-10** Mapping slot → tabla es POR TEMPLATE, no global.
- **D-11** Set inicial tablas custom v1 = solo `prop_aplicacion`.
- **D-12** `prop_aplicacion` sigue el factory genérico de Phase 29.
- **D-13** 1 template default en seed. Schema `articulos_templates` + `template_atributos`. NO TemplateBuilder UI.
- **D-14** Receta nombre default: `[objeto, marca, modelo, medida, custom_1]`. Atributos vacíos se omiten.
- **D-15** Receta SKU default = `[]`. SKU default = `stripSep(codigo)`.
- **D-16** `composeSku(codigo, atributos, template)` función pura testeada.
- **D-17** `composeNombre(atributos, template)` función pura testeada.
- **D-18** Flag `nombre_auto` por artículo se difiere a Phase 32.

### Claude's Discretion

- Naming exacto de columnas (`custom_1` vs `custom_slot_1`) — convención repo manda.
- Forma exacta de la migration DROP (orden de DROPs, transacción única o múltiple).
- Si el template default se inserta como SQL inline en la migration o como script TS separado.
- Estructura interna del backend para el composer (carpeta `templates/`, `composer/`, etc.).

### Deferred Ideas (OUT OF SCOPE)

- TemplateBuilder UI visual con drag-drop.
- `prop_modelo`, `prop_medida` como tablas catálogo.
- `prop_lado`, `prop_anio` como tablas custom.
- Calificador / adjetivo libre.
- Cableado del `ArticuloForm` con autocomplete → Phase 32.
- Rediseño UX de `/propiedades` → Phase 32.
- Trigger AFTER UPDATE que sincroniza `articulos.<prop>` → Phase 31.
- Vehículos compatibles / fitment.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TPL-01 | Admin puede crear y editar templates que definen qué atributos aplican a un grupo de artículos | Schema `articulos_templates` + `template_atributos` + CRUD endpoints NestJS |
| TPL-02 | Admin puede marcar atributos como "variante" o "no-variante" | Columna `es_variante BOOLEAN` en `template_atributos` |
| TPL-03 | Admin puede definir cuáles atributos componen el SKU y en qué orden | Columna `orden_sku INT NULL` en `template_atributos` |
| TPL-04 | Admin puede definir cuáles atributos componen el nombre auto y en qué orden | Columna `orden_nombre INT NULL` en `template_atributos` |
| TPL-05 | Sistema usa el template default automáticamente al crear un artículo | Seed con 1 template default + `articulos.template_id FK` nullable |
</phase_requirements>

---

## Summary

Phase 30 cierra 3 arcos paralelos: (a) termina la taxonomía jerárquica agregando `prop_familia`; (b) crea `articulos_templates` + `template_atributos` + `prop_aplicacion` como nuevas tablas; (c) limpia 8 columnas legacy de `articulos`. Todo esto se ejecuta como una migration SQL manual numerada `0008`. Simultáneamente, el backend obtiene 2 tipos nuevos en `PROP_TIPOS` (`familia`, `aplicacion`) y un módulo `templates` nuevo para el CRUD, y el frontend agrega 2 tabs en `/propiedades`.

Las funciones puras `composeSku()` y `composeNombre()` son el otro entregable clave. Dada la ausencia de framework de tests en `apps/backend` (no hay Jest ni Vitest configurado), la suite de tests vive en `apps/web` donde Vitest ya existe y la función puede ubicarse en `packages/utils` para consumo compartido.

El riesgo principal es la sincronización del schema TS con la migration SQL. El patrón del repo (confirmado en el incidente 2026-05-15) es: escribir migration SQL + actualizar `schema.ts` + registrar en `_journal.json` en el MISMO commit. Desacoplar estos tres pasos produce drift silencioso que rompe queries con 500.

**Primary recommendation:** Entregar todo en una sola migration `0008_phase30_templates.sql` que: crea las 3 tablas nuevas, agrega 4 columnas a `articulos`, dropea 8 columnas legacy, e inserta el seed del template default. Sincronizar `schema.ts` y `_journal.json` en el mismo commit.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Schema nuevas tablas (`prop_familia`, `articulos_templates`, `template_atributos`, `prop_aplicacion`) | Database / Migration | Backend (schema.ts) | Las tablas son la fuente de verdad; schema.ts es espejo TS |
| DROP columnas legacy `articulos` | Database / Migration | Backend (schema.ts) | Operación DDL pura, reflejo en schema.ts obligatorio |
| Seed template default | Database / Migration | — | Datos iniciales requeridos por lógica de negocio |
| CRUD `prop_familia` | API / Backend | Frontend tab | Factory genérico existente, solo agregar tipo al enum |
| CRUD `prop_aplicacion` | API / Backend | Frontend tab | Igual que prop_familia pero factory puro sin FK extra |
| CRUD templates + template_atributos | API / Backend | Frontend (futuro) | Nuevo módulo NestJS, UI diferida |
| `composeSku()` + `composeNombre()` | `packages/utils` (shared) | Backend (consume), Frontend (consume en Phase 32) | Función pura sin side effects; debe estar disponible en ambos tierras |
| Tab "Familias" en `/propiedades` | Frontend Server (Next.js) | — | Configura select de subcategoria como columna extra, requiere variante del componente |
| Tab "Aplicaciones" en `/propiedades` | Frontend Server (Next.js) | — | Config estándar, 10 LOC |

---

## Domain Research

### 1. Drizzle ORM — UNIQUE compuesto con expresión `lower()`

El patrón ya está en uso en el codebase en `propSubcategoria` (`schema.ts` línea 562):

```typescript
uniqueIndex('prop_subcategoria_nombre_lower_uniq').on(table.categoriaId, lower(table.nombre)),
uniqueIndex('prop_subcategoria_abrev_uniq').on(table.categoriaId, table.abrev),
```

`[VERIFIED: Context7 /drizzle-team/drizzle-orm-docs]` — Drizzle soporta `uniqueIndex('nombre').on(col1, lower(col2))` donde `lower()` es `sql\`lower(${col})\`` tipado como `AnyPgColumn → SQL`. El índice se genera como `CREATE UNIQUE INDEX ... USING btree ("col1", lower("col2"))`. **Regla crítica del repo**: el índice con expresión DEBE llevar nombre explícito (no auto-generado), de lo contrario drizzle-kit lanza error al regenerar.

Para `prop_familia` el patrón es idéntico a `propSubcategoria` con `subcategoriaId` en lugar de `categoriaId`.

### 2. CHECK constraint en Drizzle

El patrón está en uso: `check('prop_familia_abrev_format_chk', ABREV_REGEX_SQL)` donde `ABREV_REGEX_SQL = sql\`abrev ~ '^[A-Z0-9]{1,8}$'\``. `[VERIFIED: codebase schema.ts línea 516-532]`

Para tablas con FK (`prop_familia`) el `check()` se incluye en el tercer argumento de `pgTable` igual que en las tablas base.

### 3. FK en Drizzle ORM

```typescript
subcategoriaId: integer('subcategoria_id')
  .notNull()
  .references(() => propSubcategoria.id, { onDelete: 'restrict' }),
```
`[VERIFIED: codebase schema.ts línea 551-554]` — patrón idéntico al que usa `propSubcategoria` con `propCategoria`.

### 4. Composite PRIMARY KEY en `template_atributos`

```typescript
}, table => [
  primaryKey({ columns: [table.templateId, table.atributoTipo] }),
  ...
])
```
`[VERIFIED: Context7 /drizzle-team/drizzle-orm-docs]` — `primaryKey({ columns: [...] })` en tercer argumento array de `pgTable`. Genera `PRIMARY KEY (template_id, atributo_tipo)`.

### 5. Migration manual — patrón del repo

El repo usa migrations SQL manuales escritas a mano (NO generadas con `pnpm db:generate` para cambios estructurales complejos). `[VERIFIED: archivos 0006_*.sql, 0007_*.sql]`

Flujo establecido (operativo 2026-05-15):
1. Escribir `drizzle/NNNN_nombre.sql` con `ALTER TABLE ... ADD/DROP COLUMN IF EXISTS` y `CREATE TABLE IF NOT EXISTS`
2. Aplicar: `psql --single-transaction --set ON_ERROR_STOP=1 -f NNNN_nombre.sql`
3. Registrar en `_journal.json` con `idx: N`, `tag: "NNNN_nombre"`, `when: <timestamp>`
4. Actualizar `__drizzle_migrations` en la DB (INSERT INTO)
5. Sincronizar `schema.ts` en el MISMO commit

La próxima migration es `0008_phase30_templates.sql` (idx=8).

El script `pnpm db:generate` genera automáticamente cuando el schema TS cambia, pero para esta migration la estrategia es inversa: SQL primero → schema.ts segundo. Esto evita que drizzle-kit interprete los DROPs como destructivos y haga `DROP TABLE` en lugar de `DROP COLUMN`.

### 6. DROP COLUMN masivo seguro

Patrón de `0007_drop_sector_id_huerfana.sql`:
```sql
ALTER TABLE "inventarios_articulos" DROP COLUMN IF EXISTS "sector_id";
```
`[VERIFIED: codebase]` — `IF EXISTS` hace el statement idempotente.

Para Phase 30, los 8 DROPs se agrupan en la misma migration dentro de una sola transacción:
```sql
-- Dentro de BEGIN; ... COMMIT; (--single-transaction lo maneja psql)
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "rubro";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "subrubro";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "adjetivo";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_1";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_2";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_3";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_4";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_5";
```
Pre-validación de seguridad (ejecutar ANTES de aplicar en prod):
```sql
SELECT COUNT(*) FROM articulos
WHERE rubro IS NOT NULL OR subrubro IS NOT NULL OR adjetivo IS NOT NULL
   OR prop_aux_1 IS NOT NULL OR prop_aux_2 IS NOT NULL OR prop_aux_3 IS NOT NULL
   OR prop_aux_4 IS NOT NULL OR prop_aux_5 IS NOT NULL;
-- Debe devolver 0. Si no, ABORTAR.
```

### 7. Framework de tests — solo Vitest en `apps/web`

`[VERIFIED: codebase]`
- `apps/backend/package.json`: NO tiene `jest`, `vitest`, ni script `test`. El backend NO tiene infraestructura de tests.
- `apps/web/vitest.config.ts`: Vitest 2.1.9 configurado, `environment: 'node'`, `include: ['src/**/*.{test,spec}.{ts,tsx}']`.
- Tests existentes: `apps/web/src/lib/abrev.test.ts` (pura, sin DOM), `apps/web/src/components/propiedades/propiedad-create-dialog.test.tsx`.

**Conclusión:** Las funciones puras `composeSku()` y `composeNombre()` deben ubicarse en `packages/utils/src/composer.ts` para ser testeadas desde `apps/web` (Vitest ya disponible) y consumidas desde `apps/backend` (CommonJS compatible via `./dist`).

El package `@objetiva/utils` ya está en `dependencies` de `apps/web` y `apps/backend` usa `@objetiva/types`. **Se deberá agregar `@objetiva/utils` a `apps/backend/package.json`** cuando el backend consuma el composer.

### 8. `slugify` — estado en el repo

`[VERIFIED: codebase, STACK.md]` — `slugify ^1.6.x` está reservado en STACK.md para Phase 30 pero NO instalado aún (`grep -r "slugify"` devuelve vacío en apps/ y packages/). Solo aplica para propiedades text-libre marcadas como variante; el template default tiene receta SKU vacía (`[]`), por lo que la instalación de `slugify` puede diferirse a Phase 32 cuando se active el primer rubro con variantes text-libre. Phase 30 NO lo necesita.

### 9. Seed del template default — patrón en el repo

`seed.ts` usa `TRUNCATE ... RESTART IDENTITY CASCADE` al inicio — destructivo, no idempotente. Para datos de configuración del sistema (template default) que no deben borrarse con seed de desarrollo, el patrón correcto es **INSERT INTO ... ON CONFLICT DO NOTHING** dentro del SQL de migration `0008`, no en `seed.ts`.

```sql
-- Al final de la migration 0008, después de crear las tablas:
INSERT INTO articulos_templates (nombre, descripcion, activo)
VALUES ('default', 'Template automotor por defecto', true)
ON CONFLICT (nombre) DO NOTHING;

-- Registrar template_atributos del template default
INSERT INTO template_atributos (template_id, atributo_tipo, orden_nombre, orden_sku, es_variante)
SELECT id, 'objeto',  1, NULL, false FROM articulos_templates WHERE nombre = 'default'
ON CONFLICT DO NOTHING;
-- ... mismo patrón para marca, modelo, medida, custom_1
```

Esto garantiza idempotencia: re-correr la migration no duplica el seed.

### 10. Frontend — `PropiedadesPage` con tabs extensibles

`[VERIFIED: codebase propiedades-page.tsx]`

La página itera `PROP_TIPOS` y `PROP_LABELS` para generar tabs dinámicamente. Agregar `familia` y `aplicacion` requiere:
1. Actualizar `PROP_TIPOS` en `apps/web/src/types/propiedad.ts` (agregar los 2 nuevos al array `as const`)
2. Agregar entradas en `PROP_LABELS` con gender correcto (`familia` → 'f', `aplicacion` → 'f')
3. Agregar placeholders en `PROP_NOMBRE_PLACEHOLDERS`

**Problema crítico: tab Familias necesita columna extra (select de subcategoria)**

`PropiedadTable` asume shape fijo `{ id, nombre, abrev, activo, createdAt, updatedAt }`. `prop_familia` tiene además `subcategoria_id` que el admin necesita ver/editar. Las opciones son:

**Opción A (recomendada):** Extender `PropiedadTable` con props opcionales: `extraColumns?: ExtraColumn[]` y `extraFormFields?: ExtraField[]`. Esto mantiene el componente genérico sin duplicación.

**Opción B:** Crear `FamiliaTable` como variante especializada (mayor duplication, Pattern Code Review 29-REVIEW warning sobre "sin slots para campos extra").

El 29-REVIEW menciona explícitamente que `PropiedadCreateDialog` y `PropiedadTable` "no tienen slot para campos extra" como un WARNING. Phase 30 DEBE resolver esto, y la Opción A es la menos invasiva.

**Backend: `prop_familia` necesita campo `subcategoria_id` en DTO**

El `CreatePropiedadDto` actual tiene solo `nombre` + `abrev`. Para `familia` se necesita también `subcategoriaId: number`. Opciones:

- Opción A: DTO extendido `CreateFamiliaDto extends CreatePropiedadDto` + override del endpoint `POST /propiedades/familia` con lógica especializada en el service.
- Opción B: `CreatePropiedadDto` con campo opcional `parentId?: number` que el service usa según el tipo.

La Opción B es más limpia para el pattern genérico. El service puede detectar `tipo === 'familia'` y validar que `parentId` esté presente.

---

## Technical Approach

### Schema Drizzle (`schema.ts`)

**`prop_familia`** — no puede usar `definePropTable` (necesita FK extra). Usar `pgTable` custom siguiendo el patrón de `propSubcategoria`:

```typescript
export const propFamilia = pgTable(
  'prop_familia',
  {
    id: serial('id').primaryKey(),
    subcategoriaId: integer('subcategoria_id')
      .notNull()
      .references(() => propSubcategoria.id, { onDelete: 'restrict' }),
    nombre: text('nombre').notNull(),
    abrev: text('abrev').notNull(),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    uniqueIndex('prop_familia_nombre_lower_uniq').on(table.subcategoriaId, lower(table.nombre)),
    uniqueIndex('prop_familia_abrev_uniq').on(table.subcategoriaId, table.abrev),
    check('prop_familia_abrev_format_chk', ABREV_REGEX_SQL),
    index('prop_familia_subcategoria_id_idx').on(table.subcategoriaId),
    index('prop_familia_activo_idx').on(table.activo),
  ]
)
```

**`prop_aplicacion`** — usa `definePropTable` directamente (shape idéntico a las 6 de Phase 29):

```typescript
export const propAplicacion = definePropTable('prop_aplicacion', 'prop_aplicacion')
```

**`articulos_templates`**:

```typescript
export const articulosTemplates = pgTable(
  'articulos_templates',
  {
    id: serial('id').primaryKey(),
    nombre: text('nombre').notNull().unique(),
    descripcion: text('descripcion'),
    activo: boolean('activo').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    index('articulos_templates_activo_idx').on(table.activo),
  ]
)
```

**`template_atributos`** — PK compuesta `(template_id, atributo_tipo)`:

```typescript
export const templateAtributos = pgTable(
  'template_atributos',
  {
    templateId: integer('template_id')
      .notNull()
      .references(() => articulosTemplates.id, { onDelete: 'cascade' }),
    atributoTipo: text('atributo_tipo').notNull(),
    ordenNombre: integer('orden_nombre'),    // NULL = no aparece en nombre
    ordenSku: integer('orden_sku'),          // NULL = no aparece en SKU
    esVariante: boolean('es_variante').notNull().default(false),
    customSlot: smallint('custom_slot'),     // NULL si no es custom; 1, 2 o 3 si lo es
  },
  table => [
    primaryKey({ columns: [table.templateId, table.atributoTipo] }),
    index('template_atributos_template_id_idx').on(table.templateId),
  ]
)
```

Nota: `smallint` no está importado actualmente en `schema.ts` — se deberá agregar al import de `drizzle-orm/pg-core`. Alternativa: usar `integer` para evitar el import extra (rango 1-3 no justifica `smallint`). `[ASSUMED]` — revisar convención del repo; las columnas pequeñas usan `integer` actualmente.

**Columnas nuevas en `articulos`** (ADD):

```typescript
// en la definición de pgTable articulos:
familia: text('familia'),
templateId: integer('template_id')
  .references(() => articulosTemplates.id, { onDelete: 'set null' }),
custom1: text('custom_1'),
custom2: text('custom_2'),
custom3: text('custom_3'),
```

**Columnas a ELIMINAR de `schema.ts`** (líneas 198-200, 211-215):
- `rubro`, `subrubro`, `adjetivo`, `propAux1`, `propAux2`, `propAux3`, `propAux4`, `propAux5`

### Migration SQL `0008_phase30_templates.sql`

Estructura completa sugerida:

```sql
-- Migration 0008: Phase 30 - Templates + Composición SKU/Nombre
-- Incluye: prop_familia, prop_aplicacion, articulos_templates, template_atributos,
--          ADD columnas familia/template_id/custom_1/2/3 a articulos,
--          DROP columnas legacy rubro/subrubro/adjetivo/prop_aux_1..5,
--          Seed template default automotor.
--
-- Pre-flight: verificar que las 8 columnas legacy tienen 0 filas no-null.
-- Aplicar: psql --single-transaction --set ON_ERROR_STOP=1 -f 0008_phase30_templates.sql

-- 1. Tablas nuevas
CREATE TABLE "prop_familia" (...);
CREATE TABLE "prop_aplicacion" (...);
CREATE TABLE "articulos_templates" (...);
CREATE TABLE "template_atributos" (...);

-- 2. ADD columnas en articulos
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "familia" text;
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES articulos_templates(id) ON DELETE SET NULL;
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_1" text;
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_2" text;
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_3" text;

-- 3. DROP columnas legacy (0 datos perdidos confirmado)
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "rubro";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "subrubro";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "adjetivo";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_1";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_2";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_3";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_4";
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_5";

-- 4. Índices (separados con --> statement-breakpoint para compatibilidad drizzle)
CREATE UNIQUE INDEX "prop_familia_nombre_lower_uniq" ...;
-- ...

-- 5. Seed template default (idempotente)
INSERT INTO articulos_templates ...  ON CONFLICT DO NOTHING;
INSERT INTO template_atributos ...  ON CONFLICT DO NOTHING;
```

### Composer functions — ubicación: `packages/utils/src/composer.ts`

**Justificación:**
- `apps/web` ya depende de `@objetiva/utils` (confirmado en package.json)
- `apps/backend` puede agregar `@objetiva/utils` a sus dependencies fácilmente
- Tests viven en `apps/web/src/lib/composer.test.ts` (Vitest configurado)
- La función NO tiene side effects ni deps externas — encaja perfectamente en utils

**Tipos compartidos** (`packages/types/src/index.ts` o nuevo archivo `packages/types/src/template.ts`):

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

**`composeSku(codigo, atributos, template)`:**

```typescript
// packages/utils/src/composer.ts
export function stripSep(codigo: string): string {
  return codigo.replace(/[-_.\s]+/g, '')
}

export function composeSku(
  codigo: string,
  atributos: AtributosMap,
  template: Template
): string {
  const variantes = template.atributos
    .filter(a => a.esVariante && a.ordenSku !== null)
    .sort((a, b) => (a.ordenSku ?? 0) - (b.ordenSku ?? 0))

  if (variantes.length === 0) {
    return stripSep(codigo)
  }

  const partes = variantes
    .map(a => atributos[a.atributoTipo])
    .filter(Boolean) as string[]

  return stripSep(codigo) + (partes.length > 0 ? '-' + partes.join('-') : '')
}
```

**`composeNombre(atributos, template)`:**

```typescript
export function composeNombre(
  atributos: AtributosMap,
  template: Template
): string {
  return template.atributos
    .filter(a => a.ordenNombre !== null)
    .sort((a, b) => (a.ordenNombre ?? 0) - (b.ordenNombre ?? 0))
    .map(a => atributos[a.atributoTipo])
    .filter(Boolean)
    .join(' ')
}
```

### Backend — módulo `templates`

Nuevo módulo `apps/backend/src/modules/templates/` con:
- `templates.controller.ts` — CRUD `articulos_templates` y `template_atributos`
- `templates.service.ts`
- `templates.module.ts`
- `dto/create-template.dto.ts`, `dto/update-template.dto.ts`

Rutas sugeridas:
- `GET /templates` — lista templates activos
- `GET /templates/:id` — detalle con atributos
- `POST /templates` — crear template (admin)
- `PATCH /templates/:id` — editar template (admin)
- `GET /templates/:id/atributos` — lista atributos del template
- `PATCH /templates/:id/atributos` — reemplazar lista completa de atributos (upsert)

### Backend — agregar `familia` y `aplicacion` a `PROP_TIPOS`

En `apps/backend/src/modules/propiedades/propiedades.constants.ts`:

```typescript
export const PROP_TIPOS = [
  'marca', 'color', 'talle', 'material', 'presentacion', 'objeto',
  'familia', 'aplicacion',   // Phase 30
] as const
```

En `PROP_TABLES`:
```typescript
familia: propFamilia,
aplicacion: propAplicacion,
```

En `PROP_LABELS`:
```typescript
familia: { singular: 'familia', plural: 'familias' },
aplicacion: { singular: 'aplicación', plural: 'aplicaciones' },
```

**Problema: `prop_familia` necesita `subcategoria_id` en el `create`**

El `PropiedadesService.create()` actual pasa solo `{ nombre, abrev }` al INSERT. Para `familia` necesita también `subcategoriaId`. Estrategia: agregar `parentId?: number` al `CreatePropiedadDto` (opcional, validado como `@IsInt() @IsOptional()`) y en el service:

```typescript
async create(tipo: PropTipo, dto: CreatePropiedadDto) {
  const table = this.tableFor(tipo)
  const values: Record<string, unknown> = { nombre: dto.nombre, abrev: dto.abrev }
  if (tipo === 'familia') {
    if (!dto.parentId) throw new BadRequestException('subcategoria_id requerido para familia')
    values.subcategoriaId = dto.parentId
  }
  // ... resto igual
}
```

### Frontend — `apps/web/src/types/propiedad.ts`

Agregar al array `PROP_TIPOS`:
```typescript
export const PROP_TIPOS = [
  'marca', 'color', 'talle', 'material', 'presentacion', 'objeto',
  'familia', 'aplicacion',
] as const
```

Agregar a `PROP_LABELS`:
```typescript
familia: { singular: 'Familia', plural: 'Familias', gender: 'f' },
aplicacion: { singular: 'Aplicación', plural: 'Aplicaciones', gender: 'f' },
```

Agregar a `PROP_NOMBRE_PLACEHOLDERS`:
```typescript
familia: 'Ej: Amortiguadores delanteros',
aplicacion: 'Ej: Fiat Cronos 1.3 2020-2024',
```

### Frontend — Tab Familias con columna extra

`PropiedadTable` necesita extensión para renderizar `subcategoria_id` como columna extra. La solución mínima es un prop `extraColumns?: { header: string; cell: (row: PropiedadExtendida) => ReactNode }[]`. Esto permite que la página de familias inyecte la columna de subcategoría sin tocar el componente base.

El API client `fetchPropiedades` deberá retornar el campo `subcategoriaId` para filas de `familia` — el backend ya lo retorna vía `SELECT *` desde `propFamilia`.

---

## Code References

| Archivo | Líneas | Relevancia |
|---------|--------|-----------|
| `apps/backend/src/db/schema.ts` | 512-568 | `definePropTable` factory + `propSubcategoria` — plantilla exacta para `prop_familia` |
| `apps/backend/src/db/schema.ts` | 179-260 | Tabla `articulos` — columnas legacy a dropear (198-215) y dónde agregar las nuevas |
| `apps/backend/drizzle/0006_categorias_subcategorias.sql` | 1-38 | SQL exacto para replicar en `prop_familia` |
| `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql` | 1-7 | Patrón `DROP COLUMN IF EXISTS` |
| `apps/backend/drizzle/meta/_journal.json` | 1-53 | Next idx=8, timestamp a definir en la nueva entry |
| `apps/backend/src/modules/propiedades/propiedades.constants.ts` | 12-44 | `PROP_TIPOS` array + `PROP_TABLES` map + `PROP_LABELS` — agregar 2 entradas |
| `apps/backend/src/modules/propiedades/propiedades.service.ts` | 57-69 | `create()` — extender para `subcategoriaId` en tipo `familia` |
| `apps/backend/src/modules/propiedades/dto/create-propiedad.dto.ts` | 1-17 | DTO base — agregar `@IsInt() @IsOptional() parentId?: number` |
| `apps/web/src/types/propiedad.ts` | 11-87 | `PROP_TIPOS`, `PROP_LABELS`, `copyFor` — agregar `familia` y `aplicacion` |
| `apps/web/src/components/propiedades/propiedades-page.tsx` | 1-39 | Página tab — itera `PROP_TIPOS` dinámicamente, sin cambios en la página si se actualiza el array |
| `apps/web/src/components/propiedades/propiedad-table.tsx` | 31-34 | `PropiedadTableProps` — extender con `extraColumns?` |
| `apps/web/vitest.config.ts` | 1-18 | Vitest configurado, `environment: 'node'`, `include: 'src/**/*.{test,spec}.{ts,tsx}'` |
| `apps/web/src/lib/abrev.test.ts` | 1-57 | Ejemplo canónico de test de función pura en este repo |

---

## Risks & Pitfalls

### PITFALL-1: Schema TS y migration SQL desincronizados (CRITICAL)
**Qué pasa:** Si `schema.ts` dropea `rubro` pero la migration no se aplica aún, Drizzle intenta consultar la tabla sin esa columna y silenciosamente falla. O al revés: migration aplicada pero `schema.ts` todavía tiene el campo → Drizzle genera queries con columna inexistente y responde 500.
**Causa:** Operativo 2026-05-15 documentado en `feedback_schema_drift_silencioso.md`. Incidente real con `categoria/subcategoria`.
**Prevención:** Modificar `schema.ts` + escribir `0008_*.sql` + actualizar `_journal.json` en el MISMO commit. NUNCA en commits separados.

### PITFALL-2: DROP COLUMN con datos (CRITICAL solo si falla la verificación)
**Qué pasa:** Si hay una fila no-null en las 8 columnas legacy, se pierden datos permanentemente.
**Causa:** La verificación "0 filas non-null" fue confirmada al cerrar el CONTEXT (D-03), pero puede haber cambiado si se ingresaron datos entre esa fecha y la ejecución.
**Prevención:** Ejecutar el query de pre-flight (COUNT WHERE NOT NULL) justo antes de aplicar la migration en prod. Si devuelve > 0, ABORTAR y reportar.
**Regla de hierro:** Backup de la tabla `articulos` ANTES del DROP (dump selectivo).

### PITFALL-3: `definePropTable` no funciona para `prop_familia`
**Qué pasa:** Si se intenta usar `definePropTable('prop_familia', 'prop_familia')` directamente, la tabla NO tendrá el campo `subcategoria_id` ni la FK.
**Causa:** El factory solo genera shape mínimo `{id, nombre, abrev, activo, timestamps}`.
**Prevención:** Usar `pgTable()` custom siguiendo el patrón de `propSubcategoria` (schema.ts línea 548-568). No intentar extender el factory.

### PITFALL-4: Tests del composer en el lugar equivocado
**Qué pasa:** Si se escriben los tests de `composeSku()` y `composeNombre()` en `apps/backend`, no hay Vitest configurado y los tests no corren.
**Causa:** Backend no tiene framework de tests (`package.json` sin `test` script, sin jest/vitest config). Confirmado por búsqueda exhaustiva.
**Prevención:** Tests DEBEN ir en `apps/web/src/lib/composer.test.ts`. La implementación en `packages/utils/src/composer.ts`.

### PITFALL-5: `packages/utils` no está en `apps/backend/package.json`
**Qué pasa:** El backend importa `@objetiva/utils` pero la dependencia no está declarada → error de resolución en build.
**Causa:** `apps/backend/package.json` tiene `@objetiva/types` pero NO `@objetiva/utils` (confirmado).
**Prevención:** Agregar `"@objetiva/utils": "workspace:*"` a `dependencies` del backend en el mismo commit que introduce el import.

### PITFALL-6: `slugify` instalado innecesariamente en Phase 30
**Qué pasa:** STACK.md reserva `slugify` para Phase 30, pero el template default tiene receta SKU vacía (D-15) y no hay propiedades text-libre marcadas como variante. Instalar `slugify` ahora es scope creep.
**Causa:** Confundir "reservado para v1.3" con "requerido en Phase 30".
**Prevención:** NO instalar `slugify` en Phase 30. Solo se necesita cuando aparezca el primer template con variante text-libre (Phase 32 o posterior).

### PITFALL-7: `PROP_TIPOS` duplicado entre backend y frontend
**Qué pasa:** `PROP_TIPOS` existe en `apps/backend/src/modules/propiedades/propiedades.constants.ts` Y en `apps/web/src/types/propiedad.ts`. Al agregar `familia` y `aplicacion`, hay que actualizar LOS DOS ARCHIVOS.
**Causa:** Duplicación decidida en Phase 29 (no se compartió el enum entre tiers para evitar coupling). Ver `propiedades.constants.ts` comentario "Tipos canónicos".
**Prevención:** El planner debe crear tareas separadas para backend y frontend. Un checklist en la tarea de implementation.

### PITFALL-8: `is_default` no necesita UNIQUE filtrado
**Qué pasa:** En el schema de `articulos_templates` se podría tentar agregar `is_default BOOLEAN` con UNIQUE parcial `WHERE is_default = true` para evitar dos templates default.
**Causa:** La decisión D-13 dice "1 template default insertado en seed" sin flag `is_default`. El sistema resuelve "cuál es el default" por seed/código, no por constraint.
**Prevención:** NO agregar columna `is_default`. El template default se identifica por `nombre = 'default'` o por `id = 1`. Si se necesita selección dinámica de default, se aborda en una phase posterior.

### PITFALL-9: Tab Familias sin select de subcategoria → UX rota
**Qué pasa:** Si el tab Familias se agrega con `PropiedadTable` genérico sin extensión, el admin no puede ver ni asignar la subcategoria al crear una familia. El campo `subcategoria_id` es NOT NULL en la tabla.
**Causa:** `PropiedadCreateDialog` y `PropiedadTable` no tienen slot para campos extra (warning levantado en 29-REVIEW).
**Prevención:** Extender `PropiedadTable` con `extraColumns?` y `PropiedadCreateDialog` con `extraFields?` antes de renderizar el tab Familias. La extensión debe ser mínima (~20 LOC) y no romper el comportamiento de los 6 tabs existentes.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 2.1.9 |
| Config file | `apps/web/vitest.config.ts` |
| Quick run command | `cd apps/web && pnpm test` (ejecuta vitest run) |
| Watch mode | `cd apps/web && pnpm test:watch` |
| Coverage scope | `src/**/*.{test,spec}.{ts,tsx}` |

**Nota:** Backend NO tiene tests automatizados. Los tests de funciones del composer se escriben en `apps/web` aunque la implementación esté en `packages/utils`.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Archivo | Comando |
|--------|----------|-----------|---------|---------|
| TPL-03 + TPL-04 | `composeSku()` con template vacío → `stripSep(codigo)` | unit | `apps/web/src/lib/composer.test.ts` | `cd apps/web && pnpm test` |
| TPL-03 | `composeSku()` con variantes → `stripSep(codigo)-ABREV1-ABREV2` | unit | `apps/web/src/lib/composer.test.ts` | mismo |
| TPL-04 | `composeNombre()` con atributos vacíos → sin dobles espacios | unit | `apps/web/src/lib/composer.test.ts` | mismo |
| TPL-04 | `composeNombre()` orden correcto según `ordenNombre` | unit | `apps/web/src/lib/composer.test.ts` | mismo |
| TPL-03 | `stripSep()` con guiones, puntos, espacios, underscores | unit | `apps/web/src/lib/composer.test.ts` | mismo |
| TPL-01 + TPL-05 | Migration aplicada, template default existe en DB | manual | psql query post-migration | manual |
| TPL-01 | `GET /propiedades/familia` devuelve 200 | smoke | Playwright o curl manual | manual |
| TPL-01 | `GET /propiedades/aplicacion` devuelve 200 | smoke | Playwright o curl manual | manual |
| TPL-02 | `template_atributos.es_variante` campo presente en respuesta API | smoke | curl `GET /templates/1/atributos` | manual |
| TPL-05 | `articulos.template_id` columna existe en prod | manual | psql `\d articulos` | manual |

### Casos de borde críticos para el composer (Wave 0)

```
1. codigo con guiones:  'AMOR-001'       → 'AMOR001'
2. codigo con puntos:   'X.001.A'        → 'X001A'
3. codigo con espacios: 'AMOR 001'       → 'AMOR001'
4. atributos vacíos en nombre:
   atributos = { objeto: 'Amortiguador', marca: '', medida: undefined }
   → 'Amortiguador'  (no doble espacio, no '  ')
5. template con atributos_variante vacíos → shortcut stripSep(codigo)
6. template con orden_nombre: atributo_tipo de mayor orden va último
7. atributo con mismo texto en variantes distintas (cross-prop no colisiona):
   atributos = { talle: 'XL', color: 'XL' }, ambos es_variante=true
   → sku contiene ambos 'XL-XL' según orden del template
8. atributo marcado variante pero ausente en atributos (valor undefined):
   → se omite del SKU (misma regla que composeNombre para vacíos)
```

### Wave 0 Gaps

- [ ] `apps/web/src/lib/composer.test.ts` — archivo nuevo, tests de los casos de borde arriba
- [ ] `packages/utils/src/composer.ts` — implementación `stripSep`, `composeSku`, `composeNombre`
- [ ] `packages/types/src/template.ts` — tipos `Template`, `TemplateAtributo`, `AtributosMap`
- [ ] `packages/utils/src/index.ts` — re-exportar composer
- [ ] `apps/backend/package.json` — agregar `"@objetiva/utils": "workspace:*"`

---

## Assumptions Log

| # | Claim | Section | Risk si está mal |
|---|-------|---------|-----------------|
| A1 | `integer` en lugar de `smallint` para `custom_slot` en `template_atributos` — el repo solo usa `integer` actualmente | Technical Approach: schema | Cosmético; `smallint` también funciona pero requiere importar el tipo Drizzle |
| A2 | Los 101.021 artículos siguen teniendo 0 filas non-null en las 8 columnas legacy al momento de ejecutar la migration | Risks & Pitfalls PITFALL-2 | CRÍTICO — si hay datos, DROP los borra permanentemente |
| A3 | `packages/utils` no necesita Vitest propio — los tests viven en `apps/web` que ya tiene Vitest | Validation Architecture | Si el equipo quiere correr tests aislados desde el paquete, habría que agregar Vitest a `packages/utils` |

---

## Open Questions (RESOLVED)

1. **`template_id` en `articulos` — NULL o default apuntando al seed?**
   - Lo que sabemos: D-07 dice "NULL o seed con `template_default.id` — planner decide".
   - Lo que no está claro: si `template_id` es NULL en todos los artículos actuales, la lógica de Phase 32 (que lea el template para componer SKU/nombre) necesita un fallback "si es NULL, usar template 'default'". Si en cambio se backfilla `template_id` en los 101k artículos al momento de la migration, se evita el fallback pero la migration es más lenta.
   - Recomendación: dejar NULL por ahora, agregar fallback en el service de Phase 32. La migration 0008 no necesita UPDATE masivo.
   - **Decisión:** NULL (sin backfill en Phase 30). Phase 32 cablea el fallback "si `template_id IS NULL` usar template con `nombre='default'`" en el service de composer. Evita UPDATE masivo sobre 101k filas.

2. **`atributo_tipo` en `template_atributos` — qué strings válidos?**
   - Lo que sabemos: el template default usa `objeto`, `marca`, `modelo`, `medida`, `custom_1`.
   - Lo que no está claro: ¿hay un CHECK constraint sobre `atributo_tipo`? Los tipos posibles son los de `PROP_TIPOS` + `modelo` + `medida` + `custom_1/2/3`. Sin CHECK, un typo en el seed no se detecta hasta runtime.
   - Recomendación: No poner CHECK en DB (los tipos cambian entre milestones). Validación en la capa de aplicación al crear/editar template_atributos.
   - **Decisión:** Solo aplicación (sin CHECK en DB). Mantiene flexibilidad para nuevos tipos custom (`custom_2`, `custom_3`, futuras propiedades) sin migration extra. Validación se hace en `templates.service.ts` al hacer `replaceAtributos` contra la unión de `PROP_TIPOS ∪ {modelo, medida, custom_1, custom_2, custom_3}`.

3. **Select de subcategoria en el Dialog de Familias — ¿solo activas o todas?**
   - El `fetchPropiedades('subcategoria', { activo: true })` podría devolver subcategorías inactivas si el admin las desactivó. Si una subcategoría se desactiva, las familias bajo ella quedan sin poder asignarse.
   - Recomendación: mostrar todas las subcategorías activas en el select, con badge visual si alguna tiene solo inactivas. Simplicidad primero.
   - **Decisión:** Solo activas (filtrar `activo=true`). Reduce ruido visual y consolida el patrón "el admin reactiva si necesita reasignar". Plan 04 invoca `fetchPropiedades('subcategoria', { activo: true })` para poblar el select.

---

## Environment Availability

| Dependencia | Requerida por | Disponible | Versión | Fallback |
|-------------|--------------|------------|---------|---------|
| PostgreSQL | Migration DDL | Docker container activo (confirmado STATE.md) | v15+ (producción) | — |
| `drizzle-kit` | `pnpm db:generate` (si se usa) | `devDependencies` backend | `^0.31.9` | — |
| `drizzle-orm` | Queries Drizzle | `dependencies` backend | `^0.45.1` | — |
| Vitest | Tests composer | `devDependencies` web | `^2.1.9` | — |
| `@objetiva/utils` en backend | Import composer | NO instalado | — | Agregar en Wave 0 |

---

## Sources

### Primary (HIGH confidence)
- Codebase `apps/backend/src/db/schema.ts` líneas 512-568 — factory `definePropTable` y `propSubcategoria` patrón
- Codebase `apps/backend/drizzle/0006_categorias_subcategorias.sql` — SQL patrón migration jerárquica
- Codebase `apps/backend/drizzle/0007_drop_sector_id_huerfana.sql` — patrón DROP COLUMN IF EXISTS
- Codebase `apps/backend/drizzle/meta/_journal.json` — estructura journal, próximo idx=8
- Codebase `apps/backend/src/modules/propiedades/` — todos los archivos del módulo genérico
- Codebase `apps/web/src/types/propiedad.ts` — PROP_TIPOS, PROP_LABELS, copyFor
- Codebase `apps/web/vitest.config.ts` + `apps/web/src/lib/abrev.test.ts` — framework y patrón de tests
- `[CITED: Context7 /drizzle-team/drizzle-orm-docs]` — UNIQUE index con expresión lower(), check constraints, composite PK

### Secondary (MEDIUM confidence)
- `.planning/phases/29-catalogos-de-atributos/29-CONTEXT.md` D-01 a D-19 — decisiones previas que aplican
- `.planning/research/STACK.md` — slugify reservado para Phase 30+ pero no requerido en Phase 30
- `MEMORY.md` feedback entries — `feedback_schema_drift_silencioso.md`, `feedback_db_push_force_prod.md`, `feedback_never_drop_tables.md`

---

## Metadata

**Confidence breakdown:**
- Schema Drizzle patterns: HIGH — verificado contra código real en producción
- Migration strategy: HIGH — patrón 0006/0007 confirmado, journal sync documentado
- Composer functions architecture: HIGH — `packages/utils` es la ubicación correcta basada en deps reales del monorepo
- Test strategy: HIGH — Vitest solo en web confirmado, patrón abrev.test.ts canónico
- Frontend tab extensión: MEDIUM — requiere decisión de diseño sobre `extraColumns?` vs componente especializado; ambos son válidos

**Research date:** 2026-05-16
**Válido hasta:** 2026-06-16 (stack estable, sin cambios de versión esperados)

---

## RESEARCH COMPLETE
