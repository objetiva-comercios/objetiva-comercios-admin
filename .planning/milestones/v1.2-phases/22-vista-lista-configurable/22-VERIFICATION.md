---
phase: 22-vista-lista-configurable
verified: 2026-03-12T04:15:07Z
status: gaps_found
score: 8/9 must-haves verified
gaps:
  - truth: 'Fixed columns (codigo, nombre, activo, actions) cannot be hidden'
    status: partial
    reason: 'precio column is missing enableHiding:false — it appears in the Columnas dropdown but toggling it has no effect (callback returns early with no state change and no DB persist). The column is effectively un-hideable but it silently appears in the dropdown, causing confusing UX.'
    artifacts:
      - path: 'apps/web/src/components/articulos/articulos-columns.tsx'
        issue: 'precio column at line 166 has no enableHiding:false. It also lacks a CamposVisibles mapping. Expected behavior: precio should never be hideable (like codigo/nombre/activo/actions).'
    missing:
      - 'Add enableHiding: false to the precio column definition in articulos-columns.tsx'
human_verification:
  - test: 'Navigate to /articulos, open Columnas dropdown, verify precio column does NOT appear in dropdown'
    expected: 'Only the configurable columns (Marca, Modelo, Medida, etc.) appear in the dropdown — precio is always visible and never listed'
    why_human: 'The gap is visible only in the dropdown UI; automated checks confirm the code path but cannot simulate the rendered dropdown'
  - test: 'Toggle a column (e.g. Modelo) in the dropdown, reload page, verify the column remains hidden'
    expected: 'Column visibility persists across page reloads via DB-backed settings'
    why_human: 'Requires a running browser session and page reload to confirm DB persistence'
  - test: 'Go to Settings/Articulos, toggle any field, verify no Save button exists'
    expected: 'Each toggle immediately persists without a Save button'
    why_human: 'Requires visual inspection of the Settings page UI'
  - test: 'Click Codigo header, click again, click third time'
    expected: 'First click: ascending sort + ArrowUp icon. Second: descending + ArrowDown. Third: unsorted + ArrowUpDown (muted)'
    why_human: 'Tri-state cycle requires live browser interaction'
---

# Phase 22: Vista Lista Configurable — Verification Report

**Phase Goal:** Vista lista configurable — columnas configurables con visibilidad DB-driven y sorting server-side
**Verified:** 2026-03-12T04:15:07Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                           | Status   | Evidence                                                                                                                                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can toggle column visibility in the table dropdown and changes persist across page reload  | VERIFIED | `handleColumnVisibilityChange` calls `updateSettings` + `invalidateArticulosConfig`; `columnVisibility` useMemo derives from DB-loaded `effectiveCamposVisibles`                                                                                                           |
| 2   | Settings/Articulos page shows same toggles and changes sync bidirectionally with table dropdown | VERIFIED | `settings/articulos/page.tsx` calls `updateSettings` + `invalidateArticulosConfig` on each toggle; no Save button present                                                                                                                                                  |
| 3   | Four new columns (medida, presentacion, erpUnidades, objeto) appear in the table when visible   | VERIFIED | All 4 columns defined in `articulos-columns.tsx` lines 125-164; all mapped in `columnVisibility` useMemo                                                                                                                                                                   |
| 4   | Fixed columns (codigo, nombre, activo, actions) cannot be hidden                                | PARTIAL  | `codigo` (L77), `nombre` (L103), `activo` (L199), `actions` (L295) have `enableHiding: false`. However, `precio` column (L166) does NOT have `enableHiding: false` and is NOT in `columnVisibility` map — it appears in the dropdown but toggling it silently does nothing |
| 5   | User can click a sortable column header and the list re-sorts server-side                       | VERIFIED | `handleSortChange` calls `fetchData` with `newSortBy`/`newSortOrder`; `fetchArticulosClient` passes `sortBy`/`sortOrder` as query params                                                                                                                                   |
| 6   | Sort cycles through ascending, descending, and no-sort on repeated clicks                       | VERIFIED | `enableSortingRemoval: true` in `useReactTable`; `onSortingChange` sends `null` when `newSorting.length === 0`                                                                                                                                                             |
| 7   | Visual arrow indicator shows current sort direction on the active column                        | VERIFIED | All 4 sortable columns use tri-state render: `ArrowUp`/`ArrowDown`/`ArrowUpDown` based on `column.getIsSorted()`                                                                                                                                                           |
| 8   | Non-sortable columns have plain text headers with no click behavior                             | VERIFIED | `enableSorting: false` on all non-sortable columns (marca, modelo, medida, presentacion, erpUnidades, objeto, sku, codigoBarras, talle, color, material, erpCodigo)                                                                                                        |
| 9   | Changing sort resets pagination to page 1                                                       | VERIFIED | `handleSortChange` calls `setPage(1)` before `fetchData(1, ...)`                                                                                                                                                                                                           |

**Score:** 8/9 truths verified (1 partial)

---

## Required Artifacts

| Artifact                                                      | Expected                                                                             | Status   | Details                                                                                                                                                                                                          |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `apps/backend/src/db/schema.ts`                               | objeto varchar column in articulos table                                             | VERIFIED | `objeto: text('objeto')` at line 196 (commit e7802aa notes column pre-existed in DB)                                                                                                                             |
| `apps/web/src/types/articulos-config.ts`                      | CamposVisibles with erpUnidades + objeto fields                                      | VERIFIED | Both `erpUnidades: boolean` (L13) and `objeto: boolean` (L16) present; DEFAULT_ARTICULOS_CONFIG sets both to `true`                                                                                              |
| `apps/web/src/components/articulos/articulos-columns.tsx`     | All columns with enableHiding/enableSorting flags, no defaultColumnVisibility export | VERIFIED | No `defaultColumnVisibility` export; all columns have explicit `enableSorting` flags; fixed columns have `enableHiding: false`. Gap: `precio` missing `enableHiding: false`                                      |
| `apps/web/src/components/tables/server-data-table.tsx`        | Controlled columnVisibility + onColumnVisibilityChange callback props                | VERIFIED | Props `columnVisibility?: VisibilityState` and `onColumnVisibilityChange?: (columnId: string, visible: boolean) => void` at lines 42-43; `SortingState` controlled via `sortBy`/`sortOrder`/`onSortChange` props |
| `apps/web/src/app/(dashboard)/settings/articulos/page.tsx`    | Immediate-persist per-toggle without Save button                                     | VERIFIED | `handleToggle` calls `updateSettings` directly; no Save button in JSX                                                                                                                                            |
| `apps/web/src/lib/api.client.ts`                              | sortBy and sortOrder query params in fetchArticulosClient                            | VERIFIED | `sortBy?: string` and `sortOrder?: 'asc'                                                                                                                                                                         | 'desc'`in params type;`searchParams.set('sortBy', ...)` at lines 113-114 |
| `apps/web/src/app/(dashboard)/articulos/articulos-client.tsx` | Sort state management with page reset on sort change                                 | VERIFIED | `sortBy`/`sortOrder` state; `handleSortChange` with `setPage(1)` + `fetchData(1, ...)`                                                                                                                           |

---

## Key Link Verification

| From                    | To                        | Via                                                | Status | Details                                                                                                                                  |
| ----------------------- | ------------------------- | -------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------------------------------------- |
| `articulos-client.tsx`  | `use-articulos-config.ts` | `useArticulosConfig` + `invalidateArticulosConfig` | WIRED  | Imported at line 30; `invalidateArticulosConfig` called in `handleColumnVisibilityChange` after `updateSettings`                         |
| `server-data-table.tsx` | `articulos-client.tsx`    | `onColumnVisibilityChange` callback prop           | WIRED  | Prop defined in interface (L43); passed at JSX line 288; callback fires diff algorithm and calls parent                                  |
| `articulos-client.tsx`  | `api.client.ts`           | `updateSettings` call on toggle                    | WIRED  | `updateSettings` imported at line 27; called in `handleColumnVisibilityChange` at line 209 with `articulosConfig.camposVisibles` payload |
| `articulos-client.tsx`  | `api.client.ts`           | sortBy/sortOrder params to fetchArticulosClient    | WIRED  | `fetchArticulosClient({ ..., sortBy: fetchSortBy                                                                                         |     | undefined, sortOrder: ... })` at lines 89-90 |
| `server-data-table.tsx` | `articulos-client.tsx`    | `onSortChange` callback from header click          | WIRED  | `onSortChange` prop at line 48; wired via `onSortingChange` handler at lines 97-105; passed from parent at JSX line 293                  |

---

## Requirements Coverage

| Requirement | Source Plan   | Description                                                                                         | Status    | Evidence                                                                                                                                                                           |
| ----------- | ------------- | --------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VIEW-01     | 22-01-PLAN.md | User can configure which columns are visible in the articulos list (global setting persisted in DB) | SATISFIED | DB-driven visibility via `useArticulosConfig` hook, `updateSettings` PATCH on toggle, `invalidateArticulosConfig` cache busting. Partial gap: `precio` in dropdown with no effect. |
| VIEW-03     | 22-02-PLAN.md | User can sort the articulos list by clicking column headers (asc/desc)                              | SATISFIED | 4 sortable columns (Codigo, Nombre, Precio, Costo) with tri-state TanStack headers; `sortBy`/`sortOrder` passed to backend; `enableSortingRemoval: true` for third-click unsort    |

No orphaned requirements found — both VIEW-01 and VIEW-03 appear in REQUIREMENTS.md mapped to Phase 22 and are accounted for in the plans.

---

## Anti-Patterns Found

| File                    | Line | Pattern                                                                               | Severity | Impact                                                                                                  |
| ----------------------- | ---- | ------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `articulos-columns.tsx` | 166  | `precio` column lacks `enableHiding: false` and is absent from `columnVisibility` map | Warning  | Column appears in dropdown; toggling it silently does nothing — misleading UX, not a functional blocker |

No TODO/FIXME/placeholder comments found in modified files. No empty return implementations detected.

---

## Human Verification Required

### 1. Columnas Dropdown — precio omission

**Test:** Navigate to `/articulos`, click the "Columnas" button (top-right of table), inspect the dropdown list.
**Expected:** `precio` (Precio) should NOT appear in the dropdown. Only the configurable CamposVisibles columns should appear.
**Why human:** The code gap (missing `enableHiding: false` on `precio`) makes this appear in the dropdown; a human must confirm the current broken behavior and validate after fix.

### 2. Column visibility persistence across reload

**Test:** Hide "Modelo" via the Columnas dropdown. Reload the page. Confirm Modelo column is still hidden.
**Expected:** Visibility state loads from DB on every page load — toggling persists globally.
**Why human:** Requires running backend + web servers and a live browser session.

### 3. Settings/Articulos immediate-persist

**Test:** Navigate to `/settings/articulos`. Toggle any field. Confirm the switch state changes immediately with no Save button visible. Navigate to `/articulos` and confirm the column reflects the change.
**Expected:** Each toggle persists immediately; no "Guardar cambios" button exists; table reflects the change.
**Why human:** Bidirectional sync check requires live session.

### 4. Sort tri-state cycle on Codigo header

**Test:** Click "Codigo" header 3 times.
**Expected:** Click 1 → ascending (ArrowUp icon, data sorted A→Z). Click 2 → descending (ArrowDown, Z→A). Click 3 → default sort restored (ArrowUpDown muted icon).
**Why human:** Requires live data and backend response to confirm server-side sort is actually applied.

---

## Gaps Summary

One gap found affecting truth #4 (fixed columns cannot be hidden):

The `precio` column in `apps/web/src/components/articulos/articulos-columns.tsx` is missing `enableHiding: false`. This causes `precio` to appear in the "Columnas" dropdown in the UI. When a user tries to toggle it, the `handleColumnVisibilityChange` callback fires but returns early (the `columnIdToCampoKey` map has no entry for `'precio'`), so no state update and no DB persist occurs — the column stays visible regardless. The fix is a single-line addition: add `enableHiding: false` to the `precio` column definition.

This is a UX defect (misleading dropdown entry) rather than a complete feature failure — the primary VIEW-01 functionality (configuring the 13 CamposVisibles columns) works correctly. VIEW-03 (server-side sorting) is fully operational with no gaps.

---

_Verified: 2026-03-12T04:15:07Z_
_Verifier: Claude (gsd-verifier)_
