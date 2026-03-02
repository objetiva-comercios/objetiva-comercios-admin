---
phase: 07-fix-integration-bugs
plan: 01
subsystem: backend-data-layer
tags: [drizzle, schema, migration, seed, orders, purchases, inventory, bug-fix]
dependency_graph:
  requires: []
  provides: [db-schema-8-columns, migration-sql, batch-items-findall]
  affects: [orders-api, purchases-api, inventory-api, web-order-sheet, web-purchase-sheet]
tech_stack:
  added: []
  patterns: [batch-inArray-query, generator-interface-extension, seed-field-mapping]
key_files:
  created:
    - apps/backend/drizzle/0001_brief_reaper.sql
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/generators/order.generator.ts
    - apps/backend/src/db/generators/purchase.generator.ts
    - apps/backend/src/db/generators/inventory.generator.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/modules/orders/orders.service.ts
    - apps/backend/src/modules/purchases/purchases.service.ts
decisions:
  - 'inArray with empty-array guard (length > 0 check) prevents invalid SQL when page has zero rows'
  - 'status extracted to variable in purchase generator so receivedAt can conditionally reference it'
  - 'reorderPoint = minStock: same concept, avoids redundant faker call'
metrics:
  duration: 2min
  completed_date: '2026-03-02'
  tasks_completed: 3
  files_modified: 7
---

# Phase 07 Plan 01: Backend Data Layer Fix Summary

**One-liner:** Added 8 phantom DB columns via Drizzle migration, updated faker generators and seed mapping, and fixed orders/purchases findAll to batch-load items via inArray so frontend detail panels stop crashing.

## What Was Built

The backend data layer was missing two categories of things:

1. **8 phantom DB columns** — Fields expected by the frontend TypeScript types that did not exist in the database schema:
   - `orders.shippingAddress` (text, nullable)
   - `purchases.supplierContact` (text, nullable)
   - `purchases.shipping` (double precision, default 0)
   - `purchases.notes` (text, nullable)
   - `purchases.receivedAt` (timestamp, nullable)
   - `inventory.reservedQuantity` (integer, default 0)
   - `inventory.availableQuantity` (integer, default 0)
   - `inventory.reorderPoint` (integer, default 10)

2. **findAll() missing items array** — `OrdersService.findAll()` and `PurchasesService.findAll()` returned order/purchase rows without their child items. The web `OrderSheet` and `PurchaseSheet` components expected `items[]` on every row and crashed when it was absent.

## Tasks Completed

| Task | Name                                                         | Commit  | Key Files                                                                  |
| ---- | ------------------------------------------------------------ | ------- | -------------------------------------------------------------------------- |
| 1    | Add phantom columns to Drizzle schema and generate migration | e8244f9 | schema.ts, drizzle/0001_brief_reaper.sql                                   |
| 2    | Update generators, seed script, and run migration + seed     | 86a5646 | order.generator.ts, purchase.generator.ts, inventory.generator.ts, seed.ts |
| 3    | Fix orders and purchases findAll to batch-load items         | 86eb7ac | orders.service.ts, purchases.service.ts                                    |

## Decisions Made

- **inArray empty-array guard:** When a page returns 0 rows, `inArray(col, [])` produces invalid SQL. Added `ids.length > 0 ? await query : []` guard in both services.
- **status extracted to variable in purchase generator:** The `receivedAt` field must be conditionally set based on `status`. Previously `status` was computed inline inside the return object. Extracted to a `const status` before the return so `receivedAt` logic can reference it.
- **reorderPoint = minStock:** The plan specifies `reorderPoint = minStock` because they represent the same business concept — the stock level at which reordering is triggered. This avoids a redundant faker call and keeps the value semantically correct.

## Deviations from Plan

None - plan executed exactly as written.

## Verification

```
TypeScript: CLEAN (zero errors via npx tsc --noEmit)
Migration: drizzle/0001_brief_reaper.sql contains all 8 ALTER TABLE statements
Schema: All 8 new columns present in schema.ts
Generators: All 3 generators produce values for new fields
Seed: All insert blocks map new generator fields to DB columns
Services: Both findAll methods return items[] via batch inArray query
```

When DATABASE_URL is available, run:

```bash
cd apps/backend && pnpm db:migrate && pnpm db:seed
```

This will apply the migration and re-populate all tables with new fields.

## Self-Check: PASSED
