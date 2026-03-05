---
phase: 15-existencias
verified: 2026-03-05T19:00:00Z
status: passed
score: 4/4 success criteria verified
must_haves:
  truths:
    - 'User can view stock per articulo per deposito in a table with low-stock status badges when quantity falls below stock_minimo'
    - 'User can filter existencias by deposito (warehouse manager view) and view stock for a specific articulo across all depositos (product manager view)'
    - 'User can inline-edit stock quantities with adjustment reason and see total stock aggregation across depositos for each articulo'
    - 'Web type interfaces are aligned with the new DB schema (no type drift between backend Drizzle inference and web/mobile types)'
  artifacts:
    - path: 'apps/backend/src/db/schema.ts'
      provides: 'existencias table with composite PK'
    - path: 'apps/backend/src/modules/existencias/existencias.service.ts'
      provides: 'Dual-view queries, KPI, upsert, update'
    - path: 'apps/backend/src/modules/existencias/existencias.controller.ts'
      provides: '6 REST endpoints'
    - path: 'apps/web/src/types/existencia.ts'
      provides: 'Existencia type, StockStatus, ExistenciasKpi, ExistenciaMatrixRow'
    - path: 'apps/web/src/components/existencias/inline-edit-cell.tsx'
      provides: 'Reusable click-to-edit cell component'
    - path: 'apps/web/src/components/existencias/existencias-kpi-cards.tsx'
      provides: '3 clickable KPI stat cards'
    - path: 'apps/web/src/components/existencias/existencias-por-deposito.tsx'
      provides: 'Table view filtered by deposito with inline editing'
    - path: 'apps/web/src/components/existencias/existencias-por-articulo.tsx'
      provides: 'Matrix table with dynamic deposito columns and frozen left columns'
    - path: 'apps/web/src/components/articulos/articulo-sheet.tsx'
      provides: 'Detail sheet with Stock por Deposito section'
  key_links:
    - from: 'existencias.service.ts'
      to: 'schema.ts'
      via: 'Drizzle queries on existencias table'
    - from: 'depositos.service.ts'
      to: 'schema.ts'
      via: 'Aggregate count from existencias'
    - from: 'api.client.ts'
      to: 'existencias controller'
      via: '5 fetch functions for existencias endpoints'
    - from: 'existencias-client.tsx'
      to: 'api.client.ts'
      via: 'fetchExistenciasByDepositoClient, fetchExistenciasMatrixClient, fetchExistenciasKpiClient, updateExistenciaClient'
    - from: 'existencias-por-articulo.tsx'
      to: 'InlineEditCell'
      via: 'Renders InlineEditCell in each matrix cell'
    - from: 'articulo-sheet.tsx'
      to: 'api.client.ts'
      via: 'fetchExistenciasByArticuloClient on sheet open'
human_verification:
  - test: 'Navigate to /articulos and verify tab navigation between Listado and Existencias'
    expected: 'Both tabs render, active tab has border highlight, content switches without page reload'
    why_human: 'Visual layout and navigation behavior'
  - test: 'On /articulos/existencias, click a quantity cell to edit, press Enter to save, press Escape to cancel'
    expected: 'Click shows input, Enter saves with toast, Escape reverts, blur cancels without saving'
    why_human: 'Interactive keyboard behavior and toast feedback'
  - test: 'Click KPI cards to filter the table, verify counts match filtered results'
    expected: "Clicking 'Stock Bajo' filters table to only low-stock items, clicking again clears filter"
    why_human: 'Interactive filter behavior with data accuracy'
  - test: "Switch to 'Por Articulo' view and scroll horizontally"
    expected: 'Codigo and Articulo columns stay frozen/visible, deposito columns scroll independently'
    why_human: 'CSS sticky positioning behavior across browsers'
  - test: 'Open an articulo detail sheet and check Stock por Deposito section'
    expected: 'Shows per-deposito stock table with status badges and total row'
    why_human: 'Visual layout within sheet component'
---

# Phase 15: Existencias Verification Report

**Phase Goal:** Users can view and manage stock quantities per articulo per deposito with low-stock visibility
**Verified:** 2026-03-05T19:00:00Z
**Status:** passed
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| #   | Truth                                                                                                                                               | Status   | Evidence                                                                                                                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | User can view stock per articulo per deposito in a table with low-stock status badges when quantity falls below stock_minimo                        | VERIFIED | existencias-columns.tsx renders Badge with getStockStatus() computing normal/bajo/sin_stock; ExistenciasPorDeposito wires data to ServerDataTable; existencias.service.ts findByDeposito() joins articulos and filters by stockStatus                                                                    |
| 2   | User can filter existencias by deposito (warehouse manager view) and view stock for a specific articulo across all depositos (product manager view) | VERIFIED | existencias-client.tsx has deposito Select dropdown calling fetchExistenciasByDepositoClient; viewMode toggle switches to ExistenciasPorArticulo matrix with dynamic deposito columns; articulo-sheet.tsx fetches per-articulo stock via fetchExistenciasByArticuloClient                                |
| 3   | User can inline-edit stock quantities with adjustment reason and see total stock aggregation across depositos for each articulo                     | VERIFIED | InlineEditCell handles click-to-edit with Enter/Escape/blur; ExistenciasPorDeposito overrides cantidad/stockMinimo/stockMaximo cells with InlineEditCell; ExistenciasPorArticulo renders InlineEditCell in each matrix cell; Total column in matrix sums stock; optimistic updates + KPI refetch on save |
| 4   | Web type interfaces are aligned with the new DB schema (no type drift between backend Drizzle inference and web/mobile types)                       | VERIFIED | apps/web/src/types/existencia.ts defines Existencia, StockStatus, ExistenciasKpi, ExistenciaMatrixRow matching API response shapes; backend schema exports Existencia = typeof existencias.$inferSelect; API client functions import and return correct types                                            |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact                                                                    | Expected                               | Status   | Details                                                                                                                              |
| --------------------------------------------------------------------------- | -------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/backend/src/db/schema.ts`                                             | existencias table with composite PK    | VERIFIED | Composite PK on (articuloCodigo, depositoId) with indexes, FK references to articulos.codigo and depositos.id                        |
| `apps/backend/src/modules/existencias/existencias.service.ts`               | Dual-view queries, KPI, upsert, update | VERIFIED | 261 lines, 7 methods: findByDeposito, findMatrix, findByArticulo, getKpiStats, upsert, update, getStockSummaryByDeposito             |
| `apps/backend/src/modules/existencias/existencias.controller.ts`            | 6 REST endpoints                       | VERIFIED | GET /, GET /matrix, GET /kpi, GET /articulo/:articuloCodigo, POST /, PATCH /:articuloCodigo/:depositoId with RolesGuard on mutations |
| `apps/web/src/types/existencia.ts`                                          | Existencia type + StockStatus helper   | VERIFIED | Exports Existencia, StockStatus, getStockStatus, ExistenciasKpi, ExistenciaMatrixRow                                                 |
| `apps/web/src/components/existencias/inline-edit-cell.tsx`                  | Reusable click-to-edit cell            | VERIFIED | 107 lines, handles editing/saving/canceling states, Enter/Escape/blur, toast feedback, loading spinner                               |
| `apps/web/src/components/existencias/existencias-kpi-cards.tsx`             | 3 clickable KPI stat cards             | VERIFIED | 89 lines, renders 3 cards (Total con Stock, Stock Bajo, Sin Stock) with click-to-filter toggle, loading skeletons                    |
| `apps/web/src/components/existencias/existencias-por-deposito.tsx`          | Table view filtered by deposito        | VERIFIED | 82 lines, wraps ServerDataTable with InlineEditCell overrides on cantidad/stockMinimo/stockMaximo columns                            |
| `apps/web/src/components/existencias/existencias-por-articulo.tsx`          | Matrix table with frozen columns       | VERIFIED | 215 lines, custom HTML table with sticky left columns, dynamic deposito columns, InlineEditCell in cells, pagination                 |
| `apps/web/src/components/articulos/articulo-sheet.tsx`                      | Detail sheet with Stock section        | VERIFIED | Stock por Deposito section with useEffect fetch, status badges, total row, skeleton loading, empty state                             |
| `apps/web/src/app/(dashboard)/articulos/layout.tsx`                         | Tab navigation (Listado, Existencias)  | VERIFIED | Client layout with Link + usePathname active detection                                                                               |
| `apps/web/src/app/(dashboard)/articulos/existencias/page.tsx`               | Server component with initial data     | VERIFIED | Fetches depositos + initial existencias + KPI server-side, passes to ExistenciasClient                                               |
| `apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx` | Main orchestrator                      | VERIFIED | 337 lines, manages dual-view state, deposito selector, search, pagination, optimistic updates, KPI refetch                           |
| `apps/web/src/components/existencias/existencias-columns.tsx`               | Column definitions with status badges  | VERIFIED | 134 lines, 7 columns with Badge rendering for status, default visibility config                                                      |
| `apps/web/src/lib/api.client.ts`                                            | Client-side API functions              | VERIFIED | 5 existencias functions: fetchByDeposito, fetchMatrix, fetchKpi, fetchByArticulo, updateExistencia                                   |
| `apps/web/src/lib/api.ts`                                                   | Server-side API functions              | VERIFIED | fetchExistencias and fetchExistenciasKpi for SSR                                                                                     |
| `apps/backend/src/modules/depositos/depositos.service.ts`                   | Real stock aggregation                 | VERIFIED | Imports existencias schema, aggregates totalArticulos (count) and totalUnidades (sum) grouped by depositoId                          |
| `apps/backend/src/app.module.ts`                                            | ExistenciasModule registered           | VERIFIED | ExistenciasModule imported and in module imports                                                                                     |

### Key Link Verification

| From                         | To                            | Via                 | Status | Details                                                                                                                             |
| ---------------------------- | ----------------------------- | ------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| existencias.service.ts       | schema.ts (existencias table) | Drizzle queries     | WIRED  | All 7 methods query existencias table with proper joins to articulos/depositos                                                      |
| depositos.service.ts         | schema.ts (existencias table) | Aggregate query     | WIRED  | Imports existencias, groups by depositoId for totalArticulos/totalUnidades                                                          |
| api.client.ts                | existencias controller        | fetch functions     | WIRED  | 5 client functions matching 5 of 6 controller endpoints (POST upsert not needed client-side)                                        |
| existencias-client.tsx       | api.client.ts                 | State management    | WIRED  | Imports and calls fetchExistenciasByDepositoClient, fetchExistenciasMatrixClient, fetchExistenciasKpiClient, updateExistenciaClient |
| existencias-por-articulo.tsx | InlineEditCell                | Cell rendering      | WIRED  | Renders InlineEditCell per deposito cell with onStockUpdate callback                                                                |
| articulo-sheet.tsx           | api.client.ts                 | Stock fetch on open | WIRED  | useEffect calls fetchExistenciasByArticuloClient(articulo.codigo) with cancellation                                                 |
| layout.tsx                   | /articulos/existencias        | Link navigation     | WIRED  | Tab links with usePathname active detection                                                                                         |
| existencias page.tsx         | ExistenciasClient             | Server data passing | WIRED  | Fetches depositos, existencias, KPI server-side and passes as props                                                                 |

### Requirements Coverage

| Requirement | Source Plan         | Description                                                         | Status    | Evidence                                                                                    |
| ----------- | ------------------- | ------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------- |
| EXI-01      | 15-01, 15-02        | View stock per articulo per deposito with low-stock badges          | SATISFIED | ExistenciasPorDeposito table + status badges via getStockStatus                             |
| EXI-02      | 15-01, 15-02        | Filter existencias by deposito (warehouse manager view)             | SATISFIED | Deposito Select dropdown in existencias-client.tsx, findByDeposito endpoint                 |
| EXI-03      | 15-01, 15-03        | View stock for articulo across all depositos (product manager view) | SATISFIED | ExistenciasPorArticulo matrix view + articulo-sheet Stock section                           |
| EXI-04      | 15-01, 15-03        | Total stock aggregation across depositos per articulo               | SATISFIED | Total column in matrix view, total row in articulo sheet                                    |
| EXI-05      | 15-01, 15-02, 15-03 | Inline-edit stock quantities                                        | SATISFIED | InlineEditCell in both por-deposito and por-articulo views, PATCH endpoint                  |
| EXI-06      | 15-01, 15-02        | Low stock alerts when quantity below stock_minimo                   | SATISFIED | KPI cards (Stock Bajo, Sin Stock), status badges, getStockStatus helper                     |
| EXI-07      | 15-01, 15-02        | Min/max stock thresholds per articulo-deposito combination          | SATISFIED | stockMinimo/stockMaximo columns in schema, editable in por-deposito view                    |
| MIG-02      | 15-01               | Inventory table replaced by existencias table (composite PK)        | SATISFIED | existencias table with primaryKey(articuloCodigo, depositoId) in schema                     |
| DEBT-02     | 15-01               | Web type drift resolved -- type interfaces aligned with DB schema   | SATISFIED | apps/web/src/types/existencia.ts matches API response shape, backend exports inferred types |

### Anti-Patterns Found

| File | Line | Pattern    | Severity | Impact |
| ---- | ---- | ---------- | -------- | ------ |
| -    | -    | None found | -        | -      |

No TODO, FIXME, placeholder stubs, empty implementations, or console.log-only handlers detected in phase 15 files. The "placeholder" text in existencias-client.tsx is legitimate HTML placeholder attributes on Input elements.

### Human Verification Required

### 1. Tab Navigation Visual Behavior

**Test:** Navigate to /articulos and click between "Listado" and "Existencias" tabs
**Expected:** Both tabs render correctly, active tab has primary border highlight, content switches without full page reload
**Why human:** Visual layout and client-side navigation behavior

### 2. Inline Edit Interaction

**Test:** On /articulos/existencias, click a quantity cell, type a new value, press Enter; then click another cell and press Escape
**Expected:** Enter saves with "Stock actualizado" toast, Escape reverts value, blur cancels without saving
**Why human:** Interactive keyboard behavior, toast feedback timing, focus management

### 3. KPI Card Filtering

**Test:** Click the "Stock Bajo" KPI card, verify table filters; click again to clear
**Expected:** Table shows only low-stock items when card active, all items when cleared; card gets ring highlight when active
**Why human:** Interactive filter behavior with data accuracy verification

### 4. Matrix Frozen Columns

**Test:** Switch to "Por Articulo" view, scroll horizontally if depositos exceed viewport width
**Expected:** Codigo and Articulo columns stay frozen/visible with shadow separator, deposito columns scroll
**Why human:** CSS sticky positioning behavior across browsers and viewport sizes

### 5. Articulo Sheet Stock Section

**Test:** From the articulos list, open any articulo detail sheet
**Expected:** Stock por Deposito section appears after Precios, shows per-deposito table with status badges and total
**Why human:** Visual layout within sheet, data loading behavior

### Gaps Summary

No gaps found. All 4 success criteria are verified through code inspection:

1. **Schema and data layer** -- existencias table with composite PK, 6 REST endpoints with proper Drizzle queries, KPI aggregation, depositos stock summary.
2. **Web UI -- Por Deposito view** -- Tab navigation, deposito selector, KPI cards with click-to-filter, ServerDataTable with InlineEditCell on editable columns, status badges.
3. **Web UI -- Por Articulo view** -- Matrix table with dynamic deposito columns, frozen left columns via CSS sticky, InlineEditCell in every cell, total column.
4. **Articulo Sheet integration** -- Stock por Deposito section with useEffect fetch, status badges, total row.
5. **Type alignment** -- Web types match API response shapes, backend exports Drizzle-inferred types.

All artifacts exist, are substantive (no stubs), and are properly wired through imports, API calls, and component composition.

---

_Verified: 2026-03-05T19:00:00Z_
_Verifier: Claude (gsd-verifier)_
