---
phase: 24-webhooks
plan: 01
subsystem: backend
tags: [webhooks, event-emitter, hmac, drizzle, nestjs, postgresql]
dependency_graph:
  requires: [23-api-keys]
  provides: [webhook-backend-api, articulo-events]
  affects: [apps/backend/src/modules/articulos/articulos.service.ts, apps/backend/src/app.module.ts]
tech_stack:
  added: ['@nestjs/event-emitter@3.0.1']
  patterns: [EventEmitter2, @OnEvent, HMAC-SHA256, fire-and-forget-retries, drizzle-pg-text-array]
key_files:
  created:
    - apps/backend/src/modules/webhooks/webhooks.module.ts
    - apps/backend/src/modules/webhooks/webhooks.service.ts
    - apps/backend/src/modules/webhooks/webhooks.controller.ts
    - apps/backend/src/modules/webhooks/webhooks.listener.ts
    - apps/backend/src/modules/webhooks/dto/create-webhook.dto.ts
    - apps/backend/src/modules/webhooks/dto/update-webhook.dto.ts
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/app.module.ts
    - apps/backend/src/modules/articulos/articulos.service.ts
decisions:
  - "@nestjs/event-emitter with explicit @OnEvent handlers (not wildcard) to avoid silent miss risk"
  - "In-memory filter for webhook event matching — avoids Drizzle array containment driver quirks at this scale"
  - "ArticulosService injects EventEmitter2 directly (no WebhooksModule import) — avoids circular dependency"
  - "DB tables created via psql DDL (drizzle-kit push requires interactive input)"
metrics:
  duration: 7 minutes
  completed_date: '2026-03-12'
  tasks_completed: 2
  files_changed: 9
---

# Phase 24 Plan 01: Webhook Backend Infrastructure Summary

**One-liner:** NestJS webhook system with EventEmitter2, HMAC-SHA256 signed delivery, 3-attempt setTimeout retries, and 10 REST endpoints backed by Drizzle PostgreSQL tables.

## What Was Built

Complete backend webhook infrastructure for the articulos entity:

1. **Database schema** — `webhooks` and `webhook_deliveries` tables with proper indexes, foreign keys (cascade delete), and soft-delete via `revokedAt`
2. **WebhooksModule** — service, controller, listener, and DTOs wired together
3. **10 REST endpoints** at `/api/webhooks/*` (admin-only):
   - CRUD: GET, POST, PATCH, DELETE
   - Toggle: PATCH /:id/toggle
   - Secret: POST /:id/regenerate-secret
   - Testing: POST /:id/ping
   - Deliveries: GET /:id/deliveries, POST /:id/deliveries/:deliveryId/resend
4. **Delivery engine** — fire-and-forget with 3 attempts, delays 10s → 60s, AbortController 10s timeout
5. **HMAC-SHA256 signing** — `X-Webhook-Signature: sha256=<hex>` on every delivery (same as GitHub/Stripe)
6. **EventEmitter wiring** — ArticulosService emits `articulo.created` and `articulo.updated` events non-blocking via `emit()` (not `emitAsync()`)

## Commits

| Hash    | Description                                       |
| ------- | ------------------------------------------------- |
| d55d80b | feat(24-01): schema + WebhooksModule (10 files)   |
| 832ca65 | feat(24-01): ArticulosService EventEmitter wiring |

## Verification Results

- `pnpm build` passes with zero TypeScript errors
- Backend starts and logs all 10 `/api/webhooks/*` routes
- `webhooks` and `webhook_deliveries` tables confirmed in PostgreSQL
- EventEmitterModule, WebhooksModule initialized in Nest application log

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Noted Differences

**DB push via psql instead of drizzle-kit push**

- Found during: Task 2
- Issue: `drizzle-kit push` requires interactive confirmation prompt (same as Phase 23)
- Fix: Created tables directly via `psql` with full DDL — identical outcome
- This is the established pattern from Phase 23 (not a deviation, expected)

## Self-Check: PASSED

All created files confirmed present. Both commits (d55d80b, 832ca65) verified in git history. DB tables confirmed in PostgreSQL. Build passes with zero errors.
