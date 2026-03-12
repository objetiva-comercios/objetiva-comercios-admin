---
phase: 26-tech-debt-cleanup-v12
plan: 01
subsystem: api
tags: [nestjs, webhooks, api-keys, typescript, type-safety, idempotency]

requires:
  - phase: 24-webhooks
    provides: WebhooksService.dispatchEvent, WebhooksListener, articulos event emission
  - phase: 23-api-keys
    provides: ApiKeysService.revoke, api-keys module

provides:
  - webhook-events.ts with WEBHOOK_EVENTS const, WebhookEvent type, EVENT_TO_DB map
  - Type-safe dispatchEvent(eventName: WebhookEvent) signature
  - Idempotency guards on ApiKeysService.revoke() and WebhooksService.revoke()
  - ConflictException (409) on double-revoke attempts
  - Private WebhooksService.findOneAny() for revoke without isNull filter

affects:
  - Any future phase adding new webhook event types (must update webhook-events.ts)

tech-stack:
  added: []
  patterns:
    - 'Centralized event name constants via as const object to prevent string drift'
    - 'Derived type from const object: type WebhookEvent = typeof WEBHOOK_EVENTS[keyof typeof WEBHOOK_EVENTS]'
    - 'Idempotency guard pattern: query-without-filter -> NotFoundException if missing -> ConflictException if already revoked'
    - 'Private findOneAny() alongside public findOne() to serve different caller semantics'

key-files:
  created:
    - apps/backend/src/modules/webhooks/webhook-events.ts
  modified:
    - apps/backend/src/modules/webhooks/webhooks.service.ts
    - apps/backend/src/modules/webhooks/webhooks.listener.ts
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/backend/src/modules/api-keys/api-keys.service.ts

key-decisions:
  - "EVENT_TO_DB map used instead of split('.')[1] — explicit, compile-time verified mapping"
  - "findOneAny() private method added to WebhooksService to serve revoke's need to find already-revoked webhooks without polluting public API"
  - 'findOne() public signature unchanged — all callers except revoke still get 404 for revoked webhooks'

patterns-established:
  - 'Idempotency guard: fetch-without-isNull + NotFoundException + ConflictException — used in both api-keys and webhooks revoke'

requirements-completed: []

duration: 8min
completed: 2026-03-12
---

# Phase 26 Plan 01: Tech Debt Cleanup v1.2 Summary

**Type-safe webhook event constants via webhook-events.ts, idempotency guards with ConflictException (409) on double-revoke for API keys and webhooks**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-12T22:47:46Z
- **Completed:** 2026-03-12T22:55:00Z
- **Tasks:** 2
- **Files modified:** 5 (1 created + 4 modified)

## Accomplishments

- Created `webhook-events.ts` as leaf module — WEBHOOK_EVENTS const, WebhookEvent union type, EVENT_TO_DB record mapping full event name to DB short-form
- Eliminated all string literal event names from `articulos.service.ts` (4 emit calls), `webhooks.listener.ts` (3 decorators + 3 dispatch calls), and `webhooks.service.dispatchEvent` signature
- Added idempotency guards to `api-keys.service.revoke()` and `webhooks.service.revoke()` — NotFoundException if missing, ConflictException if already revoked

## Task Commits

Each task was committed atomically:

1. **Task 1: Type-safe webhook events** - `6758b32` (feat)
2. **Task 2: Idempotency guards for revoke** - `96b00a8` (feat)

## Files Created/Modified

- `apps/backend/src/modules/webhooks/webhook-events.ts` - New: WEBHOOK_EVENTS const, WebhookEvent type, EVENT_TO_DB map
- `apps/backend/src/modules/webhooks/webhooks.service.ts` - dispatchEvent typed with WebhookEvent, ConflictException added, private findOneAny(), revoke() with idempotency guard
- `apps/backend/src/modules/webhooks/webhooks.listener.ts` - @OnEvent decorators and dispatchEvent calls use WEBHOOK_EVENTS constants
- `apps/backend/src/modules/articulos/articulos.service.ts` - All eventEmitter.emit() calls use WEBHOOK_EVENTS constants
- `apps/backend/src/modules/api-keys/api-keys.service.ts` - revoke() with NotFoundException + ConflictException idempotency guard

## Decisions Made

- `EVENT_TO_DB` record used instead of `split('.')[1]` — explicit compile-time verified mapping, no fragile string parsing
- `findOneAny()` added as private method alongside public `findOne()` to serve revoke's need to find already-revoked webhooks without breaking the 404 semantics for all other callers (update, toggle, ping, findDeliveries, resendDelivery, regenerateSecret)
- `findOne()` public signature left completely unchanged — preserves existing behavior for all 6 callers

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Type-safe webhook event system ready — any future event types just need a new entry in `webhook-events.ts`
- HTTP semantics now correct: 409 Conflict on double-revoke instead of silent overwrite or 404

---

_Phase: 26-tech-debt-cleanup-v12_
_Completed: 2026-03-12_
