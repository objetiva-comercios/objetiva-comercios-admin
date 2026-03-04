---
phase: 02-backend-api-with-mock-data
plan: 02
subsystem: api
tags: [faker, typescript, mock-data, e-commerce, generators]

# Dependency graph
requires:
  - phase: 01-foundation-monorepo
    provides: NestJS backend structure with TypeScript configuration
provides:
  - Deterministic mock data generators for 500+ products
  - Order, sale, and purchase generators with referential integrity
  - Central seedAll() function returning complete MockData
  - TypeScript types for all e-commerce entities
affects: [02-03-api-endpoints, 03-web-ui, 04-mobile-ui]

# Tech tracking
tech-stack:
  added: [@faker-js/faker@10.2.0]
  patterns: [deterministic-seeding, referential-integrity, weighted-distributions]

key-files:
  created:
    - apps/backend/src/data/types.ts
    - apps/backend/src/data/generators/product.generator.ts
    - apps/backend/src/data/generators/inventory.generator.ts
    - apps/backend/src/data/generators/order.generator.ts
    - apps/backend/src/data/generators/sale.generator.ts
    - apps/backend/src/data/generators/purchase.generator.ts
    - apps/backend/src/data/seed.ts
  modified:
    - apps/backend/package.json

key-decisions:
  - "Use faker.seed(id) for deterministic generation - same IDs produce same data on restart"
  - "Products as foundation - all other entities reference product IDs for integrity"
  - "Weighted status distributions (85% active, 10% inactive, 5% discontinued)"
  - "16% tax rate for all transactions (configurable via constant)"
  - "Cost always 40-70% of price for realistic profit margins"

patterns-established:
  - "Deterministic seeding: faker.seed(id + offset) ensures reproducibility"
  - "Referential integrity: Orders/Sales/Purchases pick from products array"
  - "1:1 inventory mapping: Each product has exactly one inventory item"
  - "ISO 8601 dates: All timestamps use .toISOString() format"

# Metrics
duration: 6min
completed: 2026-01-24
---

# Phase 2 Plan 02: Mock Data Generators Summary

**Deterministic mock data generators producing 500+ products, 200 orders, 150 sales, and 50 purchases with full referential integrity using @faker-js/faker**

## Performance

- **Duration:** 6 min
- **Started:** 2026-01-24T12:03:53Z
- **Completed:** 2026-01-24T12:09:18Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Created 500+ realistic products with 10 categories, SKUs, pricing, and stock levels
- Built order/sale/purchase generators that reference valid product IDs
- Implemented 1:1 inventory tracking with derived status (in_stock/low_stock/out_of_stock)
- Established deterministic seeding pattern for reproducible test data

## Task Commits

Each task was committed atomically:

1. **Task 1: Install faker and create type definitions** - `5e6dabb` (feat)
2. **Task 2: Create product and inventory generators** - `81980fe` (feat)
3. **Task 3: Create order, sale, and purchase generators with seed function** - `2d9e08c` (feat)

## Files Created/Modified

- `apps/backend/src/data/types.ts` - TypeScript interfaces for Product, Order, OrderItem, InventoryItem, Sale, SaleItem, Purchase, PurchaseItem
- `apps/backend/src/data/generators/product.generator.ts` - Generates 500 products with realistic attributes, categories, pricing
- `apps/backend/src/data/generators/inventory.generator.ts` - Creates 1:1 inventory items with derived status based on stock levels
- `apps/backend/src/data/generators/order.generator.ts` - Generates customer orders with 1-5 line items referencing real products
- `apps/backend/src/data/generators/sale.generator.ts` - Generates sales transactions with discounts and payment methods
- `apps/backend/src/data/generators/purchase.generator.ts` - Generates supplier purchase orders with 1-10 items and delivery dates
- `apps/backend/src/data/seed.ts` - Central seedAll() function returning complete MockData object
- `apps/backend/package.json` - Added @faker-js/faker@10.2.0

## Decisions Made

**1. Deterministic seeding with offset strategy**

- Used faker.seed(id + offset) where offset differs per generator (products: id, inventory: id+10000, orders: id+20000, sales: id+30000, purchases: id+40000)
- Ensures same output on every restart for reliable testing
- Offsets prevent seed collision between generators

**2. Products as foundational entity**

- Generate products first (500 items)
- All other generators receive products array as parameter
- Orders, sales, and purchases reference valid product IDs via faker.helpers.arrayElement(products)
- Guarantees referential integrity without database foreign keys

**3. Weighted status distributions**

- Products: 85% active, 10% inactive, 5% discontinued (realistic business mix)
- Orders: 50% delivered, 20% shipped, 15% processing, 10% pending, 5% cancelled
- Sales: 90% completed, 5% refunded, 5% partial refund
- Purchases: 60% received, 25% ordered, 10% draft, 5% cancelled

**4. Realistic pricing logic**

- Price: $10-$1000 range with 2 decimal places
- Cost: 40-70% of price (realistic wholesale margins)
- Tax: 16% on all transactions
- Discounts: 0-20% of subtotal for sales only

**5. Inventory status derivation**

- Automatically calculated from quantity vs minStock threshold
- quantity === 0 → out_of_stock
- quantity <= minStock → low_stock
- quantity > minStock → in_stock
- No manual status setting needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all generators implemented smoothly with faker API matching plan specifications.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**

- Plan 02-03: API endpoint implementation can consume seedAll() immediately
- Frontend development (Phase 3-4) will receive realistic data shapes
- Testing with production-like data volumes and distributions

**Data quality:**

- All entities have complete required fields
- Referential integrity maintained (no orphaned references)
- Dates in ISO 8601 format for JSON serialization
- Numeric values properly rounded to 2 decimals
- Status enums match TypeScript type definitions

**Pattern established:**

- Future generators can follow same seed(id + offset) pattern
- seedAll() can be extended with new entity types
- MockData interface can be expanded without breaking existing code

---

_Phase: 02-backend-api-with-mock-data_
_Completed: 2026-01-24_
