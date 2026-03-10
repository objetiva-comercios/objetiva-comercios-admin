---
phase: 17-inventarios
plan: 03
subsystem: ui
tags: [next.js, react, typescript, settings, dispositivos, sectores, inventarios]

requires:
  - phase: 17-inventarios-01
    provides: Drizzle schema for inventarios, dispositivos_moviles, inventario_sectores tables
provides:
  - Web type interfaces for Inventario, InventarioArticulo, InventarioSector, DispositivoMovil
  - Server-side and client-side API functions for inventarios, dispositivos, sectores
  - Articulos layout with 3 tabs (Listado, Existencias, Inventarios)
  - Dispositivos settings page with CRUD dialog
  - Sectores management within Depositos settings (expandable per deposito)
affects: [17-inventarios-04, 17-inventarios-05]

tech-stack:
  added: []
  patterns: [expandable-row-with-nested-crud, client-side-fetch-on-expand]

key-files:
  created:
    - apps/web/src/types/inventario.ts
    - apps/web/src/types/dispositivo.ts
    - apps/web/src/app/(dashboard)/settings/dispositivos/page.tsx
    - apps/web/src/components/dispositivos/dispositivo-dialog.tsx
    - apps/web/src/components/dispositivos/dispositivos-list.tsx
    - apps/web/src/components/depositos/sector-dialog.tsx
  modified:
    - apps/web/src/lib/api.ts
    - apps/web/src/lib/api.client.ts
    - apps/web/src/app/(dashboard)/articulos/layout.tsx
    - apps/web/src/components/settings/settings-nav.tsx
    - apps/web/src/components/depositos/depositos-list.tsx

key-decisions:
  - 'Expandable deposito rows for sectores instead of separate page — keeps context inline'
  - 'Client-side fetch for sectores on expand — avoids loading all sectores upfront'
  - 'Dispositivos page uses server-side fetch via page.tsx prop drilling — matches depositos pattern'

patterns-established:
  - 'Expandable row pattern: parent list with chevron toggle, nested table loads on expand via client fetch'
  - 'Inline sector CRUD: create/edit/delete within parent deposito context'

requirements-completed: [INV-02, INV-08]

duration: 5min
completed: 2026-03-06
---

# Phase 17 Plan 03: Web Types, API Layer, and Settings UI Summary

**Web type definitions, API client functions, Inventarios tab navigation, Dispositivos settings CRUD, and expandable sectores management within Depositos settings**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-06T01:16:01Z
- **Completed:** 2026-03-06T01:21:29Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Created Inventario, InventarioArticulo, InventarioSector, and DispositivoMovil type interfaces matching backend schema
- Added 19 API functions (5 server-side fetch + 14 client-side mutations) covering all CRUD operations for inventarios, dispositivos, and sectores
- Extended articulos layout with 3-tab navigation (Listado, Existencias, Inventarios)
- Built complete Dispositivos settings page with table list, create/edit dialog, and toggle active/inactive
- Extended Depositos settings with expandable sectores section per deposito with create/edit/delete

## Task Commits

Each task was committed atomically:

1. **Task 1: Create web types, API functions, and tab navigation** - `d7dfad2` (feat)
2. **Task 2: Create Dispositivos settings page and extend Depositos with sectores UI** - `ab6dbe7` (feat)

## Files Created/Modified

- `apps/web/src/types/inventario.ts` - Inventario, InventarioArticulo, InventarioArticuloWithDiscrepancy, InventarioSector interfaces
- `apps/web/src/types/dispositivo.ts` - DispositivoMovil interface
- `apps/web/src/lib/api.ts` - Server-side fetch for inventarios, dispositivos, sectores
- `apps/web/src/lib/api.client.ts` - Client-side mutations for all CRUD operations
- `apps/web/src/app/(dashboard)/articulos/layout.tsx` - Added Inventarios tab
- `apps/web/src/components/settings/settings-nav.tsx` - Added Dispositivos nav entry with Smartphone icon
- `apps/web/src/app/(dashboard)/settings/dispositivos/page.tsx` - Dispositivos settings page
- `apps/web/src/components/dispositivos/dispositivo-dialog.tsx` - Create/edit dispositivo form dialog
- `apps/web/src/components/dispositivos/dispositivos-list.tsx` - Dispositivos table with toggle and CRUD
- `apps/web/src/components/depositos/sector-dialog.tsx` - Create/edit sector form dialog
- `apps/web/src/components/depositos/depositos-list.tsx` - Extended with expandable sectores per deposito

## Decisions Made

- Expandable deposito rows for sectores instead of separate page — keeps context inline
- Client-side fetch for sectores on expand — avoids loading all sectores upfront for all depositos
- Dispositivos page uses server-side fetch via page.tsx prop drilling — matches existing depositos pattern

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Types and API layer ready for inventarios list/detail pages (Plan 04)
- Dispositivos and Sectores settings fully functional for use in inventory events
- Tab navigation ready — Inventarios tab points to /articulos/inventarios (page to be built in Plan 04)

---

_Phase: 17-inventarios_
_Completed: 2026-03-06_
