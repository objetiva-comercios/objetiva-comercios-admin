---
phase: 14-schema-foundation-articulos-depositos
plan: 02
subsystem: api
tags: [nestjs, drizzle, crud, pagination, ilike-search, rest-api]

# Dependency graph
requires:
  - phase: 14-01
    provides: articulos and depositos Drizzle schema tables with type exports
provides:
  - ArticulosModule with full CRUD, multi-field ILIKE search, pagination, and active filter
  - DepositosModule with CRUD and placeholder stock counts
  - REST endpoints registered in AppModule
affects: [14-03, 14-04, 14-05]

# Tech tracking
tech-stack:
  added: []
  patterns: [text-pk-param-pattern, multi-field-ilike-search, placeholder-stock-counts]

key-files:
  created:
    - apps/backend/src/modules/articulos/articulos.module.ts
    - apps/backend/src/modules/articulos/articulos.controller.ts
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/backend/src/modules/articulos/dto/articulo-query.dto.ts
    - apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
    - apps/backend/src/modules/articulos/dto/update-articulo.dto.ts
    - apps/backend/src/modules/depositos/depositos.module.ts
    - apps/backend/src/modules/depositos/depositos.controller.ts
    - apps/backend/src/modules/depositos/depositos.service.ts
    - apps/backend/src/modules/depositos/dto/create-deposito.dto.ts
    - apps/backend/src/modules/depositos/dto/update-deposito.dto.ts
  modified:
    - apps/backend/src/app.module.ts

key-decisions:
  - 'Text PK param (:codigo) on articulos endpoints — no ParseIntPipe, NestJS auto-decodes URL params'
  - 'Placeholder stockSummary (0/0) on depositos list — real counts deferred to Phase 15 existencias'
  - "Separate sortBy/sortOrder params on ArticuloQueryDto instead of products' combined sort param"

patterns-established:
  - "Text PK controller pattern: @Param('codigo') with string type, no pipe"
  - 'Deposito stock placeholder: hardcoded {totalArticulos: 0, totalUnidades: 0} until existencias table'

requirements-completed: [ART-01, ART-02, ART-05, ART-07, DEP-01, DEP-02, DEP-03, DEP-04]

# Metrics
duration: 3min
completed: 2026-03-05
---

# Phase 14 Plan 02: Backend Modules Summary

**NestJS CRUD modules for articulos (multi-field ILIKE search, pagination, activo filter) and depositos (placeholder stock counts) following products module pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T14:07:36Z
- **Completed:** 2026-03-05T14:10:25Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments

- ArticulosModule with 5-field ILIKE search, pagination, activo filter, and text PK routing
- DepositosModule with CRUD and placeholder stockSummary for future existencias integration
- All write endpoints protected with admin role via RolesGuard
- Both modules registered in AppModule, backend compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: Create ArticulosModule with full CRUD, search, and pagination** - `85445c8` (feat)
2. **Task 2: Create DepositosModule with CRUD and placeholder stock counts** - `d3cbe27` (feat)

## Files Created/Modified

- `apps/backend/src/modules/articulos/articulos.module.ts` - Module definition with service export
- `apps/backend/src/modules/articulos/articulos.controller.ts` - REST endpoints with text PK :codigo param
- `apps/backend/src/modules/articulos/articulos.service.ts` - CRUD with multi-field ILIKE search and pagination
- `apps/backend/src/modules/articulos/dto/articulo-query.dto.ts` - Query DTO extending QueryDto with activo filter and sortBy/sortOrder
- `apps/backend/src/modules/articulos/dto/create-articulo.dto.ts` - Create DTO with class-validator decorators for all articulo fields
- `apps/backend/src/modules/articulos/dto/update-articulo.dto.ts` - Update DTO with all fields optional, codigo excluded
- `apps/backend/src/modules/depositos/depositos.module.ts` - Module definition with service export
- `apps/backend/src/modules/depositos/depositos.controller.ts` - REST endpoints with ParseIntPipe for serial PK
- `apps/backend/src/modules/depositos/depositos.service.ts` - CRUD with placeholder stock counts
- `apps/backend/src/modules/depositos/dto/create-deposito.dto.ts` - Create DTO: nombre required, direccion/descripcion optional
- `apps/backend/src/modules/depositos/dto/update-deposito.dto.ts` - Update DTO: all fields optional
- `apps/backend/src/app.module.ts` - Added ArticulosModule and DepositosModule imports

## Decisions Made

- Used text PK param (:codigo) on articulos endpoints with no ParseIntPipe — NestJS auto-decodes URL params
- Placeholder stockSummary (0/0) on depositos list — real counts deferred to Phase 15 when existencias table exists
- Added separate sortBy/sortOrder params on ArticuloQueryDto for explicit control (vs products' combined sort param)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added definite assignment assertion on required DTO fields**

- **Found during:** Task 1 (ArticulosModule)
- **Issue:** TypeScript strictPropertyInitialization error on `codigo` and `nombre` required fields in CreateArticuloDto
- **Fix:** Added `!` definite assignment assertion (`codigo!: string`) — standard NestJS DTO pattern
- **Files modified:** apps/backend/src/modules/articulos/dto/create-articulo.dto.ts
- **Verification:** `tsc --noEmit` passes cleanly
- **Committed in:** 85445c8 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor TypeScript fix, standard NestJS pattern. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Backend API layer complete for articulos and depositos
- Plans 03, 04, 05 can consume these endpoints for web frontend implementation
- Stock counts are placeholder (0/0) until Phase 15 adds existencias table

---

_Phase: 14-schema-foundation-articulos-depositos_
_Completed: 2026-03-05_
