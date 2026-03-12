---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Articulos CRUD + Imagenes + API Keys + Webhooks
status: completed
stopped_at: Completed 24-webhooks-01-PLAN.md
last_updated: '2026-03-12T15:40:05.326Z'
last_activity: 2026-03-12 — Phase 21 completed (2 plans)
progress:
  total_phases: 6
  completed_phases: 5
  total_plans: 13
  completed_plans: 11
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one
**Current focus:** Phase 20 — Image Upload Backend

## Current Position

Phase: 21 — third of 6 in v1.2 (Image Upload Frontend — Detalle)
Plan: 2 of 2 in current phase
Status: Phase complete
Last activity: 2026-03-12 — Phase 21 completed (2 plans)

Progress (v1.2): [██████████] 100%

## Performance Metrics

**Velocity:**

- Total plans completed: 63 (v1.0: 42, v1.1: 18, v1.2: 3)
- Average duration: ~15 min (v1.1 average)
- Total execution time: ~16 hours

**By Milestone:**

| Milestone                                  | Phases | Plans   | Shipped     |
| ------------------------------------------ | ------ | ------- | ----------- |
| v1.0                                       | 13     | 42      | 2026-03-04  |
| v1.1                                       | 5      | 18      | 2026-03-10  |
| v1.2                                       | 6      | 3+      | In progress |
| Phase 20-image-upload-backend P01          | 3      | 2 tasks | 7 files     |
| Phase 21-image-upload-frontend-detalle P01 | 15     | 2 tasks | 5 files     |
| Phase 21-image-upload-frontend-detalle P02 | 4      | 2 tasks | 3 files     |
| Phase 22 P01                               | 25     | 2 tasks | 9 files     |
| Phase 22 P02                               | 4      | 2 tasks | 4 files     |
| Phase 23-api-keys P01                      | 8      | 2 tasks | 8 files     |
| Phase 23-api-keys P02                      | 5      | 2 tasks | 5 files     |
| Phase 24-webhooks P01                      | 7      | 2 tasks | 9 files     |

## Accumulated Context

### Decisions

- Webhooks system centralized (entity + event + URL), not per-entity config
- API Keys independent of Supabase Auth (Bearer tokens)
- Article images served from filesystem local (/uploads/articulos/)
- Article list columns configurable globally (not per-user)
- Detail view as lateral panel/sheet
- Images public (no auth) for v1.2 — simplifies mobile access
- Field visibility config stored as JSONB in business_settings (not separate table)
- Hiding fields only affects UI, never deletes data
- Module-level cache for useArticulosConfig (no SWR dependency)
- [Phase 20-image-upload-backend]: memoryStorage for Multer — process buffer in-memory with sharp before writing final WebP, avoids temp disk files
- [Phase 20-image-upload-backend]: Only detail URL stored in DB JSONB; thumb URL derived by string convention (\_detail.webp → \_thumb.webp) at read time
- [Phase 20-image-upload-backend]: MulterError added to @Catch decorator on global HttpExceptionFilter — single filter handles both HTTP and Multer errors
- [Phase 21-image-upload-frontend-detalle]: onPreview wired as noop in edit page - lightbox deferred to Plan 02
- [Phase 21-image-upload-frontend-detalle]: SLOT_LABELS map hardcoded for both tipos to avoid runtime string generation
- [Phase 21-image-upload-frontend-detalle]: Lightbox navigation scoped by type (etiqueta vs producto) — parent filters images array before passing
- [Phase 21-image-upload-frontend-detalle]: sr-only class used for visually-hidden DialogTitle instead of missing @radix-ui/react-visually-hidden package
- [Phase 22]: DB-driven TanStack VisibilityState via useMemo derivation from camposVisibles, optimistic updates in ArticulosClient with revert-on-error pattern
- [Phase 22]: Settings/Articulos: immediate-persist per toggle, no Save button — aligns with table dropdown UX
- [Phase 22-02]: Sortable columns limited to 4 visible columns (codigo, nombre, precio, costo); enableSortingRemoval:true for tri-state cycling; sortBy=null uses backend default sort
- [Phase 23-api-keys]: APP_GUARD pattern required for guards needing DI injection (not useGlobalGuards)
- [Phase 23-api-keys]: CompositeAuthGuard: JWT first, fallback to API key SHA-256 lookup; userId='apikey:{name}' for API key auth
- [Phase 23-api-keys]: Two-step create dialog: onOpenChange blocked during reveal step to prevent accidental key loss before copy
- [Phase 23-api-keys]: notFound() for viewer on /settings/api-keys (not redirect) — correct HTTP semantics for unauthorized resource
- [Phase 24-webhooks]: @nestjs/event-emitter with explicit @OnEvent handlers in WebhooksListener (no wildcard) — avoids silent miss risk
- [Phase 24-webhooks]: Webhook secrets stored plaintext in DB — required for HMAC computation on every delivery
- [Phase 24-webhooks]: In-memory filter for webhook event matching — avoids Drizzle text[] array containment driver quirks, correct for <= 50 webhooks

### Pending Todos

None.

### Blockers/Concerns

- `@nestjs/schedule` compatibility with NestJS 10 — verify at install (Phase 24)
- Multer memory vs disk storage — decide during Phase 20 planning
- PK `codigo` (text) may contain special chars — validate in image upload paths

## Session Continuity

Last session: 2026-03-12T15:40:05.323Z
Stopped at: Completed 24-webhooks-01-PLAN.md
Next action: `/gsd:plan-phase 20`

---

_State initialized: 2026-01-23_
_Last updated: 2026-03-11 (Phase 19 complete)_
