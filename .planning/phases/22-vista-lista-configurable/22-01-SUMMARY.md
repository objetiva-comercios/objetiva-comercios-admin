---
phase: 22-vista-lista-configurable
plan: 01
subsystem: articulos-table
tags: [column-visibility, db-driven, settings, tanstack-table]
dependency_graph:
  requires: []
  provides: [db-driven-column-visibility, articulos-4-new-columns, settings-immediate-persist]
  affects: [articulos-list, settings-articulos-page, server-data-table]
tech_stack:
  added: []
  patterns: [controlled-visibility-state, optimistic-update, module-level-cache]
key_files:
  created: []
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/modules/settings/articulos-config.ts
    - apps/web/src/types/articulo.ts
    - apps/web/src/types/articulos-config.ts
    - apps/web/src/components/articulos/articulos-columns.tsx
    - apps/web/src/components/tables/server-data-table.tsx
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx
    - apps/web/src/app/(dashboard)/settings/articulos/page.tsx
    - apps/web/src/components/existencias/existencias-por-deposito.tsx
decisions:
  - DB-driven TanStack VisibilityState via useMemo derivation from camposVisibles — no separate state for table visibility
  - Optimistic update pattern in ArticulosClient: setCamposVisibles locally then persist, revert on error
  - server-data-table uses controlled pattern with onColumnVisibilityChange diff algorithm
  - Settings page immediate-persist per toggle, no Save button
metrics:
  duration: ~25min
  completed: 2026-03-12
  tasks_completed: 2
  files_modified: 9
---

# Phase 22 Plan 01: Vista Lista Configurable — Column Visibility Foundation Summary

DB-driven column visibility for articulos table with 4 new columns (medida, presentacion, erpUnidades, objeto) and immediate-persist toggles in both table dropdown and Settings page.

## Tasks Completed

| Task | Name                                                      | Commit  | Files                                                                                                                           |
| ---- | --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Schema + types foundation                                 | e7802aa | schema.ts, articulos-config.ts (backend), articulo.ts, articulos-config.ts (web)                                                |
| 2A   | articulos-columns: 4 new columns, DB-driven visibility    | 8c0308c | articulos-columns.tsx                                                                                                           |
| 2B-E | server-data-table, articulos-client, settings page wiring | 4cd4d0b | server-data-table.tsx, articulos-client.tsx, settings/articulos/page.tsx, use-articulos-config.ts, existencias-por-deposito.tsx |

## What Was Built

- **Schema migration**: `objeto varchar(100)` column added to articulos table via Drizzle migration
- **Types extended**: `CamposVisibles` gains `erpUnidades` and `objeto` fields (backend + frontend); `Articulo` type gains `objeto: string | null`
- **4 new table columns**: medida, presentacion, erpUnidades (Unidades), objeto — all hideable, not sortable
- **Fixed columns**: codigo, nombre, activo, actions have `enableHiding: false` — not in dropdown
- **Controlled visibility**: `ServerDataTable` now accepts `columnVisibility` + `onColumnVisibilityChange` instead of `defaultColumnVisibility`
- **Human-readable dropdown labels**: column header text shown instead of raw column IDs
- **DB-driven flow**: `ArticulosClient` derives `VisibilityState` from `camposVisibles` via useMemo, persists changes via `updateSettings` on toggle
- **Optimistic updates**: local state updated immediately, reverted on API error with destructive toast
- **Settings immediate-persist**: each toggle in Settings/Articulos calls `updateSettings` directly, no Save button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] existencias-por-deposito.tsx used renamed prop**

- **Found during:** TypeScript check after Task 2B
- **Issue:** `existencias-por-deposito.tsx` passed `defaultColumnVisibility` prop to `ServerDataTable`, which was renamed to `columnVisibility` in Task 2B
- **Fix:** Renamed prop at call site to `columnVisibility`
- **Files modified:** `apps/web/src/components/existencias/existencias-por-deposito.tsx`
- **Commit:** 4cd4d0b

## Self-Check: PASSED

Files verified to exist:

- apps/web/src/components/articulos/articulos-columns.tsx — FOUND
- apps/web/src/components/tables/server-data-table.tsx — FOUND
- apps/web/src/app/(dashboard)/articulos/articulos-client.tsx — FOUND
- apps/web/src/app/(dashboard)/settings/articulos/page.tsx — FOUND

Commits verified:

- e7802aa — FOUND (Task 1)
- 8c0308c — FOUND (Task 2A)
- 4cd4d0b — FOUND (Task 2B-E)

TypeScript: compiles without errors
Next.js build: successful
