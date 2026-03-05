---
phase: 15-existencias
plan: 01
subsystem: api, database
tags: [drizzle, nestjs, existencias, composite-pk, kpi, matrix-view]

requires:
  - phase: 14-schema-foundation-articulos-depositos
    provides: articulos and depositos tables with schema and seed
provides:
  - existencias table with composite PK (articulo_codigo, deposito_id)
  - ExistenciasModule with 6 REST endpoints
  - Real depositos stockSummary aggregation
  - Web Existencia type, StockStatus helper, API client functions
affects: [15-02, 15-03, existencias-ui, depositos-ui]

tech-stack:
  added: []
  patterns: [composite-pk-table, dual-view-endpoints, kpi-aggregation, upsert-on-conflict]

key-files:
  created:
    - apps/backend/src/db/generators/existencia.generator.ts
    - apps/backend/src/modules/existencias/existencias.module.ts
    - apps/backend/src/modules/existencias/existencias.controller.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/existencias/dto/existencia-query.dto.ts
    - apps/backend/src/modules/existencias/dto/update-existencia.dto.ts
    - apps/backend/src/modules/existencias/dto/create-existencia.dto.ts
    - apps/web/src/types/existencia.ts
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/modules/depositos/depositos.service.ts
    - apps/backend/src/app.module.ts
    - apps/web/src/lib/api.ts
    - apps/web/src/lib/api.client.ts

key-decisions:
  - 'Sparse stock matrix in seed: each articulo assigned to 1-3 random depositos, not all'
  - 'Matrix endpoint returns pre-built stock Record<depositoId, cantidad> per articulo row'
  - 'KPI uses SQL CASE+count for single-query aggregation of stock status categories'

patterns-established:
  - 'Composite PK pattern: primaryKey({ columns: [...] }) with individual indexes on each FK'
  - 'Dual-view query pattern: same data served as flat list (by deposito) and matrix (by articulo)'
  - 'Upsert pattern: onConflictDoUpdate with composite target for existencias'

requirements-completed: [MIG-02, DEBT-02, EXI-01, EXI-02, EXI-03, EXI-04, EXI-05, EXI-06, EXI-07]

duration: 5min
completed: 2026-03-05
---

# Phase 15 Plan 01: Existencias Data Layer Summary

**Existencias table with composite PK, 6 REST endpoints (list/matrix/KPI/by-articulo/upsert/update), real depositos stock aggregation, and web API client functions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T18:29:32Z
- **Completed:** 2026-03-05T18:34:10Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- Existencias table with composite PK (articulo_codigo, deposito_id) seeded with 595 sparse stock records across 300 articulos and 5 depositos
- ExistenciasModule with dual-view endpoints: flat list by deposito and matrix view grouped by articulo
- KPI aggregation endpoint returning totalConStock, stockBajo, sinStock in a single query
- Depositos list now returns real stockSummary (totalArticulos, totalUnidades) from existencias table
- Web type interfaces (Existencia, ExistenciaMatrixRow, ExistenciasKpi) and 6 API client functions ready for UI consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Create existencias schema, seed generator, and type exports** - `53b4711` (feat)
2. **Task 2: Create ExistenciasModule with dual-view endpoints, KPI, PATCH, and update depositos stockSummary** - `5f7b27a` (feat)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` - Added existencias table with composite PK and type exports
- `apps/backend/src/db/generators/existencia.generator.ts` - Seed generator with sparse matrix logic
- `apps/backend/src/db/seed.ts` - Existencias seeding integrated into seed flow
- `apps/web/src/types/existencia.ts` - Existencia, StockStatus, ExistenciasKpi, ExistenciaMatrixRow types
- `apps/backend/src/modules/existencias/existencias.module.ts` - NestJS module registration
- `apps/backend/src/modules/existencias/existencias.controller.ts` - 6 REST endpoints
- `apps/backend/src/modules/existencias/existencias.service.ts` - Dual-view queries, KPI, upsert, update
- `apps/backend/src/modules/existencias/dto/existencia-query.dto.ts` - Query DTO with stockStatus filter
- `apps/backend/src/modules/existencias/dto/create-existencia.dto.ts` - Create/upsert DTO
- `apps/backend/src/modules/existencias/dto/update-existencia.dto.ts` - Partial update DTO
- `apps/backend/src/modules/depositos/depositos.service.ts` - Real stock aggregation replacing hardcoded zeros
- `apps/backend/src/app.module.ts` - ExistenciasModule registered
- `apps/web/src/lib/api.ts` - Server-side fetchExistencias and fetchExistenciasKpi
- `apps/web/src/lib/api.client.ts` - 6 client-side API functions for existencias

## Decisions Made

- Sparse stock matrix in seed: each articulo assigned to 1-3 random depositos (realistic, not all-to-all)
- Matrix endpoint pre-builds stock Record<depositoId, cantidad> per articulo for direct UI consumption
- KPI uses SQL CASE+count for single-query aggregation instead of multiple queries
- Depositos stockSummary aggregated in a single grouped query for all depositos at once

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed DTO strict property initialization**

- **Found during:** Task 2 (ExistenciasModule)
- **Issue:** CreateExistenciaDto properties without definite assignment assertion caused tsc error
- **Fix:** Added `!` assertion to required properties following existing articulo DTO pattern
- **Files modified:** apps/backend/src/modules/existencias/dto/create-existencia.dto.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** 5f7b27a (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript strictness fix. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 6 existencias API endpoints operational with seeded data
- Web types and API client functions ready for UI plans (15-02, 15-03)
- Depositos stockSummary showing real data for existing depositos UI

---

_Phase: 15-existencias_
_Completed: 2026-03-05_
