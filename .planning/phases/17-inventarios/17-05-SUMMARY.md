---
phase: 17-inventarios
plan: 05
subsystem: ui
tags: [next.js, react, inline-edit, inventory-counting, discrepancy]

requires:
  - phase: 17-inventarios/17-03
    provides: API functions (fetchInventarioArticulos, addInventarioArticulo, updateInventarioArticulo, removeInventarioArticulo)
  - phase: 17-inventarios/17-04
    provides: Inventario detail page and status badge patterns
provides:
  - Counting page at /articulos/inventarios/[id]/conteo
  - ConteoTable component with inline editing and discrepancy color coding
  - ArticuloSearch component for adding articulos to inventory count
  - fetchInventarioArticulosClient for client-side articulo data fetching
affects: []

tech-stack:
  added: []
  patterns:
    - Client-side data fetching with re-fetch after mutations for ConteoTable
    - Reuse of InlineEditCell from existencias for inventory counting
    - Dropdown search with debounced API calls and duplicate filtering

key-files:
  created:
    - apps/web/src/app/(dashboard)/articulos/inventarios/[id]/conteo/page.tsx
    - apps/web/src/components/inventarios/conteo-table.tsx
    - apps/web/src/components/inventarios/articulo-search.tsx
  modified:
    - apps/web/src/lib/api.client.ts

key-decisions:
  - 'ConteoTable manages both search and table state internally for simpler mutation/re-fetch coordination'
  - 'Reused InlineEditCell from existencias — Enter to save, blur to cancel pattern'

patterns-established:
  - 'Discrepancy color coding: green=0, red=negative (faltante), amber=positive (sobrante)'
  - 'Client-side ConteoTable fetches own data to re-fetch after add/update/remove without full page reload'

requirements-completed: [INV-03, INV-04, INV-09]

duration: 5min
completed: 2026-03-06
---

# Phase 17 Plan 05: Counting Page Summary

**Inventory counting page with articulo search, inline quantity editing, and color-coded discrepancy view**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T01:32:38Z
- **Completed:** 2026-03-06T01:38:04Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Counting page renders at /articulos/inventarios/[id]/conteo with back navigation to detail
- ArticuloSearch with debounced dropdown filters out already-counted items and handles 409 duplicates
- ConteoTable with inline editing on cantidad contada (reuses InlineEditCell pattern)
- Color-coded discrepancy column: green for match, red for faltante, amber for sobrante
- "Mostrar solo discrepancias" toggle filter with summary stats
- Read-only mode with amber banner for finalizado/cancelado events

## Task Commits

Each task was committed atomically:

1. **Task 1: Create articulo search component for counting** - `c1d1c21` (feat)
2. **Task 2: Create counting page with discrepancy table and inline editing** - `015006b` (feat)

## Files Created/Modified

- `apps/web/src/components/inventarios/articulo-search.tsx` - Debounced search with dropdown for adding articulos to count
- `apps/web/src/components/inventarios/conteo-table.tsx` - Main counting table with inline edit, discrepancy colors, read-only mode
- `apps/web/src/app/(dashboard)/articulos/inventarios/[id]/conteo/page.tsx` - Server page with header and read-only banner
- `apps/web/src/lib/api.client.ts` - Added fetchInventarioArticulosClient for client-side data fetching

## Decisions Made

- ConteoTable manages both search and table data internally — simpler state coordination than passing between siblings
- Reused InlineEditCell from existencias module — consistent UX pattern (Enter saves, blur cancels)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added fetchInventarioArticulosClient to api.client.ts**

- **Found during:** Task 1
- **Issue:** No client-side function existed for fetching inventario articulos; ConteoTable needs client-side fetch for mutation re-fetch pattern
- **Fix:** Added fetchInventarioArticulosClient wrapping the /api/inventarios/:id/articulos endpoint
- **Files modified:** apps/web/src/lib/api.client.ts
- **Verification:** Build passes, function available for ConteoTable
- **Committed in:** c1d1c21 (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused cn import**

- **Found during:** Task 2
- **Issue:** Build failed due to unused import of cn from @/lib/utils in conteo-table.tsx
- **Fix:** Removed the unused import
- **Files modified:** apps/web/src/components/inventarios/conteo-table.tsx
- **Verification:** Build passes
- **Committed in:** 015006b (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both necessary for correct operation. No scope creep.

## Issues Encountered

None beyond the auto-fixed deviations above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 5 plans of Phase 17 (Inventarios) complete
- Full inventory counting workflow functional: create event, manage config, start counting, search/add articulos, edit quantities, view discrepancies, finalize

---

_Phase: 17-inventarios_
_Completed: 2026-03-06_
