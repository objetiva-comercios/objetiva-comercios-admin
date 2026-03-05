# Phase 16: Downstream Migration + Dashboard + Navigation - Research

**Researched:** 2026-03-05
**Domain:** Schema migration, dashboard rewiring, navigation cleanup
**Confidence:** HIGH

## Summary

Phase 16 is a **housekeeping phase** that completes the migration from the old products/inventory model to the new articulos/existencias model. The work spans four domains: (1) updating FK columns on orderItems, saleItems, purchaseItems to reference articuloCodigo instead of productId, (2) rewiring the DashboardService from ProductsService+InventoryService to ArticulosService+ExistenciasService, (3) cleaning up web navigation and deleting dead route directories, and (4) updating mobile navigation labels to Spanish with new route paths.

All changes follow established patterns already present in the codebase. The schema uses clean-cut migration (db:push + re-seed) so no production data migration scripts are needed. The dashboard is a data source swap, not a redesign. Navigation changes are array edits in config files.

**Primary recommendation:** Execute in dependency order -- schema + seed first, then backend services, then frontend (web + mobile). Each domain is well-scoped and low-risk.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- Web sidebar: Remove "Inventario" nav item entirely (Phase 17 adds "Inventarios"). Keep order: Panel, Articulos, Compras, Ventas, Pedidos, Configuracion. Delete old /inventory and /articles route directories. No placeholder pages.
- Dashboard KPIs: Same metrics, new data sources. "Total Products" becomes "Total Articulos" (ArticulosService). "Low Stock" queries ExistenciasService. Low stock = aggregate across ALL depositos per articulo; if total < stock_minimo of any deposito record. DashboardService rewired to ArticulosService + ExistenciasService.
- Low stock alerts: Show articuloCodigo + nombre (no clickable links to detail).
- Mobile nav: Bottom tabs (4): Panel, Articulos, Pedidos, Ventas. Drawer: Compras, Perfil, Configuracion, Cerrar sesion. Routes: /articulos, /pedidos, /ventas, /compras. "Logout" -> "Cerrar sesion".
- Item tables FK: New column articuloCodigo (text) referencing articulos.codigo, replacing productId (integer). Applies to orderItems, saleItems, purchaseItems. Rename productName -> articuloNombre. Keep sku as-is.
- Old code cleanup: Delete backend products + inventory modules. Delete inventory.generator.ts. Delete web articles/ and inventory/ directories. Update seed generators for orders/sales/purchases to reference articuloCodigo.
- Old products and inventory tables DROPPED from Drizzle schema entirely (clean-cut, no production data).

### Claude's Discretion

- Exact dashboard card labels and descriptions in Spanish
- How to handle the sales chart component (likely unchanged, just verify data source)
- Recent orders list formatting after FK change
- Mobile route file organization and router config updates
- Web type file cleanup for removed types (inventory.ts, etc.)

### Deferred Ideas (OUT OF SCOPE)

None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                          | Research Support                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| MIG-03  | Order items, sale items, purchase items FK updated from productId (integer) to articuloCodigo (text) | Schema changes in schema.ts, seed generator updates, backend service/DTO updates         |
| DASH-01 | Dashboard KPI cards updated to query articulos instead of products                                   | DashboardService rewiring, ArticulosService getStats method, StatsCards label updates    |
| DASH-02 | Dashboard low stock alerts query existencias aggregated across depositos                             | New ExistenciasService method for aggregated low stock, LowStockAlerts component rewrite |
| DASH-03 | Dashboard revenue/sales metrics updated to reference articuloCodigo                                  | RecentOrders component update (articuloNombre in items), SalesChart verify unchanged     |
| NAV-01  | Web sidebar updated: remove "Inventario", keep current items                                         | navigation.ts config update, delete articles/ and inventory/ route directories           |
| NAV-02  | Mobile navigation updated with new section names and routes                                          | BottomTabs.tsx, DrawerNav.tsx array updates, SplashGate.tsx route config                 |
| NAV-03  | Depositos accessible from settings or as standalone nav item                                         | Already accessible at /settings/depositos (Phase 14 pattern), no additional nav needed   |
| DEBT-03 | Mobile navigation labels localized to Spanish                                                        | BottomTabs + DrawerNav label changes, "Logout" -> "Cerrar sesion"                        |

</phase_requirements>

## Standard Stack

### Core (already in project)

| Library      | Version           | Purpose                                   | Relevance                      |
| ------------ | ----------------- | ----------------------------------------- | ------------------------------ |
| Drizzle ORM  | (project version) | Schema definition, FK references, queries | Schema changes for item tables |
| NestJS       | (project version) | Backend modules, DI, services             | Dashboard module rewiring      |
| Next.js 14   | (project version) | Web app routing, server components        | Route directory cleanup        |
| React Router | (project version) | Mobile routing (HashRouter)               | Route path updates             |

### No new dependencies needed

This phase modifies existing code only. No new packages required.

## Architecture Patterns

### Pattern 1: FK Column Migration (Clean-Cut)

**What:** Replace `productId: integer` FK with `articuloCodigo: text` FK on item tables
**When:** Clean-cut migration (db:push drops/recreates, re-seed populates)
**Current state in schema.ts:**

```typescript
// Current (lines 73-75):
productId: integer('product_id')
  .notNull()
  .references(() => products.id, { onDelete: 'restrict' }),
productName: varchar('product_name', { length: 255 }).notNull(),

// Target:
articuloCodigo: text('articulo_codigo')
  .notNull()
  .references(() => articulos.codigo, { onDelete: 'restrict' }),
articuloNombre: varchar('articulo_nombre', { length: 255 }).notNull(),
```

**Applies to:** `orderItems` (line 66), `saleItems` (line 137), `purchaseItems` (line 185)

### Pattern 2: Dashboard Service Rewiring

**What:** Replace ProductsService+InventoryService with ArticulosService+ExistenciasService in DashboardService
**Current DashboardService imports:** ProductsService, OrdersService, InventoryService, SalesService, PurchasesService
**Target imports:** ArticulosService, OrdersService, ExistenciasService, SalesService, PurchasesService
**Key changes:**

- `productStats.total` -> articulos count (total + active)
- `inventoryStats.byStatus.low_stock` -> existencias aggregated low stock count
- `inventoryStats.lowStockItems` -> new aggregated low stock query from ExistenciasService

### Pattern 3: Seed Generator Update

**What:** Order/sale/purchase generators currently take `GeneratedProduct[]` and pick random productId/productName/sku. Must change to take articulo data and pick articuloCodigo/articuloNombre/sku.
**Current pattern (order.generator.ts):**

```typescript
export function generateOrders(count: number, products: GeneratedProduct[]): GeneratedOrder[]
// Inside: picks random product, uses product.id, product.name, product.sku
```

**Target pattern:**

```typescript
export function generateOrders(
  count: number,
  articulos: { codigo: string; nombre: string; sku: string | null }[]
): GeneratedOrder[]
// Inside: picks random articulo, uses articulo.codigo, articulo.nombre, articulo.sku
```

### Pattern 4: Navigation Config Arrays

**What:** Both web and mobile navigation are driven by simple arrays
**Web:** `routes` array in `apps/web/src/config/navigation.ts` -- remove Inventario item
**Mobile BottomTabs:** `tabs` array -- change labels/paths to Spanish
**Mobile DrawerNav:** `navItems` array -- change labels to Spanish, "Logout" -> "Cerrar sesion"
**Mobile routes:** `SplashGate.tsx` -- rename /articles -> /articulos, /orders -> /pedidos, /sales -> /ventas, /purchases -> /compras, /inventory -> remove

### Anti-Patterns to Avoid

- **Leaving dead imports:** After deleting products/inventory modules, ensure no orphan imports remain in app.module.ts, dashboard.module.ts, or seed.ts
- **Forgetting type exports:** schema.ts exports Product, NewProduct, InventoryItem, NewInventoryItem types that must be removed
- **Partial rename:** All three item tables (orderItems, saleItems, purchaseItems) must be updated together -- partial migration breaks db:push

## Don't Hand-Roll

| Problem              | Don't Build                         | Use Instead                          | Why                                                 |
| -------------------- | ----------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Aggregated low stock | Custom SQL in DashboardService      | New method on ExistenciasService     | Keeps aggregation logic in one place                |
| Articulo stats       | New stats query in DashboardService | Add `getStats()` to ArticulosService | Follows existing pattern (ProductsService.getStats) |

## Common Pitfalls

### Pitfall 1: TRUNCATE Order in Seed

**What goes wrong:** After dropping products/inventory tables from schema, the TRUNCATE statement in seed.ts still references them
**Why it happens:** seed.ts has hardcoded table names in its TRUNCATE SQL
**How to avoid:** Update TRUNCATE to remove `inventory, products` and keep only current tables. Also remove product/inventory generator imports.

### Pitfall 2: Dashboard Module Import Chain

**What goes wrong:** DashboardModule imports ProductsModule and InventoryModule. After deleting those modules, NestJS crashes on startup.
**How to avoid:** Update dashboard.module.ts imports BEFORE deleting the old modules, or do it in the same task. Replace with ArticulosModule + ExistenciasModule.

### Pitfall 3: AppModule Still Importing Deleted Modules

**What goes wrong:** app.module.ts imports ProductsModule and InventoryModule on lines 6,8. Deleting directories without updating this file crashes the app.
**How to avoid:** Remove ProductsModule and InventoryModule from app.module.ts imports array.

### Pitfall 4: Web Type Files Left Behind

**What goes wrong:** `apps/web/src/types/product.ts` and `apps/web/src/types/inventory.ts` remain after module deletion, creating confusion
**How to avoid:** Delete these type files. Check for any remaining imports (product-sheet.tsx, api.client.ts fetchProductById).

### Pitfall 5: LowStockAlerts Uses ProductSheet

**What goes wrong:** `low-stock-alerts.tsx` imports `ProductSheet` and `fetchProductById` -- both reference the old products model
**How to avoid:** Per CONTEXT.md decision, low stock alerts should show articuloCodigo + nombre with NO clickable links. Simplify the component by removing the sheet/click behavior entirely.

### Pitfall 6: Mobile Page Components Imported by Old Names

**What goes wrong:** SplashGate.tsx lazy-loads page components like `Articles`, `Inventory` -- paths and component names need updating
**How to avoid:** Rename page files (Articles.tsx -> Articulos.tsx, etc.) or update import paths. Check both the import and the Route element.

## Code Examples

### Schema: Item Table FK Change

```typescript
// orderItems (same pattern for saleItems, purchaseItems)
export const orderItems = pgTable(
  'order_items',
  {
    id: serial('id').primaryKey(),
    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    articuloCodigo: text('articulo_codigo')
      .notNull()
      .references(() => articulos.codigo, { onDelete: 'restrict' }),
    articuloNombre: varchar('articulo_nombre', { length: 255 }).notNull(),
    sku: varchar('sku', { length: 20 }).notNull(),
    quantity: integer('quantity').notNull(),
    price: doublePrecision('price').notNull(),
    subtotal: doublePrecision('subtotal').notNull(),
  },
  table => [index('order_items_order_id_idx').on(table.orderId)]
)
```

### ArticulosService: Add getStats()

```typescript
async getStats() {
  const [result] = await this.drizzle.db
    .select({
      total: count(),
      active: count(sql`CASE WHEN ${articulos.activo} = true THEN 1 END`),
    })
    .from(articulos)
  return { total: result.total, active: result.active }
}
```

### ExistenciasService: Add Aggregated Low Stock Query

```typescript
async getLowStockAggregated(limit = 5) {
  // Aggregate stock across all depositos per articulo
  // Compare total against any deposito's stock_minimo
  const rows = await this.drizzle.db
    .select({
      articuloCodigo: existencias.articuloCodigo,
      articuloNombre: articulos.nombre,
      totalCantidad: sum(existencias.cantidad),
      minStockMinimo: sql<number>`min(${existencias.stockMinimo})`,
    })
    .from(existencias)
    .innerJoin(articulos, eq(existencias.articuloCodigo, articulos.codigo))
    .groupBy(existencias.articuloCodigo, articulos.nombre)
    .having(
      and(
        sql`min(${existencias.stockMinimo}) > 0`,
        sql`sum(${existencias.cantidad}) <= min(${existencias.stockMinimo})`
      )
    )
    .limit(limit)
  return rows
}
```

### DashboardService: Rewired

```typescript
// Imports change:
import { ArticulosService } from '../articulos/articulos.service'
import { ExistenciasService } from '../existencias/existencias.service'

// Constructor:
constructor(
  private articulosService: ArticulosService,
  private ordersService: OrdersService,
  private existenciasService: ExistenciasService,
  private salesService: SalesService,
  private purchasesService: PurchasesService,
) {}

// In getKpis():
const [salesStats, orderStats, articuloStats, lowStockItems, purchaseStats, allOrders] =
  await Promise.all([
    this.salesService.getStats(),
    this.ordersService.getStats(),
    this.articulosService.getStats(),
    this.existenciasService.getLowStockAggregated(5),
    this.purchasesService.getStats(),
    this.ordersService.findAll({ page: 1, limit: 5 }),
  ])
```

### Navigation: Web Sidebar Update

```typescript
// Remove Inventario entry from routes array in navigation.ts
// Remove: { label: 'Inventario', icon: Warehouse, href: '/inventory' }
// Also remove Warehouse import from lucide-react
```

### Navigation: Mobile BottomTabs

```typescript
const tabs = [
  { to: '/dashboard', label: 'Panel', icon: LayoutDashboard },
  { to: '/articulos', label: 'Articulos', icon: Package },
  { to: '/pedidos', label: 'Pedidos', icon: ClipboardList },
  { to: '/ventas', label: 'Ventas', icon: ShoppingBag },
]
```

### Navigation: Mobile DrawerNav

```typescript
const navItems = [
  { to: '/compras', label: 'Compras', icon: ShoppingCart },
  { to: '/profile', label: 'Perfil', icon: UserCircle },
  { to: '/settings', label: 'Configuracion', icon: Settings },
]
// Logout button: "Cerrar sesion"
```

## Files Inventory

### Files to DELETE

| File/Directory                                          | Reason                                                |
| ------------------------------------------------------- | ----------------------------------------------------- |
| `apps/backend/src/modules/products/`                    | Old module replaced by articulos                      |
| `apps/backend/src/modules/inventory/`                   | Old module replaced by existencias                    |
| `apps/backend/src/db/generators/product.generator.ts`   | Old generator                                         |
| `apps/backend/src/db/generators/inventory.generator.ts` | Old generator                                         |
| `apps/web/src/app/(dashboard)/articles/`                | Old route directory                                   |
| `apps/web/src/app/(dashboard)/inventory/`               | Old route directory                                   |
| `apps/web/src/types/product.ts`                         | Old type file                                         |
| `apps/web/src/types/inventory.ts`                       | Old type file                                         |
| `apps/web/src/components/tables/products/`              | Old table components (product-sheet.tsx, columns.tsx) |

### Files to MODIFY

| File                                                          | Changes                                                                                             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `apps/backend/src/db/schema.ts`                               | Drop products + inventory tables, update 3 item table FKs, remove old type exports                  |
| `apps/backend/src/db/seed.ts`                                 | Remove product/inventory seeding, update TRUNCATE, update order/sale/purchase to use articuloCodigo |
| `apps/backend/src/db/generators/order.generator.ts`           | Accept articulos data, generate articuloCodigo/articuloNombre                                       |
| `apps/backend/src/db/generators/sale.generator.ts`            | Same as order generator                                                                             |
| `apps/backend/src/db/generators/purchase.generator.ts`        | Same as order generator                                                                             |
| `apps/backend/src/app.module.ts`                              | Remove ProductsModule, InventoryModule imports                                                      |
| `apps/backend/src/modules/dashboard/dashboard.module.ts`      | Replace imports                                                                                     |
| `apps/backend/src/modules/dashboard/dashboard.service.ts`     | Full rewire to articulos/existencias                                                                |
| `apps/backend/src/modules/articulos/articulos.service.ts`     | Add getStats() method                                                                               |
| `apps/backend/src/modules/existencias/existencias.service.ts` | Add getLowStockAggregated() method                                                                  |
| `apps/web/src/config/navigation.ts`                           | Remove Inventario item                                                                              |
| `apps/web/src/types/dashboard.ts`                             | Update interfaces (totalProducts -> totalArticulos, LowStockItem shape)                             |
| `apps/web/src/components/dashboard/stats-cards.tsx`           | Update labels                                                                                       |
| `apps/web/src/components/dashboard/low-stock-alerts.tsx`      | Simplify (remove ProductSheet, show articuloCodigo+nombre)                                          |
| `apps/web/src/lib/api.client.ts`                              | Remove fetchProductById                                                                             |
| `apps/mobile/src/components/layout/BottomTabs.tsx`            | Spanish labels, new routes                                                                          |
| `apps/mobile/src/components/layout/DrawerNav.tsx`             | Spanish labels, new routes, "Cerrar sesion"                                                         |
| `apps/mobile/src/components/auth/SplashGate.tsx`              | Update route paths and page imports                                                                 |
| `apps/mobile/src/pages/Articles.tsx`                          | Rename file or update as Articulos                                                                  |

## Open Questions

1. **Sales chart data source**
   - What we know: SalesChart receives `stats` prop with todaySales, weekSales, etc. These come from SalesService.getStats() which queries the sales table directly (not product-related).
   - Recommendation: No changes needed -- sales chart is independent of product model. Verify and move on.

2. **Recent orders display after FK change**
   - What we know: RecentOrders shows order-level data (orderNumber, customerName, total, status). It does NOT display individual items.
   - Recommendation: No changes needed to RecentOrders component. The order-level data is unchanged.

3. **NAV-03: Depositos accessibility**
   - What we know: Depositos is already accessible at /settings/depositos (established in Phase 14 as settings sub-page pattern).
   - Recommendation: NAV-03 is already satisfied. No additional nav item needed.

4. **Mobile page file naming**
   - What we know: Mobile pages are in `apps/mobile/src/pages/` with English names (Articles.tsx, Inventory.tsx, Orders.tsx, etc.).
   - Recommendation: Rename Articles.tsx -> Articulos.tsx. Delete Inventory.tsx. Keep Orders.tsx, Sales.tsx, Purchases.tsx (internal component names don't need to match routes, but update for consistency if desired). At minimum update SplashGate.tsx route config.

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection of all files listed in Files Inventory
- Schema.ts: Lines 66-83 (orderItems), 137-154 (saleItems), 185-202 (purchaseItems)
- DashboardService: Full file (110 lines)
- ExistenciasService: getKpiStats() method (lines 186-198) -- existing aggregation pattern
- ArticulosService: Full file (121 lines) -- no getStats() yet

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH -- no new dependencies, all existing patterns
- Architecture: HIGH -- all changes follow established codebase patterns
- Pitfalls: HIGH -- identified through direct code inspection of import chains

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable internal codebase, no external dependency changes)
