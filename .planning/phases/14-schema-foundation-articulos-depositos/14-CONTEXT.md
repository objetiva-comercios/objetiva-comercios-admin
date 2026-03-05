# Phase 14: Schema Foundation + Articulos + Depositos - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the v1.0 `products` table with the real business `articulos` model (text PK `codigo`, ~30 fields across 6 groups), add `depositos` table for warehouse management, rewrite seed data, and deliver full CRUD for both on web. Also fix Settings RBAC gap (DEBT-01) and clean unused shared exports (DEBT-04). FK migration for orders/sales/purchases is Phase 16 — NOT this phase.

</domain>

<decisions>
## Implementation Decisions

### Articulos form structure

- Single long scrollable form with visual section dividers (headers + separators)
- Sections: Identificacion, Propiedades, Precios, Imagenes, ERP, Origen
- Full-page route: `/articulos/nuevo` and `/articulos/[codigo]/editar`
- Required fields on create: `codigo` + `nombre` only — everything else optional
- Detail view: Sheet/drawer from list row click (read-only), with "Editar" button navigating to full-page form

### Monetary fields

- Articulos `precio` and `costo` use `numeric(10,2)` in Drizzle schema (returns strings, needs parseFloat on read)
- v1.0 tables (orders, sales, purchases) stay on `doublePrecision` — monetary migration deferred to v1.2+ (MONE-01)
- This resolves the MIG-07 vs STATE.md conflict: numeric(10,2) for articulos, doublePrecision unchanged elsewhere

### Articulos list & search

- Default visible columns: codigo, nombre, marca, precio, estado — others toggleable via column visibility
- Server-side search across 5 fields (codigo, SKU, barcode, ERP code, nombre) with ILIKE, debounced 300ms
- Server-side pagination with page numbers (classic admin pattern: Page 1 of N, prev/next buttons)
- Active/inactive filter: segmented control above search input (Activos | Inactivos | Todos)

### Depositos placement & UX

- Lives as a sub-section within Settings (low-frequency CRUD, doesn't warrant own nav item)
- List shows count badges per deposito: "X articulos" (distinct) + "Y unidades" (total stock) — shows 0/0 until Phase 15 existencias
- Create/edit form: inline dialog (modal) with 3 fields: nombre, direccion, descripcion
- Deactivation: soft-delete with guard — toggle activo/inactivo; if deposito has active inventarios, block deactivation; warning but allow if only has existencias

### Claude's Discretion

- Section divider visual treatment (separator line, heading size, spacing)
- Exact column widths and responsive breakpoints
- Loading skeleton design for table and form
- Error state handling (API errors, validation errors)
- Search debounce timing (suggested 300ms but flexible)
- Seed data content and volume for articulos/depositos

</decisions>

<specifics>
## Specific Ideas

- Articulo detail sheet consistent with existing ProductSheet pattern (row click opens side panel)
- Segmented control for active/inactive filter — not tabs, not dropdown
- Depositos is a "set it and forget it" section — minimal ceremony, dialog is enough
- Form sections use simple headers + separator lines, no tabs or accordions

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `DataTable` component (`@/components/tables/data-table`): Supports column visibility, sorting, filtering — will need server-side pagination/search upgrade
- `ProductSheet` (`@/components/tables/products/product-sheet`): Sheet pattern for detail view — rename/adapt for articulo
- `columns` definition (`@/components/tables/products/columns`): Column definition pattern to follow for articulos
- shadcn/ui components: `sheet.tsx`, `table.tsx`, `form.tsx`, `input.tsx`, `badge.tsx`, `tabs.tsx`, `select.tsx`, `card.tsx`, `skeleton.tsx`
- `ArticlesClient` already exists at `apps/web/src/app/(dashboard)/articles/` — wraps old Product type, needs replacement

### Established Patterns

- Backend: NestJS module pattern (controller + service + dto + module) — `apps/backend/src/modules/products/` as reference
- Drizzle schema: All tables in single `schema.ts` file with type exports via `$inferSelect/$inferInsert`
- RBAC: `@UseGuards(RolesGuard)` + `@Roles('admin')` on write endpoints
- Web routes: `(dashboard)/[section]/page.tsx` + `[section]-client.tsx` pattern

### Integration Points

- `apps/backend/src/db/schema.ts` — Add `articulos` and `depositos` tables alongside existing tables
- `apps/backend/src/db/seed.ts` — Rewrite seed for new tables
- `apps/backend/src/modules/` — New `articulos/` and `depositos/` modules
- `apps/web/src/app/(dashboard)/articles/` — Replace with articulos implementation
- `apps/web/src/app/(dashboard)/settings/` — Add depositos sub-section
- `packages/types/src/index.ts` — Clean unused exports (DEBT-04)
- `apps/backend/src/modules/settings/` — Add @Roles('admin') guards (DEBT-01)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 14-schema-foundation-articulos-depositos_
_Context gathered: 2026-03-05_
