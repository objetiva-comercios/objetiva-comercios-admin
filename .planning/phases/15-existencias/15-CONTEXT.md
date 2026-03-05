# Phase 15: Existencias - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Stock quantities per articulo per deposito with low-stock alerts and dual view modes. Includes: existencias Drizzle table (MIG-02), backend CRUD module, web UI with two views (by deposito, by articulo), inline stock editing, low-stock badges/KPIs, and type alignment (DEBT-02). Does NOT include: nav restructure (Phase 16), inventory counts (Phase 17), stock transfers (v1.2+), or audit trail (STOK-03).

</domain>

<decisions>
## Implementation Decisions

### Dual view mode

- Segmented control at top of page: "Por Deposito" | "Por Articulo" (same pattern as articulos active/inactive filter)
- Same page, same route — segmented control toggles between two table layouts
- "Por Deposito" view: dropdown above table to select active deposito, first deposito selected by default, table shows articulos with stock in that deposito
- "Por Articulo" view: matrix table with articulo rows, one column per deposito showing quantity, plus "Total" column
- Matrix view handles many depositos via horizontal scroll with frozen codigo/nombre columns on the left

### Inline stock editing

- Click-to-edit on quantity cells: click turns cell into input field, Enter to save, Escape to cancel
- Absolute value entry only (type the new quantity, not a delta)
- No adjustment reason field — audit trail deferred to v1.2+ (STOK-03)
- Inline editing works in both views: "Por Deposito" quantity column and "Por Articulo" matrix cells
- Toast confirmation on successful save

### Low-stock alerts

- Dedicated "Estado" column with color-coded badges: Normal (green/muted), Bajo (yellow/warning), Sin Stock (red/destructive)
- Status computed from: quantity vs stock_minimo threshold per articulo-deposito combo
- 3 KPI cards at the top of the page: "Total Articulos con Stock" (count), "Stock Bajo" (count, yellow), "Sin Stock" (count, red)
- KPI cards are clickable to filter the table below
- Min/max thresholds (stock_minimo, stock_maximo) are columns in the table, togglable via column visibility, inline-editable with same click-to-edit pattern

### Navigation & integration

- Existencias lives as sub-route under Articulos: /articulos/existencias
- Tabs in articulos page header: "Listado" | "Existencias" — tab navigation between the articulos list and existencias view
- No new sidebar item — existencias accessed via tab within articulos section
- Articulo detail sheet (row click) gets a new "Stock" section showing per-deposito quantities and total from existencias

### Claude's Discretion

- Exact column widths and responsive breakpoints for matrix view
- Loading skeleton design for tables and KPI cards
- Empty state design (no existencias records yet)
- Exact KPI card styling and layout
- Search/filter behavior within existencias views
- Seed data volume for existencias records

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `ServerDataTable` (`@/components/tables/server-data-table.tsx`): Server-driven table with TanStack Table — use for both views
- `Badge` component (`@/components/ui/badge.tsx`): For status badges (Normal/Bajo/Sin Stock)
- Segmented control pattern from articulos active/inactive filter — reuse for view mode toggle
- Articulo detail sheet in `/articulos/[codigo]/` — extend with stock section
- `depositos` module already in backend with full CRUD

### Established Patterns

- NestJS module pattern: controller + service + dto + module (see `apps/backend/src/modules/articulos/`)
- Drizzle schema: all tables in single `schema.ts` with `$inferSelect/$inferInsert` type exports
- ServerDataTable: manualPagination/manualFiltering/manualSorting for server-driven data
- Click-to-edit: new pattern for this phase — no existing inline edit precedent in codebase
- Tab navigation: new pattern for articulos page header (Listado | Existencias)

### Integration Points

- `apps/backend/src/db/schema.ts` — Add `existencias` table with composite key (articulo_codigo + deposito_id)
- `apps/backend/src/db/seed.ts` — Add existencias seed data
- `apps/backend/src/modules/` — New `existencias/` module
- `apps/web/src/app/(dashboard)/articulos/existencias/` — New sub-route for existencias view
- `apps/web/src/app/(dashboard)/articulos/page.tsx` — Add tab navigation (Listado | Existencias)
- Articulo detail sheet — Add stock section querying existencias
- Old `inventory` table in schema.ts — will be replaced by existencias (MIG-02)
- Web types in `apps/web/src/types/` — Align with new schema (DEBT-02)

</code_context>

<specifics>
## Specific Ideas

- Segmented control for view toggle should match the exact pattern used in articulos list (active/inactive filter)
- Matrix view (Por Articulo) with frozen left columns feels like a spreadsheet — familiar to warehouse managers
- KPI cards at the top give immediate visibility into stock health without scrolling
- Click-to-edit cells should feel snappy — no dialog, no modal, just click and type

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 15-existencias_
_Context gathered: 2026-03-05_
