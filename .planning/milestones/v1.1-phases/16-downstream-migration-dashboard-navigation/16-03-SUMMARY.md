---
phase: 16-downstream-migration-dashboard-navigation
plan: 03
subsystem: ui
tags: [navigation, sidebar, mobile, spanish-labels, dead-code-cleanup]

# Dependency graph
requires:
  - phase: 16-01
    provides: articuloCodigo schema migration and articulos/existencias services
provides:
  - Clean web sidebar with 6 items (no Inventario)
  - Spanish-labeled mobile navigation (bottom tabs, drawer, header)
  - Spanish route paths in mobile (/articulos, /pedidos, /ventas, /compras)
  - Removal of all old articles/inventory/product dead code from web
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Spanish route paths for mobile navigation
    - Consistent Spanish labeling across web and mobile

key-files:
  created: []
  modified:
    - apps/web/src/config/navigation.ts
    - apps/web/src/lib/api.ts
    - apps/mobile/src/components/layout/BottomTabs.tsx
    - apps/mobile/src/components/layout/DrawerNav.tsx
    - apps/mobile/src/components/auth/SplashGate.tsx
    - apps/mobile/src/pages/Articulos.tsx
    - apps/mobile/src/components/layout/AppHeader.tsx
    - apps/mobile/src/pages/Dashboard.tsx

key-decisions:
  - 'Removed orphan fetchProducts/fetchInventory from web api.ts during cleanup'
  - 'Updated mobile AppHeader PATH_TITLES and Dashboard /inventory link as deviation fixes'

patterns-established:
  - 'Mobile Spanish route paths: /articulos, /pedidos, /ventas, /compras'

requirements-completed: [NAV-01, NAV-02, NAV-03, DEBT-03]

# Metrics
duration: 4min
completed: 2026-03-05
---

# Phase 16 Plan 03: Navigation Cleanup Summary

**Web sidebar reduced to 6 items (no Inventario), mobile navigation fully Spanish-labeled with /articulos /pedidos /ventas /compras routes, all old articles/inventory/product dead code removed**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T20:06:21Z
- **Completed:** 2026-03-05T20:10:08Z
- **Tasks:** 2
- **Files modified:** 23 (16 deleted, 7 modified)

## Accomplishments

- Web sidebar shows Panel, Articulos, Compras, Ventas, Pedidos, Configuracion (6 items, no Inventario)
- Mobile bottom tabs: Panel, Articulos, Pedidos, Ventas with Spanish routes
- Mobile drawer: Compras, Perfil, Configuracion + "Cerrar sesion" logout button
- Deleted 14 old web files: articles route, inventory route, product/inventory tables, product/inventory types
- Removed orphan fetchProducts/fetchInventory functions from api.ts

## Task Commits

Each task was committed atomically:

1. **Task 1: Update web sidebar and delete old route directories** - `b327e7b` (feat)
2. **Task 2: Update mobile navigation, routes, and Spanish labels** - `d1f30dc` (feat)

## Files Created/Modified

- `apps/web/src/config/navigation.ts` - Removed Inventario entry and Warehouse import
- `apps/web/src/lib/api.ts` - Removed orphan Product/Inventory imports and fetchProducts/fetchInventory
- `apps/web/src/app/(dashboard)/articles/` - DELETED (4 files)
- `apps/web/src/app/(dashboard)/inventory/` - DELETED (4 files)
- `apps/web/src/components/tables/products/` - DELETED (2 files)
- `apps/web/src/components/tables/inventory/` - DELETED (2 files)
- `apps/web/src/types/product.ts` - DELETED
- `apps/web/src/types/inventory.ts` - DELETED
- `apps/mobile/src/components/layout/BottomTabs.tsx` - Spanish labels, new routes, ShoppingBag icon
- `apps/mobile/src/components/layout/DrawerNav.tsx` - Spanish labels, removed ShoppingBag, "Cerrar sesion"
- `apps/mobile/src/components/auth/SplashGate.tsx` - Updated routes and imports
- `apps/mobile/src/pages/Articulos.tsx` - Renamed from Articles.tsx, updated component and API path
- `apps/mobile/src/pages/Inventory.tsx` - DELETED
- `apps/mobile/src/components/layout/AppHeader.tsx` - Spanish PATH_TITLES
- `apps/mobile/src/pages/Dashboard.tsx` - Changed /inventory link to /articulos

## Decisions Made

- Removed orphan fetchProducts/fetchInventory functions from api.ts (dead code after type files deleted)
- Updated AppHeader PATH_TITLES to Spanish to match new route paths (discovered as orphan reference)
- Changed Dashboard "View Inventory" link to "Ver articulos" pointing to /articulos

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Removed orphan fetchProducts and fetchInventory from api.ts**

- **Found during:** Task 1 (web sidebar and cleanup)
- **Issue:** api.ts imported deleted Product/Inventory types and had dead fetchProducts/fetchInventory functions
- **Fix:** Removed imports and both functions
- **Files modified:** apps/web/src/lib/api.ts
- **Verification:** Web build succeeds cleanly
- **Committed in:** b327e7b (Task 1 commit)

**2. [Rule 1 - Bug] Fixed mobile AppHeader PATH_TITLES with old English routes**

- **Found during:** Task 2 (mobile navigation)
- **Issue:** AppHeader had /articles, /inventory, /orders, /sales with English labels
- **Fix:** Updated to /articulos, /pedidos, /ventas, /compras with Spanish labels
- **Files modified:** apps/mobile/src/components/layout/AppHeader.tsx
- **Verification:** Mobile TypeScript compiles cleanly
- **Committed in:** d1f30dc (Task 2 commit)

**3. [Rule 1 - Bug] Fixed Dashboard /inventory navigation link**

- **Found during:** Task 2 (mobile navigation)
- **Issue:** Dashboard had navigate('/inventory') pointing to deleted route
- **Fix:** Changed to navigate('/articulos') with Spanish label "Ver articulos"
- **Files modified:** apps/mobile/src/pages/Dashboard.tsx
- **Verification:** Mobile TypeScript compiles cleanly
- **Committed in:** d1f30dc (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (1 missing critical, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 16 complete: schema migrated, dashboard rewired, navigation cleaned
- Both web and mobile apps build/compile cleanly
- All old articles/inventory/product references removed from navigation and dead code

---

_Phase: 16-downstream-migration-dashboard-navigation_
_Completed: 2026-03-05_
