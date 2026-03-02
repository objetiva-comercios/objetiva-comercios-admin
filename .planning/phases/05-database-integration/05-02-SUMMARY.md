---
phase: 05-database-integration
plan: 02
subsystem: database
tags: [drizzle-orm, postgres, nestjs, crud, pagination, transactions, sql-aggregation]

# Dependency graph
requires:
  - phase: 05-01
    provides: DrizzleService injectable via @Global DbModule, 8-table schema with $inferSelect/$inferInsert types
  - phase: 02-backend-api-with-mock-data
    provides: Feature modules (products, orders, inventory, sales, purchases) with in-memory data from seedAll()
provides:
  - All 5 domain services migrated to Drizzle with async PostgreSQL queries
  - Two-query pagination pattern (count + data) preserving PaginatedResponseDto shape
  - findOne with nested items array for orders, sales, purchases
  - SQL aggregation (groupBy, count, sum, coalesce) for all getStats() methods
  - CRUD endpoints (POST/PATCH/DELETE) for all 5 entities
  - Dashboard service updated to use async parallel service calls via Promise.all
affects:
  - 05-03 (dashboard service KPI updates — depends on all services being DB-backed)
  - frontend (web/mobile apps will now get real PostgreSQL data once DATABASE_URL is set and DB is seeded)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-query pagination pattern: count().where(conditions) + select().where(conditions).limit().offset()
    - Column map pattern: Record<string, Column> for dynamic sort field resolution
    - Two-query findOne pattern for parent+items (orders, sales, purchases): separate queries joined in JS
    - Transaction pattern for create: db.transaction(async tx => { insert parent; insert children }) with returning()
    - SQL aggregation pattern: count() + sql<number>`cast(coalesce(sum(...), 0) as double precision)` for stats
    - Time-window pattern for today/week stats: new Date() with setHours(0,0,0,0) and gte() filter
    - Dashboard parallel fetch: Promise.all([service1.method(), service2.method(), ...]) for efficiency

key-files:
  modified:
    - apps/backend/src/modules/products/products.service.ts
    - apps/backend/src/modules/products/products.controller.ts
    - apps/backend/src/modules/orders/orders.service.ts
    - apps/backend/src/modules/orders/orders.controller.ts
    - apps/backend/src/modules/inventory/inventory.service.ts
    - apps/backend/src/modules/inventory/inventory.controller.ts
    - apps/backend/src/modules/sales/sales.service.ts
    - apps/backend/src/modules/sales/sales.controller.ts
    - apps/backend/src/modules/purchases/purchases.service.ts
    - apps/backend/src/modules/purchases/purchases.controller.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts

key-decisions:
  - 'Column map pattern (Record<string, Column>) for dynamic sort: maps query.sort field name string to actual Drizzle column reference, avoids TypeScript union type complexity'
  - 'Two separate queries for parent+items in findOne (not JOIN + reshape): simpler code, avoids row-multiplication for multi-item entities, same latency at low scale'
  - 'Transaction for create with items: ensures atomicity — if child insert fails, parent is rolled back'
  - 'coalesce in SQL aggregations: prevents null return when table is empty, ensures JS number type'
  - 'Dashboard getKpis() converted to async with Promise.all: parallel fetching is faster than sequential awaits'

patterns-established:
  - 'Two-query pagination: count query first with same WHERE conditions, then data query with LIMIT/OFFSET'
  - 'Dynamic sort column resolution: parse query.sort prefix (-=desc, else asc), lookup column in colMap Record<string, Column>'
  - 'findOne with nested items: query parent row, if found query child rows, return spread merge'
  - 'Stats via SQL groupBy: SELECT status, count() GROUP BY status, map rows to named object keys'
  - 'Stats revenue via SQL sum: cast(coalesce(sum(total), 0) as double precision) avoids null and string types'

requirements-completed: []

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 05 Plan 02: Service Migration to Drizzle Summary

**All 5 domain services rewritten to query PostgreSQL via DrizzleService with two-query pagination, nested items arrays for transactional entities, SQL aggregation stats, and POST/PATCH/DELETE CRUD endpoints on all controllers**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T03:33:10Z
- **Completed:** 2026-03-02T03:38:51Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments

- Migrated all 5 domain services (products, orders, inventory, sales, purchases) from in-memory seedAll() arrays to DrizzleService with async PostgreSQL queries and two-query pagination
- Added CRUD routes (POST/PATCH/DELETE) to all 5 controllers; orders/sales/purchases findOne returns nested items array via two-query pattern; getStats() methods use SQL aggregation (groupBy, count, sum with coalesce)
- Updated dashboard service to async with Promise.all parallel fetching of all service stats — also fixed as Rule 1 bug since synchronous call patterns would return unresolved Promises after service migration

## Task Commits

Each task was committed atomically:

1. **Task 1: Migrate products, orders, inventory services and add CRUD controllers** - `c3b8acd` (feat)
2. **Task 2: Migrate sales and purchases services and add CRUD controllers** - `3b07ad9` (feat)

## Files Created/Modified

- `apps/backend/src/modules/products/products.service.ts` - Rewritten with DrizzleService injection, async findAll (two-query pagination with ilike search, category/status/price filters), findOne, getCategories (selectDistinct), getStats (groupBy), create/update/remove
- `apps/backend/src/modules/products/products.controller.ts` - Added POST, PATCH, DELETE routes; kept categories/stats before :id
- `apps/backend/src/modules/orders/orders.service.ts` - Rewritten with DrizzleService; findOne fetches order then orderItems separately and returns `{...order, items}`; create uses db.transaction(); getStats uses groupBy
- `apps/backend/src/modules/orders/orders.controller.ts` - Added POST, PATCH, DELETE routes
- `apps/backend/src/modules/inventory/inventory.service.ts` - Rewritten with DrizzleService; PATCH-only (no POST/DELETE); getStats returns lowStockItems via separate query
- `apps/backend/src/modules/inventory/inventory.controller.ts` - Added PATCH route only
- `apps/backend/src/modules/sales/sales.service.ts` - Rewritten with DrizzleService; getStats uses SQL count/sum with today and week time windows; create uses transaction
- `apps/backend/src/modules/sales/sales.controller.ts` - Added POST, PATCH, DELETE routes
- `apps/backend/src/modules/purchases/purchases.service.ts` - Rewritten with DrizzleService; getStats uses SQL aggregations for totalSpent and pendingValue with coalesce
- `apps/backend/src/modules/purchases/purchases.controller.ts` - Added POST, PATCH, DELETE routes
- `apps/backend/src/modules/dashboard/dashboard.service.ts` - Converted getKpis() to async, uses Promise.all for parallel service calls

## Decisions Made

- Used `Column` type from drizzle-orm for the sort column map (`Record<string, Column>`) — avoids complex union type inference when building dynamic orderBy from query.sort string
- Two separate queries for findOne with items (not a SQL JOIN) — simpler to implement, avoids row-multiplication on multi-item entities, adequate performance at this scale
- `coalesce(sum(...), 0)` wrapped in `cast(... as double precision)` for all monetary SQL aggregations — prevents null return on empty tables and ensures JavaScript number type (not string) per RESEARCH.md Pitfall 1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated dashboard service to async after service migration**

- **Found during:** Task 1 (TypeScript compilation check after products/orders/inventory migration)
- **Issue:** `dashboard.service.ts` called service methods synchronously (`getStats()`, `findAll()`), but all service methods are now async. This caused TypeScript errors: `Property 'data' does not exist on type 'Promise<...>'` and similar.
- **Fix:** Converted `getKpis()` to `async`, wrapped all service calls in `Promise.all()` for parallel execution, added await
- **Files modified:** `apps/backend/src/modules/dashboard/dashboard.service.ts`
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** c3b8acd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug)
**Impact on plan:** Necessary correctness fix — dashboard would have returned unresolved Promises after service migration. No scope creep.

## Issues Encountered

- TypeScript column type specificity: initial attempt to use `typeof products.createdAt` as the colMap value type failed due to column name brand types (e.g., `updated_at` not assignable to `created_at`). Fixed by using the more general `Column` import from drizzle-orm.

## User Setup Required

None — no external service configuration required for this plan. DATABASE_URL and db:migrate/db:seed remain the prerequisite from Plan 01 before any DB queries will return data.

## Next Phase Readiness

- All 5 domain services use DrizzleService — ready for Plan 03 (dashboard KPI aggregations and any remaining module updates)
- Backend compiles clean: `npx tsc --noEmit` passes with zero errors
- CRUD API available for all entities: products, orders, inventory, sales, purchases
- DB must be migrated + seeded before API returns real data (prerequisite from Plan 01)

## Self-Check: PASSED

All 11 files verified modified and committed. Both task commits (c3b8acd, 3b07ad9) verified in git log.

---

_Phase: 05-database-integration_
_Completed: 2026-03-02_
