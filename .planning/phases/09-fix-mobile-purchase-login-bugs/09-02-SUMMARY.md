---
phase: 09-fix-mobile-purchase-login-bugs
plan: '02'
subsystem: ui
tags: [react, typescript, tanstack-table, next-js, shadcn]

# Dependency graph
requires:
  - phase: 05-database-integration
    provides: purchase_items.subtotal DB column (not 'total')
  - phase: 02-backend-api-with-mock-data
    provides: Purchase.status 'draft' enum in backend DTO
provides:
  - Corrected web PurchaseItem.subtotal field matching DB column
  - Corrected web Purchase.status 'draft' enum matching backend DTO
  - Gray badge rendering for draft-status purchases in web table and detail sheet
  - Correct USD item amounts in PurchaseSheet (no NaN)
affects: [web-frontend, purchases-section]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Status badge key must match backend enum value exactly to avoid undefined lookup and unstyled rendering
    - Field names in frontend types must mirror DB column names returned by backend API

key-files:
  created: []
  modified:
    - apps/web/src/types/purchase.ts
    - apps/web/src/components/tables/purchases/columns.tsx
    - apps/web/src/components/tables/purchases/purchase-sheet.tsx

key-decisions:
  - 'Gray badge for draft status (bg-gray-100 text-gray-800) — initial/inactive state, consistent with mobile StatusBadge draft mapping'

patterns-established:
  - 'Type-badge map parity: frontend status badge maps must use exact same keys as backend enum values'

requirements-completed: [API-06]

# Metrics
duration: 5min
completed: '2026-03-02'
---

# Phase 9 Plan 02: Web Purchase Bug Fixes Summary

**Web purchase table gray-badge for draft status and correct USD item subtotals in PurchaseSheet — both caused by 'pending'/'total' mismatch with backend 'draft'/'subtotal'**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T23:41:57Z
- **Completed:** 2026-03-02T23:46:30Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- PurchaseItem.subtotal field now matches purchase_items.subtotal DB column (was 'total', caused NaN in PurchaseSheet item rendering)
- Purchase.status union now includes 'draft' (was 'pending', never valid per backend DTO @IsIn)
- columns.tsx and purchase-sheet.tsx statusVariants/statusColors maps updated to use 'draft' key (gray badge, consistent with mobile StatusBadge)
- Web build passes with zero TypeScript errors (17 pages compiled)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix web purchase types** - `b48f232` (fix)
2. **Task 2: Fix web purchase columns and detail sheet** - `58b2adb` (fix)

**Plan metadata:** (docs commit — see final commit hash)

## Files Created/Modified

- `apps/web/src/types/purchase.ts` - PurchaseItem.total renamed to subtotal; Purchase.status 'pending' changed to 'draft'
- `apps/web/src/components/tables/purchases/columns.tsx` - statusVariants and statusColors keys changed from 'pending' to 'draft' (gray colors)
- `apps/web/src/components/tables/purchases/purchase-sheet.tsx` - statusVariants/statusColors 'pending' to 'draft'; item.total changed to item.subtotal

## Decisions Made

- Gray badge color (bg-gray-100 text-gray-800) for draft status — matches mobile StatusBadge's draft->gray mapping, representing an initial/inactive state before ordering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All Phase 9 purchase and login bugs are now fixed (mobile in 09-01, web in 09-02)
- No further work needed — v1.0 milestone complete

## Self-Check: PASSED

- apps/web/src/types/purchase.ts — FOUND
- apps/web/src/components/tables/purchases/columns.tsx — FOUND
- apps/web/src/components/tables/purchases/purchase-sheet.tsx — FOUND
- .planning/phases/09-fix-mobile-purchase-login-bugs/09-02-SUMMARY.md — FOUND
- Commit b48f232 — FOUND
- Commit 58b2adb — FOUND

---

_Phase: 09-fix-mobile-purchase-login-bugs_
_Completed: 2026-03-02_
