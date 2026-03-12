---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Articulos CRUD + Imagenes + API Keys + Webhooks
status: planning
stopped_at: Completed 21-01-PLAN.md
last_updated: '2026-03-12T02:05:35.922Z'
last_activity: 2026-03-11 — Phase 19 completed (3 plans)
progress:
  total_phases: 6
  completed_phases: 2
  total_plans: 6
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-10)

**Core value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one
**Current focus:** Phase 20 — Image Upload Backend

## Current Position

Phase: 20 — second of 6 in v1.2 (Image Upload Backend)
Plan: 0 of ? in current phase
Status: Ready to plan
Last activity: 2026-03-11 — Phase 19 completed (3 plans)

Progress (v1.2): [█░░░░░░░░░] 17%

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

### Pending Todos

None.

### Blockers/Concerns

- `@nestjs/schedule` compatibility with NestJS 10 — verify at install (Phase 24)
- Multer memory vs disk storage — decide during Phase 20 planning
- PK `codigo` (text) may contain special chars — validate in image upload paths

## Session Continuity

Last session: 2026-03-12T02:05:35.918Z
Stopped at: Completed 21-01-PLAN.md
Next action: `/gsd:plan-phase 20`

---

_State initialized: 2026-01-23_
_Last updated: 2026-03-11 (Phase 19 complete)_
