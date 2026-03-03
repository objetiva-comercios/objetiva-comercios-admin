---
phase: 11-fix-sales-detail-crash
plan: 01
subsystem: api
tags: [drizzle-orm, nestjs, react, typescript, sales]

# Dependency graph
requires:
  - phase: 05-database-integration
    provides: Drizzle ORM schema with sale_items table and inArray batch-load pattern from orders/purchases
  - phase: 09-fix-mobile-purchase-login-bugs
    provides: Precedent for fixing frontend type/field mismatches with DB schema (PurchaseItem.subtotal fix)
provides:
  - Backend sales.findAll() returns populated items arrays via inArray batch query
  - Web SaleItem type with correct price/subtotal fields; Sale type without phantom fields
  - Mobile SaleItem type with correct price/subtotal fields; Sale type without phantom fields
  - Web sale-sheet.tsx renders items correctly with empty-state guard
  - Mobile Sales.tsx BottomSheet renders items correctly with empty-state guard
affects: [12-fix-sales-type-ids]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - inArray batch-load with Map lookup (already established in orders/purchases, now applied to sales)
    - Empty-array guard before inArray (saleIds.length > 0) to prevent invalid SQL

key-files:
  created: []
  modified:
    - apps/backend/src/modules/sales/sales.service.ts
    - apps/web/src/types/sale.ts
    - apps/web/src/components/tables/sales/sale-sheet.tsx
    - apps/mobile/src/types/index.ts
    - apps/mobile/src/pages/Sales.tsx

key-decisions:
  - 'inArray batch-load pattern copied exactly from orders.service.ts — consistent approach across all transactional services'
  - 'notes field removed from Sale type (no notes column on sales table; only purchases have notes)'
  - 'customerEmail removed from Sale type (no customerEmail column on sales table)'
  - 'SKU not shown in item lines — consistent with order-sheet and purchase detail views'
  - "Empty items state renders 'No items' text placeholder in both web and mobile"
  - 'Pre-existing SplashGate TypeScript error (SectionErrorFallbackProps.error: Error vs FallbackProps.error: unknown) deferred to deferred-items.md — out of scope'

patterns-established:
  - 'Sales batch-load pattern: saleIds.length > 0 guard + inArray query + Map<saleId, items[]> + zip into dataWithItems'

requirements-completed: [API-05]

# Metrics
duration: 4min
completed: 2026-03-03
---

# Phase 11 Plan 01: Fix Sales Detail Crash Summary

**Backend sales.findAll() now batch-loads sale_items via inArray+Map pattern; frontend Sale/SaleItem types corrected to match DB schema (price/subtotal replacing unitPrice/total, phantom customerEmail/notes removed)**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-03T10:48:29Z
- **Completed:** 2026-03-03T10:51:47Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Backend `sales.findAll()` batch-loads `sale_items` for all sales on the current page using the same inArray+Map pattern established in orders and purchases
- Web and mobile `SaleItem` interfaces corrected: `unitPrice` renamed to `price`, `total` renamed to `subtotal` (aligning with actual DB column names `sale_items.price` and `sale_items.subtotal`)
- Web and mobile `Sale` interfaces corrected: `customerEmail` and `notes` fields removed (no corresponding columns on the `sales` table)
- Web `sale-sheet.tsx` and mobile `Sales.tsx` BottomSheet updated to use correct field names and include empty-items guard ("No items" placeholder)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add saleItems batch-loading to sales.service.ts findAll()** - `0ed7380` (feat)
2. **Task 2: Fix frontend Sale/SaleItem types and detail views (web + mobile)** - `7d68cf9` (fix)

**Plan metadata:** (docs commit pending)

## Files Created/Modified

- `apps/backend/src/modules/sales/sales.service.ts` - Added `inArray` import; batch-load block between data query and totalPages; returns `dataWithItems` instead of `data`
- `apps/web/src/types/sale.ts` - `SaleItem.unitPrice` -> `price`, `SaleItem.total` -> `subtotal`; removed `Sale.customerEmail` and `Sale.notes`
- `apps/web/src/components/tables/sales/sale-sheet.tsx` - Removed customerEmail display; items use `item.price`/`item.subtotal`; added empty items guard; removed notes section
- `apps/mobile/src/types/index.ts` - `SaleItem.unitPrice` -> `price`, `SaleItem.total` -> `subtotal`; removed `Sale.customerEmail` and `Sale.notes`
- `apps/mobile/src/pages/Sales.tsx` - Removed Email cell div; items use `item.price`/`item.subtotal`; added empty items guard; removed notes section

## Decisions Made

- `inArray` batch-load pattern copied exactly from `orders.service.ts` — consistent approach across all transactional services
- `notes` field removed from Sale type: no `notes` column on `sales` table (only `purchases` has notes)
- `customerEmail` removed from Sale type: no `customerEmail` column on `sales` table (Order interface retains it as Order does have this field)
- Empty items state renders "No items" text placeholder in both web and mobile — consistent with empty state patterns across the app
- SKU not shown in item lines: consistent with order-sheet and purchase detail views

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript error in `apps/mobile/src/components/auth/SplashGate.tsx` (8 errors: `SectionErrorFallbackProps.error: Error` incompatible with `FallbackProps.error: unknown` from react-error-boundary). Confirmed pre-existing via git stash test. Logged to `.planning/phases/11-fix-sales-detail-crash/deferred-items.md`. Did not affect the sales feature implementation.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Sales detail views are crash-free: both web SaleSheet and mobile Sales BottomSheet now render item lists correctly
- Phase 12 scope: `SaleItem.id` and `SaleItem.productId` still typed as `string` in web (should be `number`) — explicitly deferred per plan note "Leave `id: string` and `productId: string` as-is — Phase 12 scope"
- Pre-existing SplashGate mobile TS error deferred and documented

## Self-Check: PASSED

All files verified present. All commits verified in git log.

- `apps/backend/src/modules/sales/sales.service.ts` - FOUND
- `apps/web/src/types/sale.ts` - FOUND
- `apps/web/src/components/tables/sales/sale-sheet.tsx` - FOUND
- `apps/mobile/src/types/index.ts` - FOUND
- `apps/mobile/src/pages/Sales.tsx` - FOUND
- `0ed7380` - FOUND
- `7d68cf9` - FOUND

---

_Phase: 11-fix-sales-detail-crash_
_Completed: 2026-03-03_
