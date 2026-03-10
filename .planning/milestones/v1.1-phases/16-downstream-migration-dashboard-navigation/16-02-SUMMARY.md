---
phase: 16-downstream-migration-dashboard-navigation
plan: 02
subsystem: api, ui
tags: [drizzle, nestjs, nextjs, dashboard, kpi, stock]

requires:
  - phase: 16-01
    provides: ArticulosService and ExistenciasService base CRUD, dashboard module already rewired to new imports
provides:
  - getStats() method on ArticulosService (total + active articulo counts)
  - getLowStockAggregated() on ExistenciasService (cross-deposito stock aggregation)
  - getLowStockCount() on ExistenciasService (aggregated low stock count)
  - Dashboard KPI endpoint returning totalArticulos, activeArticulos, populated lowStockItems
  - Simplified low-stock-alerts component (no interactivity)
affects: [16-03, dashboard]

tech-stack:
  added: []
  patterns:
    - 'Cross-deposito stock aggregation via SQL GROUP BY + HAVING with min/sum'
    - 'Subquery-based count for aggregated metrics'

key-files:
  created: []
  modified:
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts
    - apps/web/src/types/dashboard.ts
    - apps/web/src/components/dashboard/stats-cards.tsx
    - apps/web/src/components/dashboard/low-stock-alerts.tsx
    - apps/web/src/lib/api.client.ts

key-decisions:
  - 'Low stock aggregation uses GROUP BY articuloCodigo with HAVING sum <= min(stockMinimo) for cross-deposito accuracy'
  - 'Removed fetchProductById as dead code after low-stock-alerts simplification'

patterns-established:
  - 'Aggregated stats methods on service layer for dashboard consumption'
  - 'Presentational dashboard cards without interactive side-panels'

requirements-completed: [DASH-01, DASH-02, DASH-03]

duration: 4min
completed: 2026-03-05
---

# Phase 16 Plan 02: Dashboard KPI + Low Stock Summary

**Dashboard KPIs rewired to ArticulosService.getStats() and ExistenciasService.getLowStockAggregated() with cross-deposito stock aggregation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T20:00:59Z
- **Completed:** 2026-03-05T20:04:29Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Added getStats() to ArticulosService returning total and active articulo counts
- Added getLowStockAggregated() and getLowStockCount() to ExistenciasService with cross-deposito SQL aggregation
- Rewired DashboardService to use new methods, populating lowStockItems array (was hardcoded to [])
- Updated web types with activeArticulos and new LowStockItem shape (totalCantidad/minStockMinimo)
- Simplified low-stock-alerts component to presentational-only (removed interactivity, state, imports)
- Removed dead fetchProductById function from api.client.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Add backend stats methods and rewire DashboardService** - `47bfb22` (feat)
2. **Task 2: Update web dashboard types and components** - `742546e` (feat)

## Files Created/Modified

- `apps/backend/src/modules/articulos/articulos.service.ts` - Added getStats() method
- `apps/backend/src/modules/existencias/existencias.service.ts` - Added getLowStockAggregated() and getLowStockCount()
- `apps/backend/src/modules/dashboard/dashboard.service.ts` - Rewired to use new stats methods, added activeArticulos
- `apps/web/src/types/dashboard.ts` - Added activeArticulos, updated LowStockItem interface
- `apps/web/src/components/dashboard/stats-cards.tsx` - Shows active articulos count in description
- `apps/web/src/components/dashboard/low-stock-alerts.tsx` - Simplified to presentational component
- `apps/web/src/lib/api.client.ts` - Removed fetchProductById and Product import

## Decisions Made

- Low stock aggregation uses GROUP BY articuloCodigo with HAVING sum(cantidad) <= min(stockMinimo) for cross-deposito accuracy
- Removed fetchProductById as dead code after simplifying low-stock-alerts (Product type still used by articles pages)

## Deviations from Plan

None - plan executed exactly as written. The DashboardModule was already correctly wired from plan 16-01 so no module changes were needed.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Dashboard fully migrated to articulos/existencias model
- Ready for plan 16-03 (navigation cleanup)

---

_Phase: 16-downstream-migration-dashboard-navigation_
_Completed: 2026-03-05_
