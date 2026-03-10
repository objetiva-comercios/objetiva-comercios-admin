# Phase 15: Existencias - Research

**Researched:** 2026-03-05
**Domain:** Inventory stock management (Drizzle ORM schema, NestJS CRUD, Next.js data tables with inline editing)
**Confidence:** HIGH

## Summary

Phase 15 introduces the `existencias` table (stock quantities per articulo per deposito) with a composite primary key, a NestJS backend module with specialized query endpoints for two view modes, and a web UI featuring dual-view tables (por deposito / por articulo matrix), inline cell editing, low-stock badges, and KPI cards. The phase also resolves MIG-02 (replacing old `inventory` table) and DEBT-02 (web type alignment).

The codebase has well-established patterns from Phase 14: NestJS module structure (controller + service + DTOs), Drizzle schema with `$inferSelect/$inferInsert` type exports, `ServerDataTable` with TanStack Table for server-driven pagination, segmented control for view filters, and `ArticuloSheet` for detail views. The new patterns introduced are: inline click-to-edit cells (no existing precedent), tab navigation within a page header, and a matrix/pivot table view.

**Primary recommendation:** Follow the Phase 14 module pattern exactly for the backend. For the web, extend the existing `ServerDataTable` with custom cell renderers for inline editing rather than building a separate table component. The matrix view (Por Articulo) needs a dedicated component due to its fundamentally different column structure (dynamic deposito columns).

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Dual view mode: segmented control "Por Deposito" | "Por Articulo" on same page/route
- "Por Deposito" view: dropdown to select active deposito, first selected by default, table shows articulos with stock
- "Por Articulo" view: matrix table with articulo rows, deposito columns, "Total" column, horizontal scroll with frozen left columns
- Inline stock editing: click-to-edit on quantity cells, absolute value entry, Enter to save, Escape to cancel
- No adjustment reason field (audit trail deferred to v1.2+/STOK-03)
- Inline editing works in both views
- Toast confirmation on save
- "Estado" column with badges: Normal (green/muted), Bajo (yellow/warning), Sin Stock (red/destructive)
- Status computed from quantity vs stock_minimo
- 3 KPI cards: "Total Articulos con Stock", "Stock Bajo" (yellow), "Sin Stock" (red)
- KPI cards clickable to filter table
- stock_minimo and stock_maximo are inline-editable columns with togglable visibility
- Navigation: existencias as sub-route under /articulos/existencias
- Tab navigation in articulos header: "Listado" | "Existencias"
- Articulo detail sheet gets "Stock" section with per-deposito quantities

### Claude's Discretion

- Exact column widths and responsive breakpoints for matrix view
- Loading skeleton design for tables and KPI cards
- Empty state design (no existencias records yet)
- Exact KPI card styling and layout
- Search/filter behavior within existencias views
- Seed data volume for existencias records

### Deferred Ideas (OUT OF SCOPE)

None

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                         | Research Support                                                                                     |
| ------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| EXI-01  | View stock per articulo per deposito with low-stock badges          | Existencias table schema + "Por Deposito" view with Badge component variants                         |
| EXI-02  | Filter existencias by deposito (warehouse manager view)             | "Por Deposito" segmented view + deposito dropdown filter                                             |
| EXI-03  | View stock for articulo across all depositos (product manager view) | "Por Articulo" matrix view with dynamic deposito columns                                             |
| EXI-04  | Total stock aggregation across depositos per articulo               | SQL SUM aggregation + "Total" column in matrix view                                                  |
| EXI-05  | Inline-edit stock quantities with adjustment reason                 | Click-to-edit cell pattern (reason deferred per CONTEXT.md)                                          |
| EXI-06  | Low stock alerts when below stock_minimo                            | Computed status field + Badge variants + KPI cards                                                   |
| EXI-07  | Min/max thresholds per articulo-deposito                            | stock_minimo/stock_maximo columns in existencias table, inline-editable                              |
| MIG-02  | Inventory table replaced by existencias                             | New existencias table with composite key, old inventory table untouched (still used by v1.0 modules) |
| DEBT-02 | Web type drift resolved                                             | Create Existencia interface in web types matching Drizzle schema output                              |

</phase_requirements>

## Standard Stack

### Core (already in project)

| Library           | Version           | Purpose                                | Why Standard                    |
| ----------------- | ----------------- | -------------------------------------- | ------------------------------- |
| Drizzle ORM       | (project version) | Schema definition + queries            | Already used for all tables     |
| NestJS            | (project version) | Backend API module                     | All modules follow same pattern |
| TanStack Table    | (project version) | Table rendering with manual pagination | Used by `ServerDataTable`       |
| shadcn/ui         | (project version) | Badge, Sheet, Table, Input components  | Project UI system               |
| class-validator   | (project version) | DTO validation in NestJS               | All DTOs use this               |
| class-transformer | (project version) | Query param transformation             | All query DTOs use this         |

### Supporting (already in project)

| Library      | Version           | Purpose                          | When to Use              |
| ------------ | ----------------- | -------------------------------- | ------------------------ |
| lucide-react | (project version) | Icons for KPI cards, UI elements | Throughout UI            |
| date-fns     | (project version) | Date formatting in detail views  | Stock update timestamps  |
| sonner/toast | (project version) | Toast notifications on save      | Inline edit confirmation |

### No New Dependencies Needed

All requirements can be met with existing project dependencies. No new packages needed.

## Architecture Patterns

### Backend Module Structure

```
apps/backend/src/modules/existencias/
  existencias.module.ts       # NestJS module
  existencias.controller.ts   # REST endpoints
  existencias.service.ts      # Business logic + Drizzle queries
  dto/
    existencia-query.dto.ts   # Query params (depositoId, articuloCodigo, filters)
    update-existencia.dto.ts  # PATCH body (cantidad, stock_minimo, stock_maximo)
    create-existencia.dto.ts  # POST body (articuloCodigo, depositoId, cantidad, thresholds)
```

### Web Route Structure

```
apps/web/src/app/(dashboard)/articulos/
  page.tsx                     # Add tab navigation (Listado | Existencias)
  articulos-client.tsx         # Existing — wrapped under "Listado" tab
  existencias/
    page.tsx                   # Server component, initial data fetch
    existencias-client.tsx     # Client component with dual-view logic
apps/web/src/components/existencias/
  existencias-kpi-cards.tsx    # 3 KPI cards (total, bajo, sin stock)
  existencias-por-deposito.tsx # Table view filtered by deposito
  existencias-por-articulo.tsx # Matrix/pivot view with deposito columns
  inline-edit-cell.tsx         # Reusable click-to-edit cell component
  existencias-columns.tsx      # TanStack column definitions for "Por Deposito" view
apps/web/src/types/
  existencia.ts                # Existencia type interface (DEBT-02)
```

### Schema Pattern: Composite Primary Key

```typescript
// Drizzle composite PK for existencias
import { pgTable, integer, text, timestamp, primaryKey, index } from 'drizzle-orm/pg-core'

export const existencias = pgTable(
  'existencias',
  {
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    cantidad: integer('cantidad').notNull().default(0),
    stockMinimo: integer('stock_minimo').notNull().default(0),
    stockMaximo: integer('stock_maximo').notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.articuloCodigo, table.depositoId] }),
    index('existencias_deposito_id_idx').on(table.depositoId),
    index('existencias_articulo_codigo_idx').on(table.articuloCodigo),
  ]
)
```

**Confidence: HIGH** - Drizzle `primaryKey()` in the third argument is the established pattern for composite keys.

### Pattern: Click-to-Edit Cell

```typescript
// Inline edit cell component pattern
interface InlineEditCellProps {
  value: number
  onSave: (newValue: number) => Promise<void>
}

function InlineEditCell({ value, onSave }: InlineEditCellProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value.toString())
  const inputRef = useRef<HTMLInputElement>(null)

  // Click to enter edit mode
  // Enter to save, Escape to cancel
  // useEffect to focus input when editing starts
  // onBlur to cancel (or save — user decision)
}
```

**Key behaviors:**

- Click on cell -> show Input, auto-focus, select all text
- Enter -> call PATCH API, show toast on success, exit edit mode
- Escape -> revert to original value, exit edit mode
- Tab -> save current, move to next editable cell (optional enhancement)

### Pattern: Tab Navigation in Page Header

```typescript
// Articulos page with tab navigation
// Use Next.js Link with pathname check for active state
// OR use a client-side state since both views are under /articulos
<div className="flex items-center gap-4 border-b">
  <Link href="/articulos" className={cn("tab-styles", isListado && "active-styles")}>
    Listado
  </Link>
  <Link href="/articulos/existencias" className={cn("tab-styles", isExistencias && "active-styles")}>
    Existencias
  </Link>
</div>
```

**Recommendation:** Use Next.js `<Link>` with `usePathname()` for active state detection. This keeps each view as its own route with independent data loading while sharing the page header.

### Pattern: Matrix View with Frozen Columns

The "Por Articulo" matrix view has dynamic columns (one per deposito). This cannot use the standard `ServerDataTable` directly because column definitions change based on deposito data.

```typescript
// Matrix view approach:
// 1. Fetch all depositos (for column headers)
// 2. Fetch existencias grouped by articulo
// 3. Build dynamic TanStack columns: [codigo, nombre, ...depositos.map(d => col), total]
// 4. Frozen left columns via CSS: sticky positioning on codigo/nombre columns

const columns = useMemo(() => {
  const fixed: ColumnDef[] = [
    { accessorKey: 'codigo', header: 'Codigo', meta: { frozen: true } },
    { accessorKey: 'nombre', header: 'Nombre', meta: { frozen: true } },
  ]
  const dynamic = depositos.map(d => ({
    id: `dep-${d.id}`,
    header: d.nombre,
    cell: ({ row }) => <InlineEditCell value={row.original.stock[d.id] ?? 0} ... />,
  }))
  const total = { id: 'total', header: 'Total', cell: ... }
  return [...fixed, ...dynamic, total]
}, [depositos])
```

**Frozen columns CSS:**

```css
/* Applied via className on the sticky columns */
.sticky-col {
  position: sticky;
  left: 0; /* or calculated offset for second column */
  z-index: 1;
  background: hsl(var(--background)); /* Must have bg to cover scrolled content */
}
```

### Anti-Patterns to Avoid

- **Building a custom table from scratch:** Use TanStack Table for both views, even the matrix. Only the column definitions differ.
- **Fetching all existencias client-side for filtering:** Keep server-driven queries. The "Por Deposito" view should pass `depositoId` to the API.
- **Storing computed status in DB:** Compute Normal/Bajo/Sin Stock at query time or client-side from `cantidad` vs `stock_minimo`. No status column in the schema.
- **Using the old `inventory` table:** Leave it untouched for v1.0 modules but don't reference it in new code.

## Don't Hand-Roll

| Problem              | Don't Build                | Use Instead                                 | Why                                                 |
| -------------------- | -------------------------- | ------------------------------------------- | --------------------------------------------------- |
| Table rendering      | Custom HTML table          | TanStack Table via ServerDataTable          | Column visibility, sorting, pagination already work |
| Status badges        | Custom colored spans       | shadcn Badge with variant prop              | Consistent styling, already used in codebase        |
| Toast notifications  | Custom notification system | sonner (already in project) or shadcn toast | Edge cases (stacking, auto-dismiss)                 |
| Segmented control    | Custom radio buttons       | Copy ArticuloStatusFilter pattern           | Already battle-tested in the project                |
| Composite PK queries | Raw SQL                    | Drizzle `and(eq(), eq())` conditions        | Type safety, consistent with codebase               |

## Common Pitfalls

### Pitfall 1: Drizzle Composite PK Query Syntax

**What goes wrong:** Trying to use `.where(eq(existencias.pk, value))` — composite PKs have no single field.
**Why it happens:** Single-PK tables use `eq(table.id, value)`. Composite PKs need `and()`.
**How to avoid:** Always use `and(eq(existencias.articuloCodigo, codigo), eq(existencias.depositoId, depositoId))` for single-row operations.
**Warning signs:** TypeScript error on non-existent `id` field.

### Pitfall 2: Matrix View Performance with Many Depositos x Articulos

**What goes wrong:** Fetching all articulos x all depositos creates N\*M cells, potentially thousands.
**Why it happens:** Matrix view is essentially a pivot table.
**How to avoid:** Server-side pagination on articulos (rows). Depositos are typically few (3-10), so columns are manageable. If deposito count grows, the horizontal scroll with frozen columns handles it.
**Warning signs:** Slow page load, browser memory issues.

### Pitfall 3: Optimistic UI vs Server State on Inline Edit

**What goes wrong:** User edits a cell, sees old value flash back before server response.
**Why it happens:** Re-fetching data after PATCH overwrites the optimistic update.
**How to avoid:** Update local state immediately on save, only revert if PATCH fails. Don't re-fetch the entire table after each cell edit.
**Warning signs:** Flickering values in cells after editing.

### Pitfall 4: Type Drift Between Backend Drizzle and Web Types (DEBT-02)

**What goes wrong:** Web `Existencia` interface doesn't match what the API actually returns.
**Why it happens:** Drizzle numeric fields return strings, timestamps serialize differently, computed fields (like status or articulo name) may be joined.
**How to avoid:** Define the web Existencia type to match the actual API response shape, not the raw Drizzle schema. Include joined fields like `articuloNombre` if the API returns them.
**Warning signs:** TypeScript errors in components, runtime `undefined` values.

### Pitfall 5: Tab Navigation Breaking Existing Articulos Page State

**What goes wrong:** Navigating from Existencias back to Listado loses search/filter state.
**Why it happens:** Next.js route changes cause full re-render of page components.
**How to avoid:** Each tab is its own route with independent state. Don't try to share state between tabs. The existing articulos page already handles its own state initialization via server component props.
**Warning signs:** Filters resetting on tab switch.

### Pitfall 6: Deposito stockSummary Still Hardcoded to Zeros

**What goes wrong:** The depositos list shows 0 items / 0 units even after existencias data exists.
**Why it happens:** `DepositosService.findAll()` currently returns hardcoded `{ totalArticulos: 0, totalUnidades: 0 }`.
**How to avoid:** Update depositos service to aggregate from existencias table. This is a natural integration point.
**Warning signs:** Depositos settings page showing zero stock.

## Code Examples

### Existencias Schema Definition

```typescript
// apps/backend/src/db/schema.ts
export const existencias = pgTable(
  'existencias',
  {
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    depositoId: integer('deposito_id')
      .notNull()
      .references(() => depositos.id, { onDelete: 'restrict' }),
    cantidad: integer('cantidad').notNull().default(0),
    stockMinimo: integer('stock_minimo').notNull().default(0),
    stockMaximo: integer('stock_maximo').notNull().default(0),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  table => [
    primaryKey({ columns: [table.articuloCodigo, table.depositoId] }),
    index('existencias_deposito_id_idx').on(table.depositoId),
    index('existencias_articulo_codigo_idx').on(table.articuloCodigo),
  ]
)

export type Existencia = typeof existencias.$inferSelect
export type NewExistencia = typeof existencias.$inferInsert
```

### Backend Query: Por Deposito View

```typescript
// Fetch existencias for a specific deposito with joined articulo info
async findByDeposito(depositoId: number, query: ExistenciaQueryDto) {
  const conditions = [eq(existencias.depositoId, depositoId)]
  if (query.search) {
    conditions.push(
      or(
        ilike(articulos.nombre, `%${query.search}%`),
        ilike(articulos.codigo, `%${query.search}%`)
      )
    )
  }

  const data = await this.drizzle.db
    .select({
      articuloCodigo: existencias.articuloCodigo,
      depositoId: existencias.depositoId,
      cantidad: existencias.cantidad,
      stockMinimo: existencias.stockMinimo,
      stockMaximo: existencias.stockMaximo,
      updatedAt: existencias.updatedAt,
      articuloNombre: articulos.nombre,
      articuloSku: articulos.sku,
    })
    .from(existencias)
    .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
    .where(and(...conditions))
    .orderBy(asc(articulos.nombre))
    .limit(limit)
    .offset(offset)

  return data
}
```

### Backend Query: Por Articulo Matrix View

```typescript
// Fetch all existencias grouped for matrix display
async findMatrix(query: ExistenciaQueryDto) {
  // Get existencias with articulo info, paginated by articulo
  const data = await this.drizzle.db
    .select({
      articuloCodigo: existencias.articuloCodigo,
      depositoId: existencias.depositoId,
      cantidad: existencias.cantidad,
      stockMinimo: existencias.stockMinimo,
      stockMaximo: existencias.stockMaximo,
      articuloNombre: articulos.nombre,
    })
    .from(existencias)
    .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
    .where(conditions)
    .orderBy(asc(articulos.nombre))

  // Client transforms flat rows into matrix structure
  return data
}
```

### Backend: KPI Aggregation Endpoint

```typescript
// GET /api/existencias/kpi
async getKpiStats() {
  const stats = await this.drizzle.db
    .select({
      totalConStock: count(sql`CASE WHEN ${existencias.cantidad} > 0 THEN 1 END`),
      stockBajo: count(sql`CASE WHEN ${existencias.cantidad} > 0
        AND ${existencias.cantidad} <= ${existencias.stockMinimo} THEN 1 END`),
      sinStock: count(sql`CASE WHEN ${existencias.cantidad} = 0 THEN 1 END`),
    })
    .from(existencias)

  return stats[0]
}
```

### Backend: PATCH Single Existencia

```typescript
// PATCH /api/existencias/:articuloCodigo/:depositoId
async updateStock(articuloCodigo: string, depositoId: number, dto: UpdateExistenciaDto) {
  const rows = await this.drizzle.db
    .update(existencias)
    .set({
      ...(dto.cantidad !== undefined ? { cantidad: dto.cantidad } : {}),
      ...(dto.stockMinimo !== undefined ? { stockMinimo: dto.stockMinimo } : {}),
      ...(dto.stockMaximo !== undefined ? { stockMaximo: dto.stockMaximo } : {}),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(existencias.articuloCodigo, articuloCodigo),
        eq(existencias.depositoId, depositoId)
      )
    )
    .returning()

  if (!rows[0]) throw new NotFoundException('Existencia no encontrada')
  return rows[0]
}
```

### Web Type: Existencia Interface (DEBT-02)

```typescript
// apps/web/src/types/existencia.ts
export interface Existencia {
  articuloCodigo: string
  depositoId: number
  cantidad: number
  stockMinimo: number
  stockMaximo: number
  updatedAt: string // Date serialized as string from API
  // Joined fields from API
  articuloNombre: string
  articuloSku: string | null
}

export type StockStatus = 'normal' | 'bajo' | 'sin_stock'

export function getStockStatus(cantidad: number, stockMinimo: number): StockStatus {
  if (cantidad === 0) return 'sin_stock'
  if (stockMinimo > 0 && cantidad <= stockMinimo) return 'bajo'
  return 'normal'
}

export interface ExistenciasKpi {
  totalConStock: number
  stockBajo: number
  sinStock: number
}
```

## State of the Art

| Old Approach                                           | Current Approach                                | When Changed       | Impact                                 |
| ------------------------------------------------------ | ----------------------------------------------- | ------------------ | -------------------------------------- |
| `inventory` table (1 row per product, single location) | `existencias` table (per articulo per deposito) | Phase 15 (MIG-02)  | Multi-warehouse stock tracking         |
| `products.stock` field                                 | Derived from existencias aggregation            | Phase 15           | Stock is no longer a product attribute |
| `Inventory` web type with old fields                   | `Existencia` web type matching new schema       | Phase 15 (DEBT-02) | Type alignment                         |

**Note on old inventory table:** The old `inventory` table and related module/type should NOT be deleted yet. They're still referenced by v1.0 dashboard and inventory pages. They will be cleaned up in Phase 16 (nav restructure). Phase 15 adds the NEW `existencias` alongside the old `inventory`.

## Open Questions

1. **Should existencias records be auto-created?**
   - What we know: User can inline-edit stock, but what if no existencia row exists for an articulo+deposito combo?
   - What's unclear: Should the system pre-create zero-quantity rows for all combos, or create on first edit?
   - Recommendation: Seed with data for realistic demo. For production, use upsert (INSERT ON CONFLICT UPDATE) in the PATCH endpoint so editing a non-existent row creates it. This avoids managing a sparse matrix.

2. **KPI card filtering interaction**
   - What we know: KPI cards are clickable to filter the table
   - What's unclear: Does clicking "Stock Bajo" filter the current view (respecting deposito selection) or switch to a cross-deposito filter?
   - Recommendation: Apply as additional filter on top of current view state. Clicking "Stock Bajo" shows only bajo-stock items in the currently selected deposito (or across all in matrix view).

3. **Deposito stockSummary update scope**
   - What we know: `depositos.service.ts` returns hardcoded zeros for stockSummary
   - What's unclear: Should this be updated in Phase 15 or deferred?
   - Recommendation: Update in Phase 15 since existencias data now exists. Aggregate from existencias table in the depositos findAll query.

## Sources

### Primary (HIGH confidence)

- Codebase analysis: `apps/backend/src/db/schema.ts` - existing table patterns, Drizzle column types, index syntax
- Codebase analysis: `apps/backend/src/modules/articulos/` - complete NestJS module pattern (controller, service, DTOs, query)
- Codebase analysis: `apps/web/src/components/tables/server-data-table.tsx` - TanStack Table integration pattern
- Codebase analysis: `apps/web/src/components/articulos/articulo-status-filter.tsx` - segmented control pattern
- Codebase analysis: `apps/web/src/app/(dashboard)/articulos/` - page structure, client component pattern, data fetching
- Codebase analysis: `apps/web/src/types/articulo.ts` - type interface pattern matching Drizzle output
- Codebase analysis: `apps/web/src/lib/api.client.ts` - client-side API call pattern with auth headers

### Secondary (MEDIUM confidence)

- Drizzle ORM composite primary key syntax - consistent with Drizzle docs for `primaryKey()` helper
- TanStack Table dynamic columns - standard approach, no special API needed

### Tertiary (LOW confidence)

- CSS sticky columns for frozen matrix view - browser support is universal but z-index/background interactions need testing

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - all libraries already in project, no new dependencies
- Architecture: HIGH - follows exact patterns from Phase 14 codebase
- Schema design: HIGH - composite PK is standard Drizzle pattern, verified against existing table definitions
- Inline editing: MEDIUM - new pattern for this codebase, but implementation is straightforward React state management
- Matrix view: MEDIUM - dynamic columns with TanStack Table work but frozen column CSS needs careful implementation
- Pitfalls: HIGH - identified from codebase analysis (hardcoded zeros, type drift, composite PK queries)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, no external API dependencies)
