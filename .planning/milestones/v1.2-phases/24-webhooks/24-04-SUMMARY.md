---
phase: 24-webhooks
plan: 04
subsystem: api
tags: [nestjs, webhooks, event-emitter, articulos, soft-delete]

# Dependency graph
requires:
  - phase: 24-webhooks-01
    provides: WebhooksListener with handleArticuloDeleted handler
  - phase: 24-webhooks-02
    provides: WebhooksService.dispatchEvent delivering to subscribers
provides:
  - DELETE /articulos/:codigo endpoint (admin-only, soft-delete)
  - ArticulosService.softDelete method emitting articulo.deleted
  - Full event chain: HTTP DELETE -> softDelete -> articulo.deleted -> WebhooksListener -> dispatchEvent
affects:
  - webhooks delivery pipeline (articulo.deleted now has live emission path)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'softDelete vs toggleActive: same DB update (activo=false), different events (deleted vs updated)'
    - 'DELETE endpoint returns 200 with soft-deleted entity (not 204), consistent with other mutation endpoints'

key-files:
  created: []
  modified:
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/backend/src/modules/articulos/articulos.controller.ts

key-decisions:
  - 'softDelete always sets activo=false and emits articulo.deleted — definitive removal action (vs toggleActive which is pause/resume)'
  - 'DELETE endpoint returns HTTP 200 with entity body (consistent with toggleActive pattern)'

patterns-established:
  - 'Mutation endpoints return entity body with HTTP 200, not 204'

requirements-completed:
  - HOOK-07

# Metrics
duration: 1min
completed: 2026-03-12
---

# Phase 24 Plan 04: Articulos Soft-Delete with articulo.deleted Event Summary

**DELETE /articulos/:codigo endpoint with softDelete service method that emits articulo.deleted, closing HOOK-07 and making WebhooksListener.handleArticuloDeleted live**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-12T19:24:21Z
- **Completed:** 2026-03-12T19:25:24Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added `ArticulosService.softDelete(codigo)` that sets `activo=false` and emits `articulo.deleted` via EventEmitter2
- Added `@Delete(':codigo')` endpoint to `ArticulosController` (admin-only, returns 200 with entity)
- Closed HOOK-07 gap: all 3 articulo events (create/update/delete) now have working emission paths
- `WebhooksListener.handleArticuloDeleted` is no longer dead code — fully reachable from HTTP DELETE

## Task Commits

Each task was committed atomically:

1. **Task 1: Add softDelete method to ArticulosService** - `0ee661c` (feat)
2. **Task 2: Add DELETE endpoint to ArticulosController** - `9d18001` (feat)

## Files Created/Modified

- `apps/backend/src/modules/articulos/articulos.service.ts` - Added softDelete method after toggleActive
- `apps/backend/src/modules/articulos/articulos.controller.ts` - Added Delete/HttpCode/HttpStatus imports and DELETE endpoint

## Decisions Made

- softDelete always sets `activo=false` and emits `articulo.deleted` (definitive removal action), distinct from `toggleActive` which emits `articulo.updated` (pause/resume action)
- DELETE endpoint returns HTTP 200 with the soft-deleted entity body, consistent with the `toggleActive` pattern in this controller

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- HOOK-07 gap is closed: articulo.deleted event path is fully wired
- Full event chain confirmed: DELETE /articulos/:codigo -> ArticulosController.softDelete -> ArticulosService.softDelete -> eventEmitter.emit('articulo.deleted') -> WebhooksListener.handleArticuloDeleted -> WebhooksService.dispatchEvent -> deliverWithRetry
- All 3 articulo events (create/update/delete) have working webhook emission paths

---

_Phase: 24-webhooks_
_Completed: 2026-03-12_
