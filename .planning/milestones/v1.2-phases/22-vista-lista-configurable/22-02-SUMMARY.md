---
phase: 22-vista-lista-configurable
plan: '02'
subsystem: ui
tags: [tanstack-table, sorting, server-side, next.js, react]

# Dependency graph
requires:
  - phase: 22-01
    provides: ServerDataTable with controlled columnVisibility, articulos-columns with enableSorting:false baseline, fetchArticulosClient API client
provides:
  - Server-side sorting for articulos table via clickable column headers
  - Tri-state sort indicators (ArrowUpDown/ArrowUp/ArrowDown) on 4 columns
  - Controlled SortingState in ServerDataTable via sortBy/sortOrder/onSortChange props
  - sortBy/sortOrder query params in fetchArticulosClient
affects:
  - Any future plan that extends ServerDataTable (inherits sort prop pattern)
  - Future columns that need sorting (follow same enableSorting pattern)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Controlled sorting via external state (sortBy/sortOrder) matching controlled pagination pattern
    - Explicit params passed to fetchData to avoid stale closure issues
    - SortingState derived via useMemo from controlled props

key-files:
  created: []
  modified:
    - apps/web/src/lib/api.client.ts
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx
    - apps/web/src/components/articulos/articulos-columns.tsx
    - apps/web/src/components/tables/server-data-table.tsx

key-decisions:
  - 'Sortable columns limited to 4 visible columns (codigo, nombre, precio, costo) — createdAt/updatedAt not displayed so no sort header needed'
  - 'enableSortingRemoval: true allows third click to return to unsorted (null sortBy) state'
  - 'sortBy=null signals backend to use its default sort (createdAt desc), never sends sortOrder without sortBy'

patterns-established:
  - 'Controlled sort pattern: sortBy/sortOrder/onSortChange mirrors controlled pagination pattern (currentPage/onPageChange)'
  - 'Explicit param passing to fetchData: all async fetch calls pass current sort state explicitly to avoid stale closures'

requirements-completed:
  - VIEW-03

# Metrics
duration: 4min
completed: '2026-03-12'
---

# Phase 22 Plan 02: Server-Side Sorting Summary

**Server-side sort wiring for 4 articulos columns via tri-state TanStack headers — clicking cycles neutral/asc/desc with ArrowUpDown/ArrowUp/ArrowDown icons, resets page to 1, and passes sortBy/sortOrder to existing backend params**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-12T04:07:49Z
- **Completed:** 2026-03-12T04:11:28Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- 4 sortable columns (Codigo, Nombre, Precio, Costo) with ghost button headers and tri-state arrow icons
- ServerDataTable now accepts controlled sortBy/sortOrder/onSortChange props matching the existing pagination pattern
- ArticulosClient manages sort state and passes it through all fetchData call paths (search debounce, status filter, page change, toggle refresh)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add sort params to API client and sort state to ArticulosClient** - `b2f7107` (feat)
2. **Task 2: Sortable column headers with tri-state arrows and ServerDataTable sort wiring** - `ad6e55d` (feat)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `apps/web/src/lib/api.client.ts` - Added sortBy/sortOrder optional params to fetchArticulosClient
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` - Sort state, handleSortChange, explicit params in all fetchData calls
- `apps/web/src/components/articulos/articulos-columns.tsx` - enableSorting:true + clickable header buttons on codigo, nombre, precio, costo
- `apps/web/src/components/tables/server-data-table.tsx` - SortingState import, sorting derived via useMemo, onSortingChange handler, enableSortingRemoval:true

## Decisions Made

- Sortable columns limited to 4 visible columns (codigo, nombre, precio, costo) — createdAt/updatedAt not displayed so no sort header needed, but backend supports them
- `enableSortingRemoval: true` allows third click to return to unsorted state (sends null sortBy to backend which uses its own default)
- `sortBy=null` signals backend default sort (createdAt desc); sortOrder is never sent without sortBy

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sort is fully wired and builds clean (tsc + next build pass)
- Column visibility (Plan 01) regression-free — both features coexist in ServerDataTable state
- Ready for any further articulos list enhancements

---

_Phase: 22-vista-lista-configurable_
_Completed: 2026-03-12_
