---
phase: 19-articulos-crud-completo
plan: 01
subsystem: web, backend
tags: [articulos, search, table-actions, alert-dialog]

# Dependency graph
requires:
  - phase: 18-fix-inventarios-article-count
    provides: Complete v1.1 with articulos model and list view
provides:
  - Backend search expanded to 13 text fields (all searchable attributes)
  - Table row actions (3-dot menu) with Editar and Desactivar/Reactivar
  - AlertDialog confirmation for toggle with optimistic update
affects: [19-02, articulos-client, articulos-columns]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'getColumns factory: columns defined via function accepting handlers instead of static const'
    - 'Optimistic toggle: remove row from local state before API call, rollback on error'

key-files:
  created: []
  modified:
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/web/src/components/articulos/articulos-columns.tsx
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx

key-decisions:
  - 'getColumns factory receives onEdit and onToggle callbacks — decouples column definition from page state'
  - 'stopPropagation on DropdownMenu trigger and items to prevent sheet opening on action click'
  - 'Optimistic update only removes row when status filter is active/inactive (not "todos")'

patterns-established:
  - 'Table row actions: DropdownMenu with MoreHorizontal icon, stopPropagation, handler callbacks'
  - 'AlertDialog toggle pattern: state-driven dialog with contextual messages (Desactivar/Reactivar)'

requirements-completed: [ART-03, ART-04]

# Metrics
duration: ~15min
completed: 2026-03-10
---

# Phase 19 Plan 01: Backend Search + Table Row Actions + AlertDialog Toggle

**Expanded backend search to 13 text fields; added 3-dot row actions menu with Editar/Desactivar options and AlertDialog confirmation with optimistic update**

## Performance

- **Duration:** ~15 min
- **Completed:** 2026-03-10
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Expanded `ArticulosService.findAll()` search OR clause from 5 to 13 ilike conditions (added marca, modelo, talle, color, material, presentacion, medida, observaciones)
- Converted `columns` static export to `getColumns(handlers)` factory function accepting `onEdit` and `onToggle` callbacks
- Added actions column with DropdownMenu (MoreHorizontal icon, Editar + contextual Desactivar/Reactivar items)
- Added `stopPropagation` on trigger and menu items to prevent sheet opening
- Added AlertDialog outside table, controlled by `toggleTarget` state
- Implemented optimistic toggle: row removed from local data before API call, rollback on error
- Updated search placeholder to "Buscar articulos..."

## Task Commits

1. **Task 1: Expand backend search to 13 text fields** — `bc7ed2c`
2. **Task 2: Add actions column + AlertDialog toggle + optimistic update** — `04d220b`

## Files Created/Modified

- `apps/backend/src/modules/articulos/articulos.service.ts` — 13 ilike conditions in search OR clause
- `apps/web/src/components/articulos/articulos-columns.tsx` — getColumns factory with actions column
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` — AlertDialog, optimistic toggle, updated search placeholder

## Decisions Made

- Factory pattern for columns allows page-level state management without coupling column definitions
- AlertDialog chosen over inline confirmation for consistency with future edit page toggle

## Deviations from Plan

None — plan executed as written.

## Issues Encountered

None.

---

_Phase: 19-articulos-crud-completo_
_Completed: 2026-03-10_
