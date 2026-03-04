# Project Retrospective

_A living document updated after each milestone. Lessons feed forward into future planning._

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

| Milestone | Phases | Plans | Key Change                                                               |
| --------- | ------ | ----- | ------------------------------------------------------------------------ |
| v1.0      | 13     | 42    | Established audit-before-archive pattern; 54% of phases were gap closure |

### Top Lessons (Verified Across Milestones)

1. Mock-first backend validates contracts early and enables seamless DB migration
2. Milestone audit cycle catches real integration issues that per-phase verification misses
3. Shared utilities (formatters, types) should be established in phase 1, not consolidated later
