---
phase: 15-existencias
plan: 03
subsystem: ui
tags: [react, tanstack-table, matrix-view, inline-editing, frozen-columns]

requires:
  - phase: 15-existencias-02
    provides: InlineEditCell, ExistenciasClient with viewMode toggle, deposito selector
  - phase: 15-existencias-01
    provides: API client functions, Existencia types, matrix endpoint
provides:
  - ExistenciasPorArticulo matrix table with dynamic deposito columns and frozen left columns
  - Articulo detail sheet Stock por Deposito section with status badges
affects: [16-inventarios]

tech-stack:
  added: []
  patterns: [sticky-column matrix table, per-articulo stock fetch in detail sheet]

key-files:
  created:
    - apps/web/src/components/existencias/existencias-por-articulo.tsx
  modified:
    - apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx

key-decisions:
  - 'Custom HTML table with sticky columns instead of ServerDataTable for matrix layout flexibility'
  - 'Independent pagination and search state for matrix view vs deposito view'
  - 'Stock section in ArticuloSheet is read-only; editing only in existencias views'

patterns-established:
  - 'Sticky column pattern: sticky left-0 z-10 bg-background with shadow separator on last frozen column'
  - 'Multi-view component pattern: each viewMode manages its own data, pagination, and search independently'

requirements-completed: [EXI-03, EXI-04, EXI-05]

duration: 3min
completed: 2026-03-05
---

# Phase 15 Plan 03: Existencias Matrix View Summary

**Matrix table with dynamic deposito columns, frozen codigo/nombre columns, inline editing, and per-deposito stock section in articulo detail sheet**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T18:41:53Z
- **Completed:** 2026-03-05T18:45:21Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- ExistenciasPorArticulo matrix component with dynamic deposito columns generated from deposito list
- Frozen left columns (codigo, nombre) with sticky positioning and shadow separator
- Inline editing in all matrix cells with optimistic updates and KPI refetch
- Total column aggregating stock across all depositos
- Stock por Deposito section in ArticuloSheet with status badges and total row

## Task Commits

Each task was committed atomically:

1. **Task 1: Build ExistenciasPorArticulo matrix view** - `df9a3f9` (feat)
2. **Task 2: Add Stock section to ArticuloSheet** - `a90dc3a` (feat)

## Files Created/Modified

- `apps/web/src/components/existencias/existencias-por-articulo.tsx` - Matrix table with frozen columns, inline editing, pagination
- `apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx` - Wired matrix view, added matrix state/fetch/search
- `apps/web/src/components/articulos/articulo-sheet.tsx` - Added Stock por Deposito section with status badges

## Decisions Made

- Used custom HTML table with sticky CSS columns instead of ServerDataTable since matrix layout requires per-deposito dynamic columns that don't fit the standard column definition pattern
- Each view mode (por_deposito, por_articulo) manages its own pagination, search, and data state independently to avoid cross-contamination
- Stock section in ArticuloSheet is read-only; hooks are called before the early return to satisfy React rules of hooks

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 15 (Existencias) is now complete with all three plans executed
- Ready for Phase 16 (Inventarios)

---

_Phase: 15-existencias_
_Completed: 2026-03-05_
