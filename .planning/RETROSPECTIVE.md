# Project Retrospective

_A living document updated after each milestone. Lessons feed forward into future planning._

## Milestone: v1.1 — Modelo Articulos + Inventario

**Shipped:** 2026-03-10
**Phases:** 5 | **Plans:** 18
**Timeline:** 3 days (2026-03-04 → 2026-03-06)
**Commits:** 95 | **LOC:** +25,066 / -5,732

### What Was Built

- Complete data model migration: products → articulos with text PK (codigo), multi-deposito stock, physical inventory counts
- 4 new domain modules: Articulos, Depositos, Existencias, Inventarios with full CRUD
- Dual-view stock management (por deposito / por articulo) with inline editing and low-stock alerts
- Physical inventory system with sectors, dispositivos móviles, status workflow, discrepancy analysis
- Downstream FK migration across orders/sales/purchases + dashboard KPI rewiring
- All v1.0 tech debt resolved (RBAC, type drift, mobile labels, unused exports)

### What Worked

- **Clean-cut migration strategy** (db:push + re-seed) — no migration complexity in dev, fast iteration
- **Phase-by-phase incremental approach** — each phase built on verified prior work, minimal rework
- **Text PK decision** — natural alignment with ERP data model eliminated impedance mismatch
- **Pattern reuse across modules** (InlineEditCell, ServerDataTable, dialog CRUD) — dramatically accelerated later phases
- **GSD framework** — consistent execution rhythm across 18 plans with clear boundaries
- **Only 1 bugfix phase** (vs 5 in v1.0) — audit-before-archive pattern from v1.0 paid off

### What Was Inefficient

- **Phase 18 bugfix** — field name mismatch between frontend/backend could have been caught with explicit field assertions in Phase 17 verification
- **SUMMARY.md frontmatter gaps** — missing `one_liner` fields made automated accomplishment extraction impossible
- **Orphan endpoint** (POST /api/existencias upsert) — built but never wired to UI, should have been deferred if no consumer was planned

### Patterns Established

- Text PK pattern for business entities (articulos.codigo) — use when IDs come from external systems
- Composite PK pattern for junction tables (existencias: articulo_codigo + deposito_id)
- Dual-view pattern for cross-dimensional data (stock by deposito vs stock by articulo)
- Status workflow pattern with transition map + validateTransition() guard
- Nested settings pattern: depositos → sectores, settings → dispositivos
- InlineEditCell: Enter saves, blur cancels — prevents accidental writes
- KPI cards double as filters — clicking toggles query params

### Key Lessons

1. **Field name assertions at integration boundaries** — integration bugs between frontend field names and backend response shapes recur; add explicit checks in phase verification
2. **Test aggregation queries in both list and detail views** — the list view was missing article count aggregation while detail had it
3. **Don't build endpoints without UI consumers** — if no frontend consumer is planned, defer the endpoint to avoid orphan code

### Cost Observations

- Model mix: ~90% opus, ~10% sonnet
- Sessions: ~6 execution sessions across 3 days
- Notable: 18 plans in 3 days — high throughput enabled by consistent patterns and clean phase boundaries

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-04
**Phases:** 13 | **Plans:** 42
**Timeline:** 41 days (2026-01-22 → 2026-03-04)
**Commits:** 199 | **LOC:** 12,650 TypeScript

### What Was Built

- Full monorepo with pnpm workspaces + Turborepo and 3 shared packages
- NestJS backend with 15+ REST endpoints, PostgreSQL/Drizzle ORM, RBAC
- Next.js web admin with 7 operational sections, shadcn/ui, dark theme
- Capacitor mobile app (iOS/Android) with bottom tabs + drawer navigation
- Supabase authentication shared across all platforms
- 500+ seed products with realistic relational data across 8 tables

### What Worked

- **Mock-first backend strategy** — building API with faker data before DB validated the frontend-backend contract early; frontends required zero changes when PostgreSQL replaced mocks
- **Platform-specific UI with shared design tokens** — avoided cross-platform abstraction headaches while maintaining visual cohesion
- **Deny-by-default auth middleware** — prevented security gaps as new routes were added
- **Milestone audit cycle** — catching integration gaps (phases 7-13) before marking complete ensured actual quality, not just checkbox completion
- **Shared @objetiva/utils** — formatCurrency/formatDate consolidation eliminated 10+ duplicate implementations

### What Was Inefficient

- **Phases 7-13 were all gap closure/tech debt** — 7 of 13 phases were fixing issues found by audit, suggesting earlier integration testing would reduce rework
- **Web type drift accumulated silently** — TypeScript types were defined independently from DB schema, leading to mismatches discovered late
- **Verification docs created retroactively** (Phase 8) — if VERIFICATION.md was written during phases 3-4, gaps would have been caught earlier
- **Phase 13 plan checkbox in ROADMAP.md was cosmetic** — marking `[ ]` despite completion shows doc sync is fragile

### Patterns Established

- Global JWT guard with @Public() opt-out for deny-by-default auth
- DataTable<TData, TValue> generic component pattern for reusable tables
- Server Component data fetch → Client Component interactivity split (Next.js)
- useInfiniteList hook + FilterChips + BottomSheet for mobile list pages
- Two-query pattern for parent+items (not JOIN) in Drizzle
- inArray batch-loading for nested items in findAll endpoints
- @Global() DbModule with DRIZZLE_CLIENT injection token
- react-error-boundary wrapping individual Route elements (not AppShell)

### Key Lessons

1. **Define types from schema, not independently** — web/mobile types should be generated or derived from Drizzle schema to prevent drift
2. **Run integration checks earlier** — milestone audit found 3 integration gaps and 1 broken flow that could have been caught at phase 6
3. **Mock-to-real migration works** — the mock-first approach validated contracts so well that the DB swap was seamless
4. **RBAC must be applied at module creation time** — the settings module added post-Phase 6 missed @Roles guards because RBAC was added as a separate phase
5. **Locale decisions should be global from day one** — mobile started with en-US defaults, requiring consolidation later (Phase 10)

### Cost Observations

- Model mix: balanced profile (opus for planning, sonnet/haiku for execution)
- Notable: Gap closure phases (7-13) were faster per plan than feature phases — surgical fixes average 5-10 min vs 25-30 min for feature plans

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Bugfix Phases | Key Change                                         |
| --------- | ------ | ----- | ------------- | -------------------------------------------------- |
| v1.0      | 13     | 42    | 7 (54%)       | Established audit-before-archive pattern           |
| v1.1      | 5      | 18    | 1 (20%)       | Pattern reuse + better verification reduced rework |

### Top Lessons (Verified Across Milestones)

1. **Integration testing at phase boundaries prevents bugfix phases** — v1.0 had 54% bugfix phases, v1.1 dropped to 20%
2. **Type alignment between backend and frontend must be verified explicitly** — type drift in v1.0, field name mismatch in v1.1
3. **Reusing established UI patterns dramatically accelerates later phases** — v1.1 completed 18 plans in 3 days by reusing v1.0 patterns
4. **Mock-first backend validates contracts early** — proven in v1.0, reinforced in v1.1
5. **Shared utilities should be established early** — consolidation is more expensive than upfront design
