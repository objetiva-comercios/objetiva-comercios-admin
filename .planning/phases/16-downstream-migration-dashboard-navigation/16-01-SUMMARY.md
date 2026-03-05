---
phase: 16-downstream-migration-dashboard-navigation
plan: 01
subsystem: database
tags: [drizzle, schema-migration, articulos, postgresql]

# Dependency graph
requires:
  - phase: 14-articulos-depositos
    provides: articulos table with codigo PK
provides:
  - Item tables (orderItems, saleItems, purchaseItems) with articuloCodigo FK
  - Clean schema without products/inventory tables
  - Generators and seed using articulos data
  - Web types with articuloCodigo/articuloNombre fields
affects: [16-02, 16-03, dashboard, orders, sales, purchases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'ArticuloRef type for generator interfaces (codigo, nombre, sku)'
    - "Random price/cost in generators since articulos don't expose pricing in seed context"

key-files:
  created: []
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/db/generators/order.generator.ts
    - apps/backend/src/db/generators/sale.generator.ts
    - apps/backend/src/db/generators/purchase.generator.ts
    - apps/backend/src/app.module.ts
    - apps/backend/src/modules/dashboard/dashboard.module.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts
    - apps/web/src/types/order.ts
    - apps/web/src/types/sale.ts
    - apps/web/src/types/purchase.ts
    - apps/web/src/types/dashboard.ts
    - apps/web/src/components/tables/orders/order-sheet.tsx
    - apps/web/src/components/tables/sales/sale-sheet.tsx
    - apps/web/src/components/tables/purchases/purchase-sheet.tsx
    - apps/web/src/components/dashboard/low-stock-alerts.tsx
    - apps/web/src/components/dashboard/stats-cards.tsx

key-decisions:
  - 'Dashboard service migrated to ArticulosService+ExistenciasService (was ProductsService+InventoryService)'
  - 'Generators use random prices instead of product.price since ArticuloRef only has codigo/nombre/sku'
  - 'Clean schema drop+push approach for development DB migration'

patterns-established:
  - 'ArticuloRef type pattern: { codigo: string; nombre: string; sku: string | null } for passing articulo references'

requirements-completed: [MIG-03]

# Metrics
duration: 9min
completed: 2026-03-05
---

# Phase 16 Plan 01: Downstream Migration Summary

**Migrated item table FKs from productId to articuloCodigo, removed products/inventory tables and modules, updated generators/seed/web types**

## Performance

- **Duration:** 9 min
- **Started:** 2026-03-05T19:49:10Z
- **Completed:** 2026-03-05T19:58:23Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments

- Replaced productId/productName columns with articuloCodigo/articuloNombre on all three item tables (orderItems, saleItems, purchaseItems)
- Removed products and inventory tables from Drizzle schema entirely
- Deleted old backend modules (products, inventory) and generators (product.generator, inventory.generator)
- Updated seed to generate orders/sales/purchases using articulosData
- Updated web types and sheet components for the new field names
- Database re-seeded successfully with 80 orders, 60 sales, 20 purchases all referencing articulos

## Task Commits

Each task was committed atomically:

1. **Task 1: Update schema, generators, seed, and delete old backend modules** - `b318388` (feat)
2. **Task 2: Update web item types and run db:push + db:seed** - `655b0a1` (feat)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` - Removed products/inventory tables, updated item FKs to articuloCodigo
- `apps/backend/src/db/seed.ts` - Removed products/inventory seeding, updated item insertion to use articuloCodigo
- `apps/backend/src/db/generators/order.generator.ts` - Uses ArticuloRef instead of GeneratedProduct
- `apps/backend/src/db/generators/sale.generator.ts` - Uses ArticuloRef instead of GeneratedProduct
- `apps/backend/src/db/generators/purchase.generator.ts` - Uses ArticuloRef with random unitCost
- `apps/backend/src/app.module.ts` - Removed ProductsModule and InventoryModule imports
- `apps/backend/src/modules/dashboard/dashboard.module.ts` - Imports ArticulosModule+ExistenciasModule
- `apps/backend/src/modules/dashboard/dashboard.service.ts` - Uses ArticulosService+ExistenciasService
- `apps/web/src/types/order.ts` - OrderItem uses articuloCodigo/articuloNombre
- `apps/web/src/types/sale.ts` - SaleItem uses articuloCodigo/articuloNombre
- `apps/web/src/types/purchase.ts` - PurchaseItem uses articuloCodigo/articuloNombre
- `apps/web/src/types/dashboard.ts` - DashboardStats uses totalArticulos, LowStockItem uses articulo fields
- `apps/web/src/components/tables/orders/order-sheet.tsx` - Displays articuloNombre
- `apps/web/src/components/tables/sales/sale-sheet.tsx` - Displays articuloNombre
- `apps/web/src/components/tables/purchases/purchase-sheet.tsx` - Displays articuloNombre
- `apps/web/src/components/dashboard/low-stock-alerts.tsx` - Uses articulo-based model
- `apps/web/src/components/dashboard/stats-cards.tsx` - Shows totalArticulos

## Decisions Made

- Dashboard service migrated to use ArticulosService and ExistenciasService instead of deleted ProductsService and InventoryService
- Generators use faker-generated random prices/costs since ArticuloRef only carries codigo/nombre/sku (no pricing)
- Used clean schema drop + push for the DB migration (no production data to preserve)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Dashboard module referenced deleted Products/Inventory modules**

- **Found during:** Task 1 (deleting products/inventory modules)
- **Issue:** DashboardModule and DashboardService imported ProductsModule/InventoryModule and their services, which were being deleted
- **Fix:** Replaced with ArticulosModule/ExistenciasModule and their services, updated stats interface
- **Files modified:** apps/backend/src/modules/dashboard/dashboard.module.ts, apps/backend/src/modules/dashboard/dashboard.service.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** b318388 (Task 1 commit)

**2. [Rule 3 - Blocking] Dashboard web types and components referenced old product fields**

- **Found during:** Task 2 (updating web types)
- **Issue:** DashboardStats had totalProducts, LowStockItem had productId/productName, low-stock-alerts imported ProductSheet/fetchProductById, stats-cards used totalProducts
- **Fix:** Updated types to totalArticulos/articuloCodigo/articuloNombre, simplified low-stock-alerts component, updated stats-cards
- **Files modified:** apps/web/src/types/dashboard.ts, apps/web/src/components/dashboard/low-stock-alerts.tsx, apps/web/src/components/dashboard/stats-cards.tsx
- **Verification:** Components reference correct field names matching new API response
- **Committed in:** 655b0a1 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both auto-fixes necessary to prevent build failures after deleting products/inventory modules. No scope creep.

## Issues Encountered

- drizzle-kit push required interactive prompts when detecting column changes; resolved by dropping schema and pushing fresh (dev environment, no data to preserve)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All item tables now reference articuloCodigo - ready for dashboard and navigation updates in plans 02/03
- Old product/inventory web pages still exist but their backend endpoints are gone (to be addressed in subsequent plans)

---

_Phase: 16-downstream-migration-dashboard-navigation_
_Completed: 2026-03-05_
