---
gsd_state_version: 1.0
milestone: v1.1
milestone_name: Modelo Articulos + Inventario
status: executing
stopped_at: Phase 16 context gathered
last_updated: '2026-03-05T19:34:46.201Z'
last_activity: 2026-03-05 — Completed 15-02 existencias UI
progress:
  total_phases: 4
  completed_phases: 2
  total_plans: 8
  completed_plans: 8
  percent: 88
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-05)

**Core value:** A solid, reusable foundation that can be extended confidently — cohesive UI, real auth flow, working navigation, and backend integration from day one
**Current focus:** Phase 15 — Existencias (Stock por Deposito)

## Current Position

Phase: 15 of 17 (Existencias)
Plan: 2 of 3 (existencias UI complete)
Status: Phase 15 in progress
Last activity: 2026-03-05 — Completed 15-02 existencias UI

Progress: [████████░░] 88%

## Performance Metrics

**Velocity:**

- Total plans completed: 42 (v1.0)
- Average duration: — (v1.1 not started)
- Total execution time: — (v1.1 not started)

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
| ----- | ----- | ----- | -------- |
| 14-01 | 1     | 5min  | 5min     |

_Updated after each plan completion_
| Phase 14 P02 | 3min | 2 tasks | 12 files |
| Phase 14 P03 | 4min | 2 tasks | 10 files |
| Phase 14 P04 | 2min | 2 tasks | 6 files |
| Phase 14 P05 | 3min | 2 tasks | 8 files |
| Phase 15 P01 | 5min | 2 tasks | 14 files |
| Phase 15 P02 | 3min | 2 tasks | 8 files |
| Phase 15 P03 | 3min | 2 tasks | 3 files |

## Accumulated Context

### Decisions

- PK for articulos is `codigo` (text), not numeric ID — matches real ERP model
- Existencias table separate from articulos for multi-deposito support
- Inventarios = periodic physical count events (distinct from stock/existencias)
- Clean-cut migration (db:push + re-seed) — no production data to preserve
- Keep doublePrecision for monetary fields in v1.1 (numeric migration deferred)
- Tech debt items addressed in the phase where related code is modified
- Text PK (codigo) for articulos: sequential "ART-001" format in seed, no auto-increment
- Removed User/ApiResponse from @objetiva/types (DEBT-04 resolved)
- Settings RBAC secured on write endpoints (DEBT-01 resolved)
- [Phase 14]: Text PK param (:codigo) on articulos endpoints — no ParseIntPipe, NestJS auto-decodes URL params
- [Phase 14]: ServerDataTable uses TanStack Table manualPagination/manualFiltering/manualSorting for server-driven data
- [Phase 14]: Sidebar navigation updated from /articles to /articulos
- [Phase 14]: Shared ArticuloForm with mode='create'|'edit' for both pages
- [Phase 14]: Long form pattern: SectionHeader + Separator for visual grouping
- [Phase 14]: Inline dialog pattern for deposito CRUD (3 fields: nombre, direccion, descripcion)
- [Phase 14]: Settings sub-page pattern: nav item + /settings/[section]/page.tsx + dedicated component
- [Phase 15]: Composite PK pattern for existencias (articulo_codigo, deposito_id) with individual indexes
- [Phase 15]: Dual-view query pattern: flat list by deposito + matrix view by articulo
- [Phase 15]: KPI aggregation via SQL CASE+count in single query
- [Phase 15]: Client layout with usePathname for tab navigation (Listado | Existencias)
- [Phase 15]: InlineEditCell saves on Enter only, cancels on blur to prevent accidental saves
- [Phase 15]: KPI cards double as filters — clicking toggles stockStatus query param
- [Phase 15]: Optimistic update pattern for inline edits with background KPI refetch
- [Phase 15]: Custom HTML table with sticky CSS columns for matrix layout (not ServerDataTable)
- [Phase 15]: Independent pagination/search state per viewMode to avoid cross-contamination

### Pending Todos

None.

### Blockers/Concerns

None — research complete, roadmap defined.

## Session Continuity

Last session: 2026-03-05T19:34:46.198Z
Stopped at: Phase 16 context gathered
Resume file: .planning/phases/16-downstream-migration-dashboard-navigation/16-CONTEXT.md
Next action: Execute 15-03-PLAN.md (existencias matrix view)

---

_State initialized: 2026-01-23_
_Last updated: 2026-03-05 (14-01 schema foundation complete)_
