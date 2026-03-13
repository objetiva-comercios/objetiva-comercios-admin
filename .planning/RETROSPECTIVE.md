# Project Retrospective

_A living document updated after each milestone. Lessons feed forward into future planning._

## Milestone: v1.2 — Articulos CRUD + Imagenes + API Keys + Webhooks

**Shipped:** 2026-03-13
**Phases:** 10 | **Plans:** 18
**Timeline:** 3 days (2026-03-11 → 2026-03-13)
**Commits:** 118 | **LOC:** +21,018 / -757

### What Was Built

- Full artículos CRUD with ~30 fields, grouped form, real-time search, soft-delete via DELETE endpoint
- Image pipeline: DnD upload to labeled slots (3 etiqueta + 6 producto), sharp WebP processing (thumb + detail), lightbox viewer
- Configurable column visibility (DB-driven, immediate-persist) + sortable column headers with tri-state
- API Keys system: CompositeAuthGuard (JWT fallback to SHA-256 Bearer), CRUD UI in Settings, last-used tracking
- Webhooks: centralized CRUD, @nestjs/event-emitter dispatch, HMAC-SHA256 signatures, retry with backoff, delivery log, test ping, resend
- Gap closure phases (25-28): soft-delete wiring, idempotency guards, type-safe events, objeto field end-to-end

### What Worked

- **Audit-driven gap closure** — milestone audit identified 7 gaps + 4 tech debt items, all resolved via targeted phases (25-28) before shipping
- **Event-driven webhook architecture** — @nestjs/event-emitter + listener pattern cleanly separated concerns, adding new entity events requires only new @OnEvent handlers
- **CompositeAuthGuard design** — clean JWT-first fallback chain, zero disruption to existing Supabase auth flows
- **Sharp in-memory pipeline** — buffer → WebP → filesystem without temp files, fast and clean
- **Immediate-persist UX for settings** — toggle → PATCH → revalidate pattern felt instant, no Save button needed
- **HMAC-SHA256 webhook signing** — industry-standard, easy for consumers to verify

### What Was Inefficient

- **4 gap closure phases** (25-28) — integration gaps (objeto missing from form/sheet, frontend soft-delete not wired) could have been caught during phase implementation if checklist included "verify new field appears in ALL consumers"
- **SUMMARY frontmatter incomplete** — HOOK-03/HOOK-06 missing from requirements_completed, automated extraction failed. SUMMARY writing needs stricter field validation.
- **Phase 19 not independently verified** — required Phase 25 to create VERIFICATION.md retroactively. Verification should happen during phase execution.

### Patterns Established

- CompositeAuthGuard pattern: APP_GUARD with JWT → API key fallback chain
- Webhook dispatch pattern: EventEmitter2 + @OnEvent listener → in-memory filter → deliverWithRetry with HMAC
- Image slot pattern: labeled slots (tipo + slot number) with separate etiqueta/producto grids
- Idempotency guard pattern: NotFoundException if missing, ConflictException (409) if already acted upon
- Type-safe event constants: WEBHOOK_EVENTS object + WebhookEvent union type + EVENT_TO_DB map
- Column visibility pattern: DB JSONB → useMemo derivation → TanStack VisibilityState
- Two-step create dialog: block onOpenChange during reveal step to prevent accidental loss

### Key Lessons

1. **Verify new fields in ALL consumers at creation time** — objeto was added to schema/columns in Phase 22 but missing from form (Phase 27) and sheet (Phase 28). Checklist item needed: "Does this field appear in form, sheet, columns, settings, and search?"
2. **Wire frontend actions to backend endpoints during the same phase** — soft-delete endpoint existed in Phase 24 but frontend didn't call it until Phase 25. E2E verification should be a phase exit criterion.
3. **Automated SUMMARY extraction requires strict frontmatter** — one_liner and requirements_completed fields must be validated. Consider a gsd-tools lint command.
4. **Phase verification should not be deferred** — Phase 19 had no VERIFICATION.md until Phase 25 forced it. Inline verification prevents deferred discovery.

### Cost Observations

- Model mix: ~85% opus, ~15% sonnet
- Sessions: ~8 execution sessions across 3 days
- Notable: Gap closure phases (25-28) averaged ~10 min per plan — surgical fixes are fast when audit clearly identifies the gap

---

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

| Milestone | Phases | Plans | Bugfix/Gap Phases | Key Change                                         |
| --------- | ------ | ----- | ----------------- | -------------------------------------------------- |
| v1.0      | 13     | 42    | 7 (54%)           | Established audit-before-archive pattern           |
| v1.1      | 5      | 18    | 1 (20%)           | Pattern reuse + better verification reduced rework |
| v1.2      | 10     | 18    | 4 (40%)           | Audit-driven gap closure + type-safe patterns      |

### Top Lessons (Verified Across Milestones)

1. **Integration testing at phase boundaries prevents gap phases** — v1.0: 54% bugfix, v1.1: 20%, v1.2: 40% (gap closure). New fields and endpoints need E2E verification at creation time.
2. **Type alignment between backend and frontend must be verified explicitly** — type drift (v1.0), field name mismatch (v1.1), missing field in consumers (v1.2). Recurring theme.
3. **Reusing established UI patterns dramatically accelerates later phases** — v1.1 in 3 days, v1.2 in 3 days (double the features) by reusing v1.0+v1.1 patterns
4. **Audit-before-archive is non-negotiable** — catches real gaps every milestone. v1.2 audit found 7 integration gaps + 4 tech debt items that became phases 25-28.
5. **SUMMARY frontmatter must be validated** — incomplete metadata breaks automated extraction. Need lint/validation tooling.
6. **Phase verification should not be deferred** — retroactive verification (v1.0 Phase 8, v1.2 Phase 25) is more expensive than inline verification.
