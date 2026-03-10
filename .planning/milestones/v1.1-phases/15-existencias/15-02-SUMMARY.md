---
phase: 15-existencias
plan: 02
subsystem: ui
tags: [nextjs, tanstack-table, inline-edit, kpi-cards, tab-navigation, existencias]

requires:
  - phase: 15-existencias
    provides: existencias API endpoints, web types, and API client functions
provides:
  - Tab navigation layout for articulos (Listado | Existencias)
  - InlineEditCell reusable click-to-edit component
  - ExistenciasKpiCards with clickable filter
  - ExistenciasPorDeposito table with inline editing
  - Existencias columns with status badges
affects: [15-03, existencias-matrix-view]

tech-stack:
  added: []
  patterns: [tab-navigation-layout, inline-edit-cell, kpi-cards-as-filters, optimistic-update]

key-files:
  created:
    - apps/web/src/app/(dashboard)/articulos/layout.tsx
    - apps/web/src/app/(dashboard)/articulos/existencias/page.tsx
    - apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx
    - apps/web/src/components/existencias/inline-edit-cell.tsx
    - apps/web/src/components/existencias/existencias-kpi-cards.tsx
    - apps/web/src/components/existencias/existencias-por-deposito.tsx
    - apps/web/src/components/existencias/existencias-columns.tsx
  modified:
    - apps/web/src/app/(dashboard)/articulos/page.tsx

key-decisions:
  - 'Client layout with usePathname for tab navigation — keeps server component pages as children'
  - 'InlineEditCell saves on Enter only, cancels on blur — prevents accidental saves'
  - 'KPI cards double as filters — clicking toggles stockStatus query param'
  - 'Optimistic update pattern for inline edits with KPI refetch after save'

patterns-established:
  - 'Tab navigation layout: client layout.tsx with Link + usePathname active detection'
  - 'Inline edit pattern: display div → Input on click → Enter save / Escape cancel / blur cancel'
  - 'KPI-as-filter pattern: clickable stat cards that toggle query filters'

requirements-completed: [EXI-01, EXI-02, EXI-05, EXI-06, EXI-07]

duration: 3min
completed: 2026-03-05
---

# Phase 15 Plan 02: Existencias UI Summary

**Tab navigation, KPI stat cards with click-to-filter, deposito selector, and inline-editable stock table with status badges**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T18:36:41Z
- **Completed:** 2026-03-05T18:39:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- InlineEditCell component with click-to-edit, Enter/Escape/blur handling, toast feedback, and loading state
- ExistenciasKpiCards showing total con stock, stock bajo, sin stock with clickable filter toggle
- Tab navigation layout for articulos section (Listado | Existencias) using client layout with usePathname
- ExistenciasPorDeposito table with inline editing on cantidad, stockMinimo, stockMaximo columns
- Status badges (Normal green, Bajo yellow, Sin Stock red) computed from getStockStatus
- View mode toggle (Por Deposito active, Por Articulo placeholder for Plan 03)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InlineEditCell component and ExistenciasKpiCards** - `f880513` (feat)
2. **Task 2: Build tab navigation, existencias route, deposito selector, and "Por Deposito" table view** - `c7c2c69` (feat)

## Files Created/Modified

- `apps/web/src/app/(dashboard)/articulos/layout.tsx` - Client layout with tab navigation (Listado | Existencias)
- `apps/web/src/app/(dashboard)/articulos/page.tsx` - Removed header (now in layout)
- `apps/web/src/app/(dashboard)/articulos/existencias/page.tsx` - Server component fetching depositos and initial data
- `apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx` - Main orchestrator with state management
- `apps/web/src/components/existencias/inline-edit-cell.tsx` - Reusable click-to-edit number cell
- `apps/web/src/components/existencias/existencias-kpi-cards.tsx` - 3 clickable KPI stat cards
- `apps/web/src/components/existencias/existencias-por-deposito.tsx` - Table wrapper with InlineEditCell integration
- `apps/web/src/components/existencias/existencias-columns.tsx` - TanStack column definitions with status badges

## Decisions Made

- Client layout with usePathname for tab navigation — server component pages passed as children work naturally with Next.js
- InlineEditCell saves on Enter only, cancels on blur — prevents accidental saves when clicking away
- KPI cards double as table filters — clicking a card toggles the stockStatus query parameter
- Optimistic update pattern: local state updated immediately, KPI refetched in background after save

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Por Deposito view complete with all planned features
- Por Articulo placeholder ready for Plan 03 matrix view implementation
- InlineEditCell reusable for any future numeric inline-edit needs

---

_Phase: 15-existencias_
_Completed: 2026-03-05_
