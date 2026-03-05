---
phase: 14-schema-foundation-articulos-depositos
plan: 05
subsystem: ui
tags: [react, shadcn, dialog, depositos, settings, crud]

requires:
  - phase: 14-02
    provides: Depositos backend CRUD endpoints with stockSummary
provides:
  - Depositos management UI within Settings
  - Dialog-based create/edit for depositos
  - Client and server-side API functions for depositos
affects: [15-existencias, depositos-stock]

tech-stack:
  added: [shadcn-dialog]
  patterns: [inline-dialog-crud, settings-sub-page]

key-files:
  created:
    - apps/web/src/types/deposito.ts
    - apps/web/src/components/depositos/deposito-dialog.tsx
    - apps/web/src/components/depositos/depositos-list.tsx
    - apps/web/src/app/(dashboard)/settings/depositos/page.tsx
    - apps/web/src/components/ui/dialog.tsx
  modified:
    - apps/web/src/lib/api.ts
    - apps/web/src/lib/api.client.ts
    - apps/web/src/components/settings/settings-nav.tsx

key-decisions:
  - 'Inline dialog pattern for deposito CRUD (3 fields: nombre, direccion, descripcion)'
  - 'Stock badges show 0/0 placeholder until Phase 15 existencias'

patterns-established:
  - 'Settings sub-page pattern: nav item + /settings/[section]/page.tsx + dedicated component'
  - 'Dialog CRUD pattern: shared dialog with create/edit mode via optional entity prop'

requirements-completed: [DEP-01, DEP-02, DEP-03, DEP-04, MIG-06]

duration: 3min
completed: 2026-03-05
---

# Phase 14 Plan 05: Depositos UI Summary

**Depositos CRUD in Settings with inline dialog, stock badges, and active/inactive toggle using shadcn Dialog**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T14:23:18Z
- **Completed:** 2026-03-05T14:26:00Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Deposito type, server-side and client-side API functions for full CRUD
- Dialog-based create/edit with Zod validation (nombre required, direccion/descripcion optional)
- Depositos table in Settings showing stock badges (0 articulos / 0 unidades), estado, and actions
- Settings navigation updated with Depositos tab (Warehouse icon)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Deposito type, API functions, install dialog component** - `e57b6d2` (feat)
2. **Task 2: Build depositos settings sub-page with list and dialog** - `4716386` (feat)

## Files Created/Modified

- `apps/web/src/types/deposito.ts` - Deposito interface with stockSummary
- `apps/web/src/components/ui/dialog.tsx` - shadcn Dialog component (installed)
- `apps/web/src/lib/api.ts` - Added fetchDepositos server-side function
- `apps/web/src/lib/api.client.ts` - Added 4 client-side deposito API functions
- `apps/web/src/components/depositos/deposito-dialog.tsx` - Create/edit dialog with RHF + Zod
- `apps/web/src/components/depositos/depositos-list.tsx` - Table with stock badges and actions
- `apps/web/src/app/(dashboard)/settings/depositos/page.tsx` - Settings sub-page
- `apps/web/src/components/settings/settings-nav.tsx` - Added Depositos nav item

## Decisions Made

- Used inline dialog pattern (not full-page form) for deposito CRUD -- matches locked decision from context
- Stock badges show "0 articulos / 0 unidades" as placeholders until Phase 15 existencias integration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 14 complete (all 5 plans executed)
- Depositos UI ready for stock data once Phase 15 builds existencias
- All CRUD operations functional through dialog-based UI

## Self-Check: PASSED

All 5 created files verified present. Both task commits (e57b6d2, 4716386) confirmed in git log.

---

_Phase: 14-schema-foundation-articulos-depositos_
_Completed: 2026-03-05_
