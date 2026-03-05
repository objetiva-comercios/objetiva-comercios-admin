# Phase 16: Downstream Migration + Dashboard + Navigation - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

All existing modules (orders, sales, purchases, dashboard) work correctly with the new articulos model and navigation reflects the new section structure. Includes: FK migration on item tables (MIG-03), dashboard KPI rewiring (DASH-01/02/03), web sidebar cleanup (NAV-01), mobile nav + Spanish labels (NAV-02, NAV-03, DEBT-03), and deletion of old products/inventory modules and DB tables. Does NOT include: Inventarios feature (Phase 17), stock transfers (v1.2+), or KPI redesign beyond data source swap.

</domain>

<decisions>
## Implementation Decisions

### Web sidebar restructure

- Remove "Inventario" nav item entirely (Phase 17 will add "Inventarios" when the feature is built)
- Keep current sidebar order: Panel, Articulos, Compras, Ventas, Pedidos, Configuracion (no reorder)
- Delete old `/inventory` and `/articles` route directories from web app
- No placeholder pages for future sections

### Dashboard KPI migration

- Same metrics, new data sources: "Total Products" becomes "Total Articulos" (from ArticulosService), "Low Stock" queries ExistenciasService
- Low stock alerts list shows articuloCodigo + nombre (no clickable links to detail)
- Low stock definition: aggregate stock across ALL depositos per articulo; if total < stock_minimo of any deposito record, it's low stock (matches DASH-02)
- DashboardService rewired to ArticulosService + ExistenciasService, removing ProductsService + InventoryService imports

### Mobile navigation & Spanish labels

- Bottom tabs (4): Panel, Articulos, Pedidos, Ventas
- Drawer menu: Compras, Perfil, Configuracion, Cerrar sesion (all Spanish)
- Routes changed to Spanish paths: /articulos, /pedidos, /ventas, /compras (consistent with web routes)
- "Logout" button text changed to "Cerrar sesion"

### Item tables FK migration

- New column: articuloCodigo (text) referencing articulos.codigo, replacing productId (integer)
- Applies to: orderItems, saleItems, purchaseItems
- Keep denormalized columns: productName renamed to articuloNombre, sku kept as-is
- Old products and inventory tables DROPPED from Drizzle schema entirely (clean-cut, no production data)

### Old code cleanup

- Delete backend modules: products module, inventory module (controllers, services, DTOs, module files)
- Delete old seed generators: inventory.generator.ts
- Delete web routes: apps/web/src/app/(dashboard)/inventory/, apps/web/src/app/(dashboard)/articles/
- Update seed generators (order, sale, purchase) to reference articuloCodigo from seeded articulos array

### Claude's Discretion

- Exact dashboard card labels and descriptions in Spanish
- How to handle the sales chart component (likely unchanged, just verify data source)
- Recent orders list formatting after FK change
- Mobile route file organization and router config updates
- Web type file cleanup for removed types (inventory.ts, etc.)

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `DashboardService` (`apps/backend/src/modules/dashboard/dashboard.service.ts`): Central aggregation service — needs rewiring from products/inventory to articulos/existencias
- `StatsCards`, `LowStockAlerts`, `RecentOrders`, `SalesChart` (`apps/web/src/components/dashboard/`): Dashboard UI components — update props/types, keep structure
- `routes` config (`apps/web/src/config/navigation.ts`): Single source of truth for web sidebar nav items
- `BottomTabs` + `DrawerNav` (`apps/mobile/src/components/layout/`): Mobile nav components with hardcoded tab/drawer arrays

### Established Patterns

- Web nav: `routes` array in `config/navigation.ts` drives sidebar rendering (Sidebar.tsx iterates `routes`)
- Mobile nav: hardcoded `tabs` array in BottomTabs.tsx, `navItems` array in DrawerNav.tsx
- Backend dashboard: Promise.all to fetch stats from multiple services, then aggregate
- Item tables: denormalized productName/sku pattern for fast reads without joins
- Drizzle schema: all tables in single `schema.ts`, FK references via `.references(() => table.column)`
- Seed: generators in `apps/backend/src/db/generators/` return arrays, seed.ts orchestrates insertion order

### Integration Points

- `apps/backend/src/db/schema.ts` — Drop products/inventory tables, update orderItems/saleItems/purchaseItems FK columns
- `apps/backend/src/db/seed.ts` — Update insertion order (articulos first, then orders/sales/purchases that reference them)
- `apps/backend/src/db/generators/` — Update order/sale/purchase generators to use articuloCodigo
- `apps/backend/src/modules/dashboard/` — Rewire service imports and stats aggregation
- `apps/backend/src/modules/` — Delete products/ and inventory/ directories
- `apps/web/src/config/navigation.ts` — Remove Inventario item
- `apps/web/src/app/(dashboard)/` — Delete articles/ and inventory/ directories
- `apps/web/src/types/` — Update order/sale/purchase types, remove inventory.ts
- `apps/mobile/src/components/layout/BottomTabs.tsx` — Update tabs array
- `apps/mobile/src/components/layout/DrawerNav.tsx` — Update navItems array + labels
- `apps/mobile/src/` — Update route definitions and paths

</code_context>

<specifics>
## Specific Ideas

- Clean-cut migration: db:push drops old tables, re-seed creates everything fresh — no migration scripts needed
- Mobile routes should match web routes for consistency (/articulos not /articles)
- Dashboard is a data source swap, not a visual redesign — keep the same layout and card structure
- Low stock aggregation across depositos gives a business-level view (not warehouse-level)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 16-downstream-migration-dashboard-navigation_
_Context gathered: 2026-03-05_
