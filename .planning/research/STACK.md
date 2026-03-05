# Technology Stack

**Project:** Objetiva Comercios Admin v1.1 - Data Model Migration
**Researched:** 2026-03-05
**Confidence:** HIGH

## Executive Summary

No new libraries are needed for v1.1. The existing Drizzle ORM (v0.45.1) and drizzle-kit (v0.31.9) already support every column type and migration pattern required: text primary keys, `numeric(10,2)` for monetary fields, JSONB columns, PostgreSQL array columns, and text-based foreign key references. The migration is a schema-level change, not a stack-level change.

The only material change is switching monetary fields from `doublePrecision` to `numeric` with `{ mode: 'number' }` to preserve JavaScript number semantics while gaining SQL-level decimal precision.

## Recommended Stack

### No New Dependencies Required

The current stack handles everything needed for v1.1:

| Technology  | Current Version | New Capability Used                                       | Status            |
| ----------- | --------------- | --------------------------------------------------------- | ----------------- |
| drizzle-orm | ^0.45.1         | `text().primaryKey()`, `numeric()`, `jsonb()`, `.array()` | Already installed |
| drizzle-kit | ^0.31.9         | `generate --custom` for data migration SQL                | Already installed |
| pg-core     | (bundled)       | All column types available from `drizzle-orm/pg-core`     | Already installed |

### New Imports Needed (from existing packages)

These imports are already available in `drizzle-orm/pg-core` but not currently used in the schema:

```typescript
// Current imports in schema.ts:
import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  doublePrecision,
  timestamp,
  index,
} from 'drizzle-orm/pg-core'

// v1.1 imports (additions marked with +):
import {
  pgTable,
  serial, // still used for orders, sales, purchases PKs
  integer,
  varchar,
  text,
  // doublePrecision,  // REMOVED - replaced by numeric
  timestamp,
  index,
  numeric, // + NEW: monetary fields with precision
  jsonb, // + NEW: inventarios metadata
} from 'drizzle-orm/pg-core'

import { sql } from 'drizzle-orm' // + NEW: for array default values
```

## Column Type Patterns for v1.1

### 1. Text Primary Keys (articulos.codigo)

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/column-types/pg))

Use `text().primaryKey()` instead of `serial().primaryKey()`. Drizzle handles text PKs natively with no special configuration.

```typescript
export const articulos = pgTable('articulos', {
  codigo: text('codigo').primaryKey(), // ERP business code, not surrogate
  // ...
})
```

**Why text PK:** The business model uses ERP codes (e.g., "ART-001") as the canonical identifier. A surrogate integer ID would create a mapping layer with no benefit since all external systems reference the codigo.

### 2. Numeric for Monetary Fields

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/column-types/pg) + [GitHub issue #1042](https://github.com/drizzle-team/drizzle-orm/issues/1042))

Replace all `doublePrecision()` with `numeric({ precision: 10, scale: 2, mode: 'number' })`.

```typescript
// BEFORE (v1.0) - floating point imprecision
price: doublePrecision('price').notNull(),

// AFTER (v1.1) - exact decimal arithmetic
precio: numeric('precio', { precision: 10, scale: 2, mode: 'number' }).notNull(),
```

**Critical: the `mode: 'number'` flag.** Without it, Drizzle returns `numeric` columns as strings (this is by design -- PostgreSQL's `numeric` type can exceed JavaScript's Number.MAX_SAFE_INTEGER). With `mode: 'number'`, Drizzle maps the value to a JS number at the driver level. For MXN monetary values with 2 decimal places, this is safe -- values will never exceed safe integer range.

**Why not keep doublePrecision:** IEEE 754 doubles cannot represent 0.1 exactly. `19.99 * 3` can produce `59.970000000000006`. For financial operations (taxes, totals, inventory valuation), `numeric(10,2)` is the correct PostgreSQL type -- it stores exact decimals.

### 3. JSONB Columns (inventarios metadata)

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/column-types/pg))

Use `jsonb().$type<T>()` for typed JSON columns. Drizzle infers the TypeScript type from the generic.

```typescript
export const inventarios = pgTable('inventarios', {
  // ...
  configuracion: jsonb('configuracion')
    .$type<{
      sectores: string[]
      dispositivos: string[]
      notas: string | null
    }>()
    .default({ sectores: [], dispositivos: [], notas: null }),
})
```

**Why JSONB over separate tables:** Inventario configuration (sectors, devices) is read-heavy metadata that belongs to the inventario event. It doesn't need relational queries -- it's always loaded with the parent record. JSONB avoids unnecessary join tables for what is essentially a document.

### 4. PostgreSQL Array Columns

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/guides/empty-array-default-value))

Use `.array()` on any column type. For default empty arrays, use the `sql` template.

```typescript
import { sql } from 'drizzle-orm'

export const inventarios = pgTable('inventarios', {
  // ...
  sectores: text('sectores')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  dispositivos: text('dispositivos')
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
})
```

**Design decision -- arrays vs JSONB for lists:** Use arrays when the data is a flat list of scalars that you might filter on (PostgreSQL supports `@>` contains on arrays). Use JSONB when the data is structured/nested. For sectores and dispositivos, either works. If these end up inside a JSONB `configuracion` column instead of standalone arrays, that is also valid.

### 5. Text Foreign Keys

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/column-types/pg))

Foreign key references work identically with text columns. The referencing column type must match the referenced column type.

```typescript
export const existencias = pgTable('existencias', {
  id: serial('id').primaryKey(),
  articuloCodigo: text('articulo_codigo')
    .notNull()
    .references(() => articulos.codigo, { onDelete: 'restrict' }),
  // ...
})

// In orderItems, saleItems, purchaseItems - replace integer productId:
articuloCodigo: text('articulo_codigo')
  .notNull()
  .references(() => articulos.codigo, { onDelete: 'restrict' }),
```

### 6. Drizzle Relations with Text Keys

**Confidence: HIGH** (verified via [official docs](https://orm.drizzle.team/docs/relations))

The `relations()` API is type-agnostic. Fields and references just need matching types.

```typescript
import { relations } from 'drizzle-orm'

export const articulosRelations = relations(articulos, ({ many }) => ({
  existencias: many(existencias),
  orderItems: many(orderItems),
  saleItems: many(saleItems),
  purchaseItems: many(purchaseItems),
}))

export const existenciasRelations = relations(existencias, ({ one }) => ({
  articulo: one(articulos, {
    fields: [existencias.articuloCodigo],
    references: [articulos.codigo],
  }),
}))
```

## Migration Strategy

### Approach: Custom Migration + Generated Migration

**Confidence: MEDIUM** (pattern verified via [official docs](https://orm.drizzle.team/docs/kit-custom-migrations), specific execution needs testing)

The migration from products/inventory to articulos/existencias/inventarios involves destructive schema changes that `drizzle-kit generate` cannot safely auto-generate. Use a hybrid approach:

#### Step 1: Create custom migration for data transfer

```bash
cd apps/backend
pnpm drizzle-kit generate --custom --name=migrate-to-articulos
```

Write SQL that:

1. Creates new tables (articulos, existencias, depositos, inventarios)
2. Migrates data from products to articulos (mapping id -> codigo, price -> precio, etc.)
3. Updates foreign keys in order_items, sale_items, purchase_items
4. Drops old tables (products, inventory)

#### Step 2: Update schema.ts

Replace the `products` and `inventory` table definitions with `articulos`, `existencias`, `depositos`, and `inventarios`. Update all FK references in orderItems, saleItems, purchaseItems.

#### Step 3: Generate verification migration

```bash
pnpm drizzle-kit generate
```

This should produce an empty migration (or only index changes) if Step 1 and Step 2 are aligned. If it shows diffs, the custom migration missed something.

#### Why not pure `drizzle-kit generate`:

Drizzle Kit's diff engine sees "products table removed, articulos table added" as unrelated operations. It will generate `DROP TABLE products` + `CREATE TABLE articulos` with no data migration. For a production database with seed data, this loses all product records. The custom migration preserves data continuity.

#### Development shortcut (no production data):

If the database only has seed data (which can be re-seeded), the simpler path is:

1. Update schema.ts with new tables
2. Run `pnpm db:push` (destructive push, drops and recreates)
3. Run `pnpm db:seed` with updated seed script

This avoids migration complexity entirely for dev environments. Generate proper migrations only when approaching production deployment.

## Alternatives Considered

| Decision           | Chosen                         | Alternative                                                       | Why Not                                                                                                                                         |
| ------------------ | ------------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Monetary type      | `numeric(10,2, mode:'number')` | Keep `doublePrecision`                                            | Floating point errors in financial math -- unacceptable                                                                                         |
| Monetary type      | `numeric(10,2, mode:'number')` | `numeric(10,2)` (string mode)                                     | Would require parsing every monetary value from string to number across entire frontend/backend -- massive refactor for no benefit at MXN scale |
| Text PK            | `text().primaryKey()`          | `serial()` PK + unique `codigo` column                            | Adds indirection -- every FK would need a join to resolve the business code. ERP integration becomes harder                                     |
| Inventario config  | JSONB column                   | Separate `inventario_sectores` / `inventario_dispositivos` tables | Over-normalization for data that is always read with its parent. No independent queries on sectors/devices                                      |
| Migration approach | Custom SQL migration           | Pure `drizzle-kit generate`                                       | Cannot auto-migrate data between differently-shaped tables                                                                                      |
| Migration approach | Custom SQL migration           | ORM-level migration script (TypeScript)                           | Drizzle Kit does not support TypeScript migrations yet (SQL only). Custom SQL is the supported path                                             |

## What NOT to Add

These were explicitly evaluated and rejected:

| Library                                 | Why Not Needed                                                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| decimal.js / big.js                     | PostgreSQL `numeric` handles precision at DB level. JS `number` is sufficient for display/transport of MXN values (max ~10M with 2 decimals) |
| uuid / nanoid                           | PKs are business codes (ERP `codigo`), not generated IDs. Serial IDs remain for non-article tables                                           |
| zod (new)                               | Already in the codebase for validation. No new schema library needed                                                                         |
| Any new ORM                             | Drizzle handles everything. No gaps discovered                                                                                               |
| Migration tools (node-pg-migrate, etc.) | Drizzle Kit's custom migration + generate covers the workflow                                                                                |

## Installation

```bash
# No new packages to install.
# Verify current versions are sufficient:
cd apps/backend
pnpm list drizzle-orm drizzle-kit
# Expected: drizzle-orm@0.45.x, drizzle-kit@0.31.x
```

## Sources

### Official Documentation (HIGH confidence)

- [Drizzle ORM - PostgreSQL column types](https://orm.drizzle.team/docs/column-types/pg) - text/numeric/jsonb/array syntax
- [Drizzle ORM - Empty array default value guide](https://orm.drizzle.team/docs/guides/empty-array-default-value) - array defaults with `sql` template
- [Drizzle ORM - Custom migrations](https://orm.drizzle.team/docs/kit-custom-migrations) - `generate --custom` workflow
- [Drizzle ORM - Relations](https://orm.drizzle.team/docs/relations) - text FK references in relations API
- [Drizzle ORM - Migrations overview](https://orm.drizzle.team/docs/migrations) - migration generation and execution

### GitHub Issues (HIGH confidence)

- [Issue #1042 - Numeric type inferred as string](https://github.com/drizzle-team/drizzle-orm/issues/1042) - confirms `mode: 'number'` behavior

---

_Stack research for: v1.1 Data Model Migration (articulos/existencias/inventarios)_
_Researched: 2026-03-05_
_All column types and migration patterns verified against official Drizzle ORM documentation_
