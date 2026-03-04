---
phase: 05-database-integration
plan: 01
subsystem: database
tags: [drizzle-orm, postgres, postgresql, supabase, nestjs, migrations, seed]

# Dependency graph
requires:
  - phase: 02-backend-api-with-mock-data
    provides: NestJS backend with feature modules (products, orders, inventory, sales, purchases, dashboard) and faker-based generators in data/generators/
provides:
  - Drizzle ORM schema with 8 pgTable definitions matching existing TypeScript interfaces
  - DrizzleService injectable via @Global DbModule (available to all NestJS feature modules)
  - drizzle.config.ts for drizzle-kit CLI operations
  - CLI seed script (pnpm db:seed) adapting all 5 existing faker generators
  - Initial migration SQL (drizzle/0000_open_anita_blake.sql) for fresh database setup
  - 5 db:* npm scripts (generate, migrate, push, seed, studio)
affects:
  - 05-02 (service migration — all 6 services will inject DrizzleService)

# Tech tracking
tech-stack:
  added:
    - drizzle-orm@0.45.1 (runtime ORM)
    - postgres@3.4.8 (postgres.js driver — Supabase recommended)
    - drizzle-kit@0.31.9 (devDep — migration CLI)
    - tsx@4.21.0 (devDep — TypeScript seed runner)
  patterns:
    - Global DrizzleModule with DRIZZLE_CLIENT token pattern (wanago.io canonical pattern)
    - doublePrecision() for monetary fields (avoids numeric() string-return pitfall)
    - serial() integer PKs to match existing API contract
    - FK cascade on child items (order_items, sale_items, purchase_items, inventory)
    - FK restrict on products from items (prevents orphaned references)
    - ID mapping pattern (generator ID -> DB serial ID) for seed FK resolution
    - dotenv/config first import in both drizzle.config.ts and seed.ts

key-files:
  created:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/index.ts
    - apps/backend/src/db.module.ts
    - apps/backend/drizzle.config.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/drizzle/0000_open_anita_blake.sql
    - apps/backend/drizzle/meta/_journal.json
    - apps/backend/drizzle/meta/0000_snapshot.json
  modified:
    - apps/backend/package.json (added drizzle deps + db:* scripts)
    - apps/backend/src/app.module.ts (added DbModule as first import)

key-decisions:
  - "doublePrecision() over numeric() for monetary fields: returns JS numbers directly, preserving API contract compatibility (frontends expect price: 10.99 not '10.99')"
  - 'serial() integer PKs over UUID: matches existing API contract (no frontend changes needed)'
  - 'Global @Global() DbModule pattern: DrizzleService available to all feature modules without explicit imports'
  - 'postgres.js driver over node-postgres: Supabase official recommendation, simpler connection pooling'
  - 'TRUNCATE with RESTART IDENTITY CASCADE for seed: clean-slate reseed each run, correct FK handling'
  - 'ID map (Map<generatorId, dbId>) for seed FK resolution: generator IDs are 1-500, DB serial IDs may differ after truncate/reseed'

patterns-established:
  - 'DrizzleModule pattern: @Global() + DRIZZLE_CLIENT token + DrizzleService injection'
  - 'Schema-first with $inferSelect/$inferInsert type exports for all tables'
  - 'Seed script: dotenv/config first, standalone client (not DrizzleService), sequential inserts with FK resolution via idMap'

requirements-completed: []

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 05 Plan 01: Drizzle ORM Infrastructure Summary

**Drizzle ORM with postgres.js driver wired into NestJS via @Global DbModule: 8-table schema, initial migration SQL, and CLI seed script adapting existing faker generators**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T03:25:00Z
- **Completed:** 2026-03-02T03:29:36Z
- **Tasks:** 3
- **Files modified:** 10

## Accomplishments

- Installed drizzle-orm, postgres, drizzle-kit, tsx and defined all 8 pgTable schemas matching existing TypeScript interfaces exactly (products, orders, order_items, inventory, sales, sale_items, purchases, purchase_items)
- Created @Global() DbModule with DrizzleService injectable — any feature module can inject DrizzleService without explicit imports
- Generated initial migration SQL (drizzle/0000_open_anita_blake.sql) and created CLI seed script that adapts all 5 existing faker generators with correct FK dependency ordering

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Drizzle dependencies and create schema** - `69f4b27` (feat)
2. **Task 2: Create DrizzleModule, drizzle.config.ts, and update AppModule** - `dad3b1a` (feat)
3. **Task 3: Create seed script and add database CLI commands** - `27cdf65` (feat)

## Files Created/Modified

- `apps/backend/src/db/schema.ts` - 8 pgTable definitions with FK constraints, indexes, and $inferSelect/$inferInsert type exports
- `apps/backend/src/db/index.ts` - DrizzleService class with DRIZZLE_CLIENT injection token
- `apps/backend/src/db.module.ts` - @Global() NestJS module providing DrizzleService via postgres factory
- `apps/backend/drizzle.config.ts` - drizzle-kit config (dotenv first, schema path, postgresql dialect)
- `apps/backend/src/db/seed.ts` - CLI seed script: TRUNCATE + insert 500 products, inventory, 200 orders, 150 sales, 50 purchases with FK resolution via idMap
- `apps/backend/drizzle/0000_open_anita_blake.sql` - Initial migration SQL for all 8 tables
- `apps/backend/package.json` - Added drizzle-orm, postgres, drizzle-kit, tsx + 5 db:\* scripts
- `apps/backend/src/app.module.ts` - Added DbModule as first import in AppModule.imports

## Decisions Made

- Used `doublePrecision()` instead of `numeric()` for all monetary fields (price, cost, subtotal, tax, total, discount, unitCost). Per RESEARCH.md Pitfall 1: numeric() returns strings from postgres.js, which would break API contract (frontends expect JavaScript numbers, not strings)
- Used `serial()` integer PKs to maintain API contract compatibility with existing integer IDs
- Seed script uses an `idMap = new Map<number, number>()` to resolve FK references since generator IDs (1–500) may not match DB serial IDs after TRUNCATE RESTART IDENTITY

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Migration generation (`pnpm db:generate`) was run with a placeholder DATABASE_URL since no real Supabase credentials exist yet. drizzle-kit generate only reads the schema file to produce SQL — it does not connect to the database — so this works correctly. The generated SQL is valid and ready to apply when DATABASE_URL is configured.

## User Setup Required

Before running `pnpm db:migrate` or `pnpm db:seed`, add to `apps/backend/.env`:

```
DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
```

Get the connection string from: Supabase Dashboard → Project → Settings → Database → Connection string (Direct connection, port 5432).

Then run in order:

1. `cd apps/backend && pnpm db:migrate` — applies migration SQL to create all 8 tables
2. `cd apps/backend && pnpm db:seed` — seeds 500 products, 200 orders, 150 sales, 50 purchases

## Next Phase Readiness

- DrizzleService is injectable via @Global DbModule — all 6 feature services can inject it immediately
- Schema types ($inferSelect/$inferInsert) ready for use in service query code
- Plan 02 can begin service migration: replace seedAll() calls with DrizzleService injections
- DATABASE_URL must be configured before db:migrate / db:seed work

## Self-Check: PASSED

All files verified present. All 3 task commits verified in git log.

---

_Phase: 05-database-integration_
_Completed: 2026-03-02_
