# Technology Stack — v1.3 Variantes y Modelo de Stock

**Project:** Objetiva Comercios Admin v1.3
**Researched:** 2026-04-29
**Scope:** Stack additions for variants system + stock model redesign + tech debt
**Confidence:** HIGH (Context7 verified for all version recommendations)

> **CRITICAL FRAME**: This is a SUBSEQUENT milestone. The validated v1.0–v1.2 stack does NOT need re-recommendation. This file documents ONLY what is NEW relative to:
> - Backend: NestJS 10 + Drizzle ORM 0.45 + drizzle-kit 0.31 + postgres 3.4 + jose 5 + sharp 0.34 + @nestjs/event-emitter 3
> - Web: Next.js 14 + shadcn/ui + Tailwind + TanStack Table 8.21 + react-hook-form 7.71 + zod 4.3 + @hookform/resolvers 5.2
> - Mobile: React + Vite + Capacitor
> - Monorepo: pnpm workspaces + Turborepo

---

## Executive Recommendation

**v1.3 needs ONE new runtime dependency: `slugify` (^1.6.x) on the backend.**

Everything else is achieved with what's already installed. The variants system, stock redesign, and monetary tech debt are entirely solvable with patterns built on top of existing tooling. This is intentional — keeping the dependency footprint minimal aligns with the project's "simplicidad > flexibilidad" stance.

| Decision | Why |
|---|---|
| Add `slugify` (backend) | Universal, deterministic SKU slug composition with locale-aware transliteration (`á→a`, `ñ→n`). Avoids reinventing edge cases. |
| Drizzle custom SQL migrations | Drizzle Kit auto-generation can NOT detect renames safely (will drop+recreate). Schema changes for `columna→ubicacion`, `codigo→sku` PK swap, FK pivots, `doublePrecision→numeric` MUST be hand-authored via `drizzle-kit generate --custom`. |
| In-process advisory locks via `pg_advisory_xact_lock` (raw SQL) | Cascade SKU updates need serialization to prevent concurrent template edits from corrupting the mapping. Postgres-native, zero new deps. |
| TanStack Table grouping (existing 8.21) | Variant list grouped-by-`codigo` is a first-class TanStack feature. No new lib. |
| `useFieldArray` (already in react-hook-form) | Dynamic per-template attribute forms compose with existing zod schema. No new lib. |
| Append-only history table in same DB | Audit + "undo last cascade" via dedicated table, not external event store. |

---

## NEW Dependencies (Add to Stack)

### Backend (`apps/backend/package.json`)

| Package | Version (verified) | Purpose | Why over alternatives |
|---|---|---|---|
| `slugify` | `^1.6.6` (latest 1.6.9 on npm) | Generate URL/SKU-safe slugs from attribute values for `codigo + slug(marca) + slug(talle) + …` SKU composition | Pure JS, zero deps, Unicode transliteration built-in (`café → cafe`, `niño → nino`). Locale option for ES. Used by 3M+ projects. **Alternative `@sindresorhus/slugify` (3.0.0)** is ESM-only and pulls 4 transitive deps (`@sindresorhus/transliterate` + `escape-string-regexp`). The simov package is leaner and CJS-compatible — better fit for current NestJS 10 (still mostly CJS-friendly). |

**Installation:**
```bash
pnpm --filter @objetiva/backend add slugify@^1.6.6
```

**Usage pattern (decide once, freeze in `apps/backend/src/modules/articulos/sku.service.ts`):**
```typescript
import slugify from 'slugify'

const SLUG_OPTIONS = {
  lower: true,
  strict: true,        // strip everything except alphanumeric + replacement
  replacement: '-',
  locale: 'es',
  trim: true,
} as const

export function attributeSlug(value: string): string {
  return slugify(value ?? '', SLUG_OPTIONS)
}

export function composeSku(codigo: string, slugs: string[]): string {
  // Empty slugs filtered (variant attribute = NULL)
  const parts = [codigo, ...slugs.filter(Boolean)]
  return parts.join('-')
}
```

> **Anti-recommendation:** Do NOT write a custom slugifier with `String.prototype.normalize('NFD').replace(/[̀-ͯ]/g, '')`. It misses character classes (`ø`, `æ`, `ß`, `ł`) that real auto-parts brand names use (e.g. "Bosch Łodź"). `slugify` has those mappings curated.

---

### Web (`apps/web/package.json`)

**No new runtime dependencies.** All UI patterns covered by existing stack:

| Pattern | Existing tool to use |
|---|---|
| Variant list grouped by `codigo` (collapse/expand) | `@tanstack/react-table@^8.21.3` — `getGroupedRowModel` + `getExpandedRowModel` (verified Context7) |
| Dynamic per-template attribute form | `react-hook-form@^7.71.1` `useFieldArray` + `zod@^4.3.6` discriminated unions |
| Bulk preview tables (cascade impact) | `@tanstack/react-table` + `@radix-ui/react-dialog` (already installed) |
| Confirmation modals (cascade execute) | `@radix-ui/react-alert-dialog` (already installed) |
| Optimistic updates | TanStack Query — **already used in mobile**, also already a transitive of Next data fetching patterns currently in use. If not yet on web, add `@tanstack/react-query` ^5.90 — but verify current usage first; v1.2 web list views use Server Components + plain fetches. |

> Verify before adding: search `apps/web` for `useQuery` / `QueryClient` to confirm whether TanStack Query is already wired in. If not, **defer the decision to the per-phase plan-phase research** — Server Actions + revalidate may be enough for cascade UX.

---

### Shared types (`packages/types/package.json`)

**No new dependencies.** zod 4.3.6 already exports `z.discriminatedUnion`, `z.lazy`, `z.intersection` — sufficient for template-driven schema composition.

---

## NEW Patterns (No New Deps Required)

### 1. Drizzle Migration Pattern: Atomic Schema Changes with Backfill

The default `drizzle-kit generate` from a schema diff will **drop and recreate** columns when a field is renamed (e.g. `columna → ubicacion`), losing all data. For v1.3 schema changes — `columna→ubicacion` rename, `codigo→sku` PK swap, `doublePrecision→numeric` conversion — use **custom SQL migrations** generated via `drizzle-kit generate --custom`.

**Pattern A — Column rename with data preservation:**

```bash
pnpm --filter @objetiva/backend exec drizzle-kit generate --custom --name=rename-columna-to-ubicacion
```

```sql
-- drizzle/000X_rename-columna-to-ubicacion.sql
BEGIN;

-- inventarios_articulos.columna → ubicacion
-- (existencias does NOT currently have a `columna` column per current schema —
--  only inventarios_articulos. The PROJECT description mentions both; verify
--  the actual production state during plan-phase before authoring this migration.)
ALTER TABLE "inventarios_articulos" RENAME COLUMN "columna" TO "ubicacion";

-- Rename indexes that reference the old name (none in current schema; keep audit trail).
-- Drop CHECK constraints that reference old column name (none here).

COMMIT;
```

Then update `schema.ts` to declare `ubicacion: integer('ubicacion')` so Drizzle's snapshot matches the actual DB. **Run the custom SQL migration before regenerating snapshot** to avoid Drizzle thinking it's a fresh column.

**Pattern B — `doublePrecision → numeric(12,2)` with safe cast:**

```sql
-- drizzle/000Y_monetary-precision.sql
BEGIN;

ALTER TABLE "orders"
  ALTER COLUMN "subtotal" TYPE numeric(12,2) USING "subtotal"::numeric(12,2),
  ALTER COLUMN "tax"      TYPE numeric(12,2) USING "tax"::numeric(12,2),
  ALTER COLUMN "total"    TYPE numeric(12,2) USING "total"::numeric(12,2);

ALTER TABLE "order_items"
  ALTER COLUMN "price"    TYPE numeric(12,2) USING "price"::numeric(12,2),
  ALTER COLUMN "subtotal" TYPE numeric(12,2) USING "subtotal"::numeric(12,2);

ALTER TABLE "sales" ...;
ALTER TABLE "sale_items" ...;
ALTER TABLE "purchases" ...;
ALTER TABLE "purchase_items" ...;
ALTER TABLE "articulos"
  ALTER COLUMN "precio"     TYPE numeric(12,2) USING "precio"::numeric(12,2),
  ALTER COLUMN "costo"      TYPE numeric(12,2) USING "costo"::numeric(12,2),
  ALTER COLUMN "erp_precio" TYPE numeric(12,2) USING "erp_precio"::numeric(12,2),
  ALTER COLUMN "erp_costo"  TYPE numeric(12,2) USING "erp_costo"::numeric(12,2);

COMMIT;
```

> **Postgres TYPE-change perf note**: `ALTER COLUMN ... TYPE` rewrites the table. With ~11k articulos and small comprobantes counts in v1.3 this is sub-second. For the future when transactional data grows, use `ADD COLUMN new + UPDATE batch + DROP old + RENAME` pattern instead. Document this in PITFALLS.md.

**Pattern C — `codigo` → `sku` PK swap (the load-bearing change):**

```sql
-- drizzle/000Z_sku-as-pk.sql
BEGIN;

-- Step 1: Backfill sku from codigo where empty (initial state has 1 row per codigo)
UPDATE "articulos" SET "sku" = "codigo" WHERE "sku" IS NULL OR "sku" = '';
ALTER TABLE "articulos" ALTER COLUMN "sku" SET NOT NULL;

-- Step 2: Add unique constraint on sku
-- (CONCURRENTLY cannot run in tx; either split or accept brief lock at 11k rows)
CREATE UNIQUE INDEX "articulos_sku_unique" ON "articulos" ("sku");

-- Step 3: Drop existing FKs that reference articulos.codigo
ALTER TABLE "order_items"     DROP CONSTRAINT "order_items_articulo_codigo_fkey";
ALTER TABLE "sale_items"      DROP CONSTRAINT "sale_items_articulo_codigo_fkey";
ALTER TABLE "purchase_items"  DROP CONSTRAINT "purchase_items_articulo_codigo_fkey";
ALTER TABLE "existencias"     DROP CONSTRAINT "existencias_articulo_codigo_fkey";
ALTER TABLE "inventarios_articulos" DROP CONSTRAINT "inventarios_articulos_articulo_codigo_fkey";

-- Step 4: Rename FK columns articulo_codigo → articulo_sku via add+copy+drop+rename
-- (Safer than RENAME COLUMN because it preserves data even when SKU diverges from codigo.
--  At v1.3 starting state SKU=codigo, but the explicit dance is the recoverable form.)

ALTER TABLE "order_items" ADD COLUMN "articulo_sku" text;
UPDATE "order_items" SET "articulo_sku" = "articulo_codigo";
ALTER TABLE "order_items" ALTER COLUMN "articulo_sku" SET NOT NULL;
ALTER TABLE "order_items" DROP COLUMN "articulo_codigo";
ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_articulo_sku_fkey"
  FOREIGN KEY ("articulo_sku") REFERENCES "articulos" ("sku") ON DELETE RESTRICT;

-- (repeat for sale_items, purchase_items, existencias, inventarios_articulos)

-- Step 5: Demote codigo from PK to indexed agrupador
ALTER TABLE "articulos" DROP CONSTRAINT "articulos_pkey";
ALTER TABLE "articulos" ADD PRIMARY KEY ("sku");
CREATE INDEX "articulos_codigo_idx" ON "articulos" ("codigo");
-- codigo remains NOT NULL but no longer UNIQUE — multiple variants per codigo allowed.

COMMIT;
```

> **CONCURRENTLY note**: `CREATE INDEX CONCURRENTLY` cannot run inside a transaction. Either split the unique-index step into a separate migration file or accept the brief table lock during step 2 — at 11k rows the lock is sub-second.

> **Idempotency**: Each migration script should be safe to re-run via `IF NOT EXISTS` / `IF EXISTS` guards on every ADD/DROP. Drizzle migration journal handles "already applied" but defense in depth helps when restoring from backups.

### 2. Idempotent Cascade SKU Updates (App Layer)

When an admin edits a template and triggers cascade, the backend must:
1. Compute new SKU per affected articulo.
2. Update `articulos.sku` + write `articulos.sku_anterior` (idempotency marker).
3. Cascade FK update to `order_items.articulo_sku`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`.
4. Append to `articulo_sku_history`.
5. All in a single transaction with an advisory lock.

**Pattern: pg_advisory_xact_lock to serialize cascade operations**

```typescript
import { sql, eq } from 'drizzle-orm'

// Lock key: arbitrary 64-bit int. Use a constant for "global cascade lock".
const CASCADE_LOCK_KEY = 4827317n  // any constant — document it in sku.constants.ts

await db.transaction(async tx => {
  // Block until any other cascade in progress finishes. Released at COMMIT/ROLLBACK.
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${CASCADE_LOCK_KEY})`)

  // Build mapping old_sku → new_sku in memory (after fetching affected articulos)
  const mapping = await computeMapping(tx, templateId)
  const batchId = crypto.randomUUID()

  for (const [oldSku, newSku] of mapping) {
    if (oldSku === newSku) continue  // no-op

    await tx.update(articulos)
      .set({ sku: newSku, skuAnterior: oldSku })
      .where(eq(articulos.sku, oldSku))

    await tx.update(orderItems).set({ articuloSku: newSku }).where(eq(orderItems.articuloSku, oldSku))
    await tx.update(saleItems).set({ articuloSku: newSku }).where(eq(saleItems.articuloSku, oldSku))
    await tx.update(purchaseItems).set({ articuloSku: newSku }).where(eq(purchaseItems.articuloSku, oldSku))
    await tx.update(existencias).set({ articuloSku: newSku }).where(eq(existencias.articuloSku, oldSku))
    await tx.update(inventariosArticulos).set({ articuloSku: newSku }).where(eq(inventariosArticulos.articuloSku, oldSku))

    await tx.insert(articuloSkuHistory).values({
      skuAnterior: oldSku,
      skuNuevo: newSku,
      templateId,
      batchId,
      reason: 'template_cascade',
      operatorId: ctx.userId,
    })
  }
})
```

> **Why advisory lock vs row-level lock**: Row-level `SELECT … FOR UPDATE` would lock individual articulos but allow two cascade jobs to interleave on different articulos and produce a state where children point to half-old, half-new SKUs. Advisory lock is cheap, mutex-style serialization at the operation level. Released automatically on transaction end.

> **Why a single big transaction is OK at this scale**: 11k articulos × (5 child tables × small avg row count) << 1M rows. Postgres handles this in seconds. If volume grows past 100k articulos, switch to chunked transactions per articulo group with a saga pattern.

### 3. Append-Only History Table (Audit + Undo)

```typescript
// schema.ts addition
import { bigserial, uuid } from 'drizzle-orm/pg-core'

export const articuloSkuHistory = pgTable(
  'articulo_sku_history',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    skuAnterior: text('sku_anterior').notNull(),
    skuNuevo: text('sku_nuevo').notNull(),
    templateId: integer('template_id').references(() => articulosTemplates.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(), // 'template_cascade' | 'manual_edit' | 'undo'
    operatorId: text('operator_id'),  // Supabase user UUID (text)
    batchId: uuid('batch_id').notNull(), // groups all rows from one cascade run
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  table => [
    index('articulo_sku_history_sku_anterior_idx').on(table.skuAnterior),
    index('articulo_sku_history_sku_nuevo_idx').on(table.skuNuevo),
    index('articulo_sku_history_batch_id_idx').on(table.batchId),
    index('articulo_sku_history_created_at_idx').on(table.createdAt),
  ]
)
```

**Undo last cascade** is then `SELECT * WHERE batch_id = (last batch) ORDER BY id DESC` and reverse-apply mapping inside another transaction with the same advisory lock.

> **Anti-recommendation**: Do NOT use a separate event-sourcing log file or external append-only DB (e.g., a writable S3 bucket of JSONL). The advantage of in-DB history is transactional consistency with the cascade itself — both succeed or both fail.

### 4. TanStack Table — Grouped Variant List

```tsx
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  type GroupingState,
} from '@tanstack/react-table'

const [grouping, setGrouping] = useState<GroupingState>(['codigo'])
const [expanded, setExpanded] = useState({})

const table = useReactTable({
  data: articulos,
  columns,
  state: { grouping, expanded },
  onGroupingChange: setGrouping,
  onExpandedChange: setExpanded,
  getCoreRowModel: getCoreRowModel(),
  getGroupedRowModel: getGroupedRowModel(),
  getExpandedRowModel: getExpandedRowModel(),
  groupedColumnMode: 'reorder',
})
```

Aggregations on numeric columns (sum of `unidades`, mean of `precio`) come for free via `aggregationFn: 'sum' | 'mean'` per column def.

> **Important version note**: The Context7 v9 alpha API (`useTable` + `tableFeatures`) is NOT what you want here. Stay on the stable v8.21 API (`useReactTable` + `getXxxRowModel`) — that's what shadcn/ui examples use and what is currently locked in package.json.

### 5. Dynamic Attribute Form (Template-Driven)

Template defines which attributes apply. The web form must render N varying attribute selects/inputs.

**Pattern:**

```tsx
// 1. Build zod schema from template (server-driven config)
function buildArticuloSchema(template: Template): z.ZodSchema {
  const shape: z.ZodRawShape = {
    codigo: z.string().min(1),
    nombre: z.string().min(1),
  }

  for (const attr of template.atributos) {
    if (attr.tipoCatalogo) {
      shape[attr.nombre] = attr.requerido
        ? z.number().int().positive() // FK to catálogo
        : z.number().int().positive().nullable()
    } else {
      shape[attr.nombre] = attr.requerido
        ? z.string().min(1)
        : z.string().nullable()
    }
  }

  return z.object(shape)
}

// 2. Form usage
const schema = useMemo(() => buildArticuloSchema(template), [template.id, template.version])
const form = useForm({ resolver: zodResolver(schema) })

// 3. Render attributes
{template.atributos.map(attr => (
  <FormField key={attr.id} control={form.control} name={attr.nombre} render={...} />
))}
```

> **Anti-recommendation**: Do NOT introduce JSON-Schema → form generators (`@rjsf/core`, `formily`, `react-jsonschema-form`). They drag in MUI/Antd dependencies and clash with shadcn aesthetic. The native RHF + zod path above is < 50 LOC and stays inside the existing component library.

---

## Anti-Recommendations (Things NOT to Add)

| Avoid | Why | Use Instead |
|---|---|---|
| `bullmq` / `redis` job queue | Cascade is bounded (≤11k articulos), runs in < 5s under transaction. No retry/idempotency benefit beyond Postgres tx. | Single Postgres transaction + advisory lock. |
| `temporal.io` / saga libraries | Same reason: cascade is short-lived and atomic; no long-running workflow semantics needed. | Postgres transaction. |
| `kysely` / `prisma` for migrations | Project already uses Drizzle Kit, swapping would split tooling. Drizzle Kit `--custom` covers everything needed. | `drizzle-kit generate --custom`. |
| Feature-flag service (`unleash`, `ld`) | Templates are config rows in DB, not feature flags. One template default ships in v1.3 — no toggling needed. | DB-driven config; `articulos_templates` table. |
| `nanoid` / `cuid2` for SKU | SKUs are *deterministic* compositions of codigo + slugs, not random IDs. Random ID would break "regenerable from attributes" property. | `slugify` + concatenation. |
| `transliteration` lib (separate from slugify) | `slugify@1.6` already does Unicode transliteration. Extra lib would duplicate work and create mapping conflicts. | `slugify` defaults. |
| `pg-listen` / LISTEN/NOTIFY for cascade events | `@nestjs/event-emitter` is already adequate for in-process notifications. Webhooks already dispatch via this path. | Existing event-emitter. |
| `@reduxjs/toolkit` / Zustand for cascade preview state | Modal-scoped form state. RHF + local React state is sufficient. | RHF + `useState`. |
| `react-virtualized` / `react-window` for variant list | TanStack Table grouped rows max ~few hundred at once with the codigo collapse. Virtualization is premature. | Plain DOM. Revisit if a single codigo group exceeds 200 variants. |
| JSONB for `template_atributos` config | Explicit user decision (PROJECT.md key decision row): "atributos como FK a catálogos (no JSONB)". | Relational pivot tables. |
| Separate event store (Kafka, NATS) for SKU history | Scale doesn't justify it; in-DB history table is transactional and simpler to query. | `articulo_sku_history` Postgres table. |

---

## Version Compatibility Matrix

| Package | Recommended | Compatible With | Notes |
|---|---|---|---|
| `slugify` | `^1.6.6` (latest 1.6.9) | Node 18+, both ESM and CJS | Used directly in NestJS modules. No transitive deps. |
| `drizzle-orm` | `^0.45.1` (current) | `drizzle-kit ^0.31.x`, `postgres ^3.4.x` | Already locked. Custom SQL migrations work as of 0.20+. No upgrade required. Latest is 0.45.2 (patch only). |
| `drizzle-kit` | `^0.31.10` | drizzle-orm 0.45 | Already locked. `--custom` flag stable since 0.20+. |
| `@tanstack/react-table` | `^8.21.3` (current) | React 18, React 19 | Already locked. v8 grouping API is stable. The v9 alpha API in some Context7 docs is NOT what current shadcn examples use — stay on stable v8. |
| `react-hook-form` | `^7.71.1` (current; latest is 7.74.0) | zod 3 + 4 via `@hookform/resolvers ^5.2` | Existing version is fine. Optional bump to 7.74 if minor bugfixes needed during phase planning. |
| `zod` | `^4.3.6` (current) | RHF resolvers 5.2+ | Already locked. v4 brings `z.discriminatedUnion` improvements useful for template-driven schemas. |

---

## Anti-Patterns Specific to v1.3

### 1. Don't let drizzle-kit auto-generate the column rename

`drizzle-kit generate` (non-custom) compares snapshots and will produce `DROP COLUMN columna; ADD COLUMN ubicacion` — losing all data. Always check the produced SQL before applying. **Rule of thumb: any migration that touches `columna`, `codigo`, `sku`, monetary fields, or FK columns MUST be reviewed manually before `drizzle-kit migrate`.**

When drizzle-kit prompts interactively "did you mean to rename X to Y?" choose rename. But for production safety, prefer `--custom` mode and hand-author the SQL.

### 2. Don't run cascade outside a transaction

Mid-cascade failure leaves orphaned FKs (children pointing to old SKUs that no longer exist). Always: `db.transaction(async tx => …)` + advisory lock at top.

### 3. Don't UPDATE without `sku_anterior` write

The idempotency marker is what allows "re-running this cascade is a no-op if already applied." Without it, retries can corrupt state.

### 4. Don't make `slugify` options vary across the codebase

Define one constant in one file, export it. Different options → different slugs → different SKUs for the same attribute → silent data corruption. Lock it in `apps/backend/src/modules/articulos/sku.constants.ts`.

### 5. Don't skip the preview step in UI

UX rule that's also a tech rule: show user "this will affect N rows" before commit. The preview query is a read-only `SELECT COUNT(*) WHERE …` matching the cascade WHERE clause — cheap, and required by user spec ("preview + cascade + history").

---

## Installation Summary

```bash
# Single new dependency
pnpm --filter @objetiva/backend add slugify@^1.6.6

# Optional minor bump (decide during phase planning, not required)
# pnpm --filter @objetiva/web add react-hook-form@^7.74.0

# Verify TanStack Query usage on web before deciding:
grep -r "useQuery\|QueryClient" apps/web/src || echo "Not found — Server Actions path"
```

---

## Sources

- Drizzle ORM Custom Migrations: [drizzle-kit-generate.mdx](https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/drizzle-kit-generate.mdx) — verified via Context7
- Drizzle ORM Transactions: [transactions.mdx](https://github.com/drizzle-team/drizzle-orm-docs/blob/main/src/content/docs/transactions.mdx) — verified via Context7
- TanStack Table Grouping: [grouping.md](https://github.com/tanstack/table/blob/alpha/docs/guide/grouping.md) — verified via Context7
- React Hook Form + Zod: [react-hook-form/documentation](https://github.com/react-hook-form/documentation) — verified via Context7
- slugify (simov): [README.md](https://github.com/simov/slugify) — verified via Context7
- npm registry version checks (2026-04-29): slugify@1.6.9 (latest), drizzle-orm@0.45.2, drizzle-kit@0.31.10, react-hook-form@7.74.0, zod@4.3.6, @tanstack/react-table@8.21.3 — all confirmed.

## Confidence Assessment

| Area | Confidence | Reasoning |
|---|---|---|
| `slugify` recommendation | HIGH | Context7 verified API; npm version checked; alternative compared by transitive dep count. |
| Drizzle custom SQL pattern | HIGH | Direct Context7 quote from official drizzle-orm-docs covers the workflow. |
| Advisory lock pattern | MEDIUM | Postgres feature is rock-solid; but the specific lock-key constant choice is a project convention, not a verified fact. Document the chosen key in code. |
| TanStack Table grouping | HIGH | Existing 8.21 API verified via Context7; current shadcn examples use the same patterns. |
| RHF dynamic schema | HIGH | Verified Context7 examples for zodResolver + dynamic schema construction. |
| Anti-recommendation list | HIGH | Each "avoid" has a concrete reason tied to project scale and existing decisions. |
| Migration scripts (concrete SQL) | MEDIUM | SQL idioms are standard Postgres; specific column lists need cross-check vs final schema during phase planning. The structure and patterns are correct. |
