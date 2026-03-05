---
phase: 14-schema-foundation-articulos-depositos
plan: 03
subsystem: ui
tags: [next.js, tanstack-table, server-pagination, shadcn, articulos]

requires:
  - phase: 14-02
    provides: Backend articulos CRUD endpoints with search and pagination
provides:
  - Articulo TypeScript type for frontend
  - Server-side and client-side API functions for articulos
  - Reusable ServerDataTable component with manual pagination
  - Articulos list page with search, filter, pagination, detail sheet
  - Articulos column definitions with visibility config
  - Articulo status segmented filter component
  - Articulo read-only detail sheet with sectioned layout
affects: [14-04, 14-05, articulos-edit, articulos-create]

tech-stack:
  added: []
  patterns: [server-side-pagination-table, segmented-status-filter, debounced-search]

key-files:
  created:
    - apps/web/src/types/articulo.ts
    - apps/web/src/components/tables/server-data-table.tsx
    - apps/web/src/components/articulos/articulos-columns.tsx
    - apps/web/src/components/articulos/articulo-status-filter.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx
    - apps/web/src/app/(dashboard)/articulos/page.tsx
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx
  modified:
    - apps/web/src/lib/api.ts
    - apps/web/src/lib/api.client.ts
    - apps/web/src/config/navigation.ts

key-decisions:
  - 'ServerDataTable uses TanStack Table manualPagination/manualFiltering/manualSorting for server-driven data'
  - 'Sidebar navigation updated from /articles to /articulos'
  - 'Date fields typed as string (JSON serialized) not Date — parsed at display time'

patterns-established:
  - 'ServerDataTable: reusable server-side paginated table with column visibility and row click'
  - 'StatusFilter: segmented control pattern for active/inactive/all filtering'
  - 'Client-side data fetching with debounced search and status filter state'

requirements-completed: [ART-01, ART-02, ART-06, ART-07]

duration: 4min
completed: 2026-03-05
---

# Phase 14 Plan 03: Articulos List Page Summary

**Articulos list page with server-side paginated table, debounced multi-field search, active/inactive segmented filter, column visibility, and read-only detail sheet**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T14:12:46Z
- **Completed:** 2026-03-05T14:16:16Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Reusable ServerDataTable component with manual pagination, column visibility toggle, loading state, and row click support
- Full articulos list page with debounced search across 5 fields, Activos/Inactivos/Todos segmented filter, and server-side pagination with page numbers
- Read-only detail sheet with sectioned layout (Identificacion, Propiedades, Precios, Estado, ERP, Origen) and Editar navigation button
- Sidebar navigation updated to /articulos route

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Articulo type, API functions, and ServerDataTable component** - `d86197e` (feat)
2. **Task 2: Build articulos list page with columns, search, filter, and detail sheet** - `48e8762` (feat)

## Files Created/Modified

- `apps/web/src/types/articulo.ts` - Articulo interface matching Drizzle schema output
- `apps/web/src/lib/api.ts` - Added fetchArticulos server-side function
- `apps/web/src/lib/api.client.ts` - Added fetchArticulosClient, fetchArticuloByCodigoClient, toggleArticuloActivo
- `apps/web/src/components/tables/server-data-table.tsx` - Reusable server-side paginated table
- `apps/web/src/components/articulos/articulos-columns.tsx` - Column definitions with visibility defaults
- `apps/web/src/components/articulos/articulo-status-filter.tsx` - Segmented control for active/inactive filter
- `apps/web/src/components/articulos/articulo-sheet.tsx` - Read-only detail sheet with sectioned layout
- `apps/web/src/app/(dashboard)/articulos/page.tsx` - Server component fetching initial data
- `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` - Client component wiring table, search, filter, sheet
- `apps/web/src/config/navigation.ts` - Updated sidebar link from /articles to /articulos

## Decisions Made

- ServerDataTable uses TanStack Table manualPagination/manualFiltering/manualSorting for full server-driven data flow
- Date fields typed as string (JSON serialized) with format at display time — avoids hydration mismatches
- Sidebar navigation updated from /articles to /articulos to match new backend endpoints

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Articulos list page complete and ready for use
- Detail sheet Editar button links to /articulos/:codigo/editar (create/edit form in Plan 04)
- Nuevo Articulo button links to /articulos/nuevo (create form in Plan 04)
- ServerDataTable component reusable for depositos and other entity tables

---

_Phase: 14-schema-foundation-articulos-depositos_
_Completed: 2026-03-05_
