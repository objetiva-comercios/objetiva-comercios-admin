---
phase: 10-code-quality-type-safety-cleanup
plan: 02
subsystem: ui
tags: [typescript, react, mobile, formatters, types, monorepo]

# Dependency graph
requires:
  - phase: 10-01
    provides: '@objetiva/utils formatCurrency and formatDate with es-MX/MXN defaults'
provides:
  - '6 mobile pages import formatCurrency/formatDate from @objetiva/utils — 10 local definitions eliminated'
  - '8 mobile entity types with id: number matching backend Drizzle serial() columns'
  - '14 id/productId fields changed from string to number across Product, Order, OrderItem, Sale, SaleItem, Purchase, PurchaseItem, Inventory'
affects: [10-03, future-mobile-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared formatter import pattern: import { formatCurrency, formatDate } from '@objetiva/utils'"
    - "Null/undefined guard at call site pattern: `value ? formatDate(value) : 'fallback'` preserves nullable semantics without polluting shared utility"

key-files:
  created: []
  modified:
    - apps/mobile/src/types/index.ts
    - apps/mobile/src/pages/Articles.tsx
    - apps/mobile/src/pages/Sales.tsx
    - apps/mobile/src/pages/Orders.tsx
    - apps/mobile/src/pages/Purchases.tsx
    - apps/mobile/src/pages/Inventory.tsx
    - apps/mobile/src/pages/Profile.tsx

key-decisions:
  - 'Null guard for Purchase.receivedAt preserved at call site (not in shared formatDate) — shared formatter takes Date|string, caller decides the null fallback label'
  - "Undefined guard for Profile.user.created_at preserved at call site — Supabase User.created_at is string|undefined, shared formatter doesn't accept undefined"
  - 'Pre-existing TypeScript errors in SplashGate.tsx and Login.tsx/Signup.tsx deferred — out-of-scope per deviation rules, logged to deferred-items.md'

patterns-established:
  - 'Call-site null guard pattern: nullable fields get guarded before calling shared formatters — keeps formatters pure and callers explicit'

requirements-completed: [MONO-04]

# Metrics
duration: 3min
completed: 2026-03-03
---

# Phase 10 Plan 02: Mobile Shared Formatters & Type Alignment Summary

**Eliminated 10 local formatter definitions across 6 mobile pages by importing from @objetiva/utils, and aligned 14 entity id/productId fields from string to number matching backend Drizzle serial() columns**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-03T00:43:11Z
- **Completed:** 2026-03-03T00:47:09Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- Replaced 10 local `formatCurrency`/`formatDate` function definitions across 6 mobile pages with single `import { formatCurrency, formatDate } from '@objetiva/utils'`
- Changed 14 entity id and productId fields from `string` to `number` in `apps/mobile/src/types/index.ts` to match backend Drizzle `serial()` column return type
- Preserved null guard for `Purchase.receivedAt` and undefined guard for `Profile.user.created_at` at their respective call sites
- Zero TypeScript errors introduced in plan's target files

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace local formatCurrency/formatDate in mobile pages** - `7f4c361` (feat)
2. **Task 2: Fix mobile entity id types from string to number** - `4a3fe5f` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `apps/mobile/src/types/index.ts` - Product, OrderItem, Order, SaleItem, Sale, PurchaseItem, Purchase, Inventory all changed from id/productId: string to id/productId: number
- `apps/mobile/src/pages/Articles.tsx` - Removed local formatCurrency + formatDate; imports from @objetiva/utils
- `apps/mobile/src/pages/Sales.tsx` - Removed local formatCurrency + formatDate; imports from @objetiva/utils
- `apps/mobile/src/pages/Orders.tsx` - Removed local formatCurrency + formatDate; imports from @objetiva/utils
- `apps/mobile/src/pages/Purchases.tsx` - Removed local formatCurrency + formatDate (null guard preserved at call site); imports from @objetiva/utils
- `apps/mobile/src/pages/Inventory.tsx` - Removed local formatDate; imports from @objetiva/utils
- `apps/mobile/src/pages/Profile.tsx` - Removed local formatDate (undefined guard preserved at call site); imports from @objetiva/utils

## Decisions Made

- Null guard for `Purchase.receivedAt` preserved at call site: `purchase.receivedAt ? formatDate(purchase.receivedAt) : 'Not received'` — the shared `formatDate` takes `Date | string` not `string | null`, so the caller is responsible for the null fallback label
- Undefined guard for `Profile.user.created_at` preserved at call site: `user.created_at ? formatDate(user.created_at) : 'Unknown'` — Supabase `User.created_at` is `string | undefined`, shared formatter doesn't accept undefined
- Pre-existing TypeScript errors in `SplashGate.tsx`, `Login.tsx`, and `Signup.tsx` identified as out-of-scope per deviation rules; logged to `deferred-items.md` for 10-03 or future cleanup

## Deviations from Plan

None - plan executed exactly as written. The pre-existing TypeScript errors in out-of-scope files (SplashGate, Login, Signup) were identified, documented in `deferred-items.md`, and deliberately not fixed per SCOPE BOUNDARY deviation rules.

## Issues Encountered

Pre-existing TypeScript errors found in `apps/mobile/src/components/auth/SplashGate.tsx` and `apps/mobile/src/pages/Login.tsx`/`Signup.tsx`. These existed before plan execution (confirmed via git stash test) and are in files outside this plan's scope. Logged to `deferred-items.md` for future cleanup.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Mobile formatter consolidation complete — zero duplicate formatter definitions in mobile pages
- Entity types aligned with backend schema — TypeScript will now catch id type mismatches at compile time
- Pre-existing TS errors in SplashGate/Login/Signup deferred to 10-03 or dedicated cleanup plan

---

_Phase: 10-code-quality-type-safety-cleanup_
_Completed: 2026-03-03_
