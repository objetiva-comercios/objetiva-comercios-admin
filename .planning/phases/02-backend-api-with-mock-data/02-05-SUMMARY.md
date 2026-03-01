---
phase: 02-backend-api-with-mock-data
plan: 05
subsystem: api
tags: [nestjs, jwt, auth, dashboard, purchases]

# Dependency graph
requires:
  - phase: 02-backend-api-with-mock-data
    provides: Feature controllers with @Public() bypass and DashboardService without PurchasesService
  - phase: 02-backend-api-with-mock-data
    provides: Global JWT guard (JwtAuthGuard) with @Public() opt-out pattern
provides:
  - All feature API routes (products, orders, inventory, sales, purchases, dashboard) now require JWT authentication
  - Dashboard KPI response includes purchases section (pendingOrders, pendingValue)
  - Only /api/health remains publicly accessible without auth
affects: [mobile-frontend, phase-4, phase-5]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'JWT enforcement by default: remove @Public() bypasses to re-enable global guard on all feature routes'
    - 'Cross-service KPI aggregation: DashboardService injects multiple services for composite response'

key-files:
  created: []
  modified:
    - apps/backend/src/modules/products/products.controller.ts
    - apps/backend/src/modules/orders/orders.controller.ts
    - apps/backend/src/modules/inventory/inventory.controller.ts
    - apps/backend/src/modules/sales/sales.controller.ts
    - apps/backend/src/modules/purchases/purchases.controller.ts
    - apps/backend/src/modules/dashboard/dashboard.controller.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts

key-decisions:
  - 'Removed @Public() from all 6 feature controllers — global JWT guard now enforces auth everywhere except /api/health'
  - 'DashboardService injects PurchasesService (already available via PurchasesModule import in DashboardModule) for purchases KPI'

patterns-established:
  - 'JWT enforcement pattern: @Public() is an opt-out — removing it re-enables the global guard without any additional code'
  - 'Composite dashboard pattern: DashboardService aggregates stats from all domain services into single KPI response'

requirements-completed:
  [API-01, API-02, API-03, API-04, API-05, API-06, API-07, API-08, API-09, MONO-08, MONO-09]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 2 Plan 05: JWT Auth Enforcement and Dashboard Purchases KPI Summary

**JWT auth now enforced on all 6 feature controllers by removing @Public() bypasses; dashboard response extended with purchases KPI (pendingOrders, pendingValue) via PurchasesService injection**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T00:24:31Z
- **Completed:** 2026-03-01T00:29:10Z
- **Tasks:** 1
- **Files modified:** 7

## Accomplishments

- Removed `@Public()` decorator and its import from 5 feature controllers (products, orders, inventory, sales, purchases) — class-level removal
- Removed `@Public()` decorator and its import from the dashboard controller — method-level removal on `getKpis()`
- Injected `PurchasesService` as a 5th constructor parameter in `DashboardService`
- Added `purchaseStats = this.purchasesService.getStats()` call in `getKpis()` method
- Added `purchases: { pendingOrders, pendingValue }` to `DashboardResponse` interface and return value
- Backend compiles and passes build without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Remove @Public() from all feature controllers and add purchases KPI to dashboard** - `1c3d893` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/backend/src/modules/products/products.controller.ts` - Removed @Public() class decorator and Public import
- `apps/backend/src/modules/orders/orders.controller.ts` - Removed @Public() class decorator and Public import
- `apps/backend/src/modules/inventory/inventory.controller.ts` - Removed @Public() class decorator and Public import
- `apps/backend/src/modules/sales/sales.controller.ts` - Removed @Public() class decorator and Public import
- `apps/backend/src/modules/purchases/purchases.controller.ts` - Removed @Public() class decorator and Public import
- `apps/backend/src/modules/dashboard/dashboard.controller.ts` - Removed @Public() method decorator and Public import
- `apps/backend/src/modules/dashboard/dashboard.service.ts` - Injected PurchasesService, added purchases KPI to interface and response

## Decisions Made

- No module-level changes needed — PurchasesModule was already imported in DashboardModule and exports PurchasesService, making it directly injectable
- DashboardResponse interface updated in-file (not a shared type file) to keep changes contained

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all changes applied cleanly, build succeeded on first attempt.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- JWT auth is now properly enforced on all feature routes — the temporary @Public() bypass from Phase 3 testing is fully removed
- Dashboard KPI response now includes purchases data that Phase 3 web dashboard may be displaying
- Phase 4 (Mobile Frontend) can proceed knowing the backend contract includes purchases KPI
- Web frontend (Phase 3) already uses fetchWithAuth() which sends the Authorization header, so existing web app remains compatible

## Self-Check: PASSED

- All 7 modified files verified present on disk
- Task commit 1c3d893 verified in git log

---

_Phase: 02-backend-api-with-mock-data_
_Completed: 2026-03-01_
