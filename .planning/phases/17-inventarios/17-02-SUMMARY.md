---
phase: 17-inventarios
plan: 02
subsystem: api
tags: [nestjs, drizzle, inventarios, dispositivos, sectores, crud, rbac]

requires:
  - phase: 17-inventarios-01
    provides: Schema tables for inventarios, inventarios_articulos, dispositivos_moviles, inventario_sectores
provides:
  - InventariosModule with 9 REST endpoints (CRUD + status workflow + discrepancy query)
  - DispositivosModule with 5 REST endpoints (CRUD + toggle)
  - Depositos extended with 4 sectores CRUD endpoints
affects: [17-03, 17-04, 17-05]

tech-stack:
  added: []
  patterns:
    [
      status-transition-map,
      assertEventEditable-guard,
      discrepancy-left-join-coalesce,
      unique-constraint-409,
    ]

key-files:
  created:
    - apps/backend/src/modules/inventarios/inventarios.module.ts
    - apps/backend/src/modules/inventarios/inventarios.controller.ts
    - apps/backend/src/modules/inventarios/inventarios.service.ts
    - apps/backend/src/modules/inventarios/dto/create-inventario.dto.ts
    - apps/backend/src/modules/inventarios/dto/update-inventario.dto.ts
    - apps/backend/src/modules/inventarios/dto/inventario-query.dto.ts
    - apps/backend/src/modules/inventarios/dto/create-inventario-articulo.dto.ts
    - apps/backend/src/modules/inventarios/dto/update-inventario-articulo.dto.ts
    - apps/backend/src/modules/dispositivos/dispositivos.module.ts
    - apps/backend/src/modules/dispositivos/dispositivos.controller.ts
    - apps/backend/src/modules/dispositivos/dispositivos.service.ts
    - apps/backend/src/modules/dispositivos/dto/create-dispositivo.dto.ts
    - apps/backend/src/modules/dispositivos/dto/update-dispositivo.dto.ts
    - apps/backend/src/modules/depositos/dto/create-sector.dto.ts
    - apps/backend/src/modules/depositos/dto/update-sector.dto.ts
  modified:
    - apps/backend/src/modules/depositos/depositos.controller.ts
    - apps/backend/src/modules/depositos/depositos.service.ts
    - apps/backend/src/app.module.ts

key-decisions:
  - 'Status transition map as const object with explicit allowed transitions per state'
  - 'Discrepancy query uses LEFT JOIN existencias filtered by event depositoId with COALESCE for null safety'
  - 'Unique constraint violations return 409 Conflict with descriptive Spanish messages'

patterns-established:
  - 'Status workflow: TRANSITION_MAP constant + validateTransition() private method + assertEventEditable() guard'
  - 'Nested resource endpoints: sectores nested under depositos/:id/sectores with depositoId ownership check'

requirements-completed: [INV-01, INV-02, INV-03, INV-04, INV-05, INV-07, INV-08, INV-09]

duration: 6min
completed: 2026-03-06
---

# Phase 17 Plan 02: Backend API Modules Summary

**NestJS modules for inventarios (9 endpoints with status workflow + discrepancy query), dispositivos (5 endpoints with toggle), and depositos sectores CRUD (4 endpoints)**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-06T01:07:24Z
- **Completed:** 2026-03-06T01:13:48Z
- **Tasks:** 2
- **Files modified:** 18

## Accomplishments

- InventariosModule with full CRUD, paginated list with estado/fecha filters, status transition validation, and discrepancy query joining inventarios_articulos with existencias via COALESCE
- DispositivosModule with CRUD and activo toggle, handling unique constraint on identificador
- Depositos extended with 4 nested sectores endpoints verifying sector ownership before update/delete
- Both new modules registered in AppModule, full build passes

## Task Commits

Each task was committed atomically:

1. **Task 1: Create InventariosModule with full CRUD, status workflow, and discrepancy query** - `53481bd` (feat)
2. **Task 2: Create DispositivosModule and extend DepositosModule with sectores** - `e3edf6d` (feat)

## Files Created/Modified

- `apps/backend/src/modules/inventarios/inventarios.module.ts` - Module registration
- `apps/backend/src/modules/inventarios/inventarios.controller.ts` - 9 REST endpoints for inventory events and counts
- `apps/backend/src/modules/inventarios/inventarios.service.ts` - Business logic: CRUD, status transitions, discrepancy query, event editability guard
- `apps/backend/src/modules/inventarios/dto/*.ts` - 5 DTOs with class-validator decorators
- `apps/backend/src/modules/dispositivos/dispositivos.module.ts` - Module registration
- `apps/backend/src/modules/dispositivos/dispositivos.controller.ts` - 5 REST endpoints for mobile devices
- `apps/backend/src/modules/dispositivos/dispositivos.service.ts` - CRUD + toggle with unique constraint handling
- `apps/backend/src/modules/dispositivos/dto/*.ts` - 2 DTOs with class-validator decorators
- `apps/backend/src/modules/depositos/depositos.controller.ts` - Extended with 4 sectores endpoints
- `apps/backend/src/modules/depositos/depositos.service.ts` - Extended with sectores CRUD methods
- `apps/backend/src/modules/depositos/dto/create-sector.dto.ts` - Sector creation DTO
- `apps/backend/src/modules/depositos/dto/update-sector.dto.ts` - Sector update DTO
- `apps/backend/src/app.module.ts` - Added InventariosModule and DispositivosModule imports

## Decisions Made

- Status transition map as const object with explicit allowed transitions per state (pendiente->[en_curso,cancelado], en_curso->[finalizado,cancelado], finalizado->[], cancelado->[])
- Discrepancy query uses LEFT JOIN existencias filtered by the event's depositoId with COALESCE(existencias.cantidad, 0) for null safety, calculates diferencia as cantidadContada - stockSistema
- Unique constraint violations (dispositivo identificador, inventario articulo duplicate) return 409 Conflict with descriptive Spanish messages

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 18 backend API endpoints ready for web UI consumption in plans 03-05
- Inventarios: list, detail, create, update, status transition, articulos CRUD with discrepancy
- Dispositivos: list, detail, create, update, toggle
- Sectores: list, create, update, delete (nested under depositos)

---

_Phase: 17-inventarios_
_Completed: 2026-03-06_
