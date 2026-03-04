---
phase: 09-fix-mobile-purchase-login-bugs
plan: 01
subsystem: ui
tags: [mobile, capacitor, react, zod, typescript, vite]

# Dependency graph
requires:
  - phase: 05-database-integration
    provides: purchase_items.subtotal DB column and draft purchase status
  - phase: 06-polish-production
    provides: loginSchema in @objetiva/types for runtime validation
provides:
  - Correct mobile purchase type (draft status, subtotal field)
  - Working Draft filter chip sending status=draft to backend
  - StatusBadge draft -> gray color mapping
  - Login password validation via loginSchema before Supabase call
affects: [mobile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - loginSchema.safeParse({ email, password }) for Capacitor-safe form validation

key-files:
  created: []
  modified:
    - apps/mobile/src/types/index.ts
    - apps/mobile/src/pages/Purchases.tsx
    - apps/mobile/src/components/ui/StatusBadge.tsx
    - apps/mobile/src/pages/Login.tsx

key-decisions:
  - 'loginSchema (email+password) replaces emailSchema-only validation in mobile Login — ensures empty password is caught before Supabase call in Capacitor native mode where HTML5 required attribute is unreliable'
  - 'PurchaseItem.subtotal aligns with purchase_items DB column name; old total field was undefined causing NaN renders'
  - "Purchase.status draft aligns with backend DTO @IsIn(['draft','ordered','received','cancelled']); pending was never a valid status"

patterns-established:
  - 'Use loginSchema from @objetiva/types for full credential validation in mobile login forms'

requirements-completed: [API-06, NAV-07, AUTH-02]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 9 Plan 01: Fix Mobile Purchase & Login Bugs Summary

**Three mobile bug fixes: draft status enum alignment, PurchaseItem.subtotal field name, and Capacitor-safe password validation via loginSchema**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-02T23:37:43Z
- **Completed:** 2026-03-02T23:39:27Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Fixed Purchase.status type union to use 'draft' (was 'pending') aligning with backend DTO — Draft filter chip now returns results
- Fixed PurchaseItem field from 'total' (undefined at runtime) to 'subtotal' (matches DB column) — item amounts no longer render as NaN
- Added `draft: 'gray'` to StatusBadge STATUS_COLOR_MAP — draft purchases display a gray badge correctly
- Replaced emailSchema-only validation in Login.tsx with loginSchema validating both email and password — empty password now triggers error before Supabase call in Capacitor native mode

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix mobile purchase types, filter chips, and StatusBadge** - `1d47ec0` (fix)
2. **Task 2: Fix mobile login password validation** - `f07cb3f` (fix)

## Files Created/Modified

- `apps/mobile/src/types/index.ts` - PurchaseItem.total renamed to PurchaseItem.subtotal; Purchase.status 'pending' changed to 'draft'
- `apps/mobile/src/pages/Purchases.tsx` - STATUS_FILTERS first entry changed from Pending/pending to Draft/draft; item.total changed to item.subtotal in BottomSheet render
- `apps/mobile/src/components/ui/StatusBadge.tsx` - Added `draft: 'gray'` entry to STATUS_COLOR_MAP under gray group
- `apps/mobile/src/pages/Login.tsx` - Import changed from emailSchema to loginSchema; validation block updated to loginSchema.safeParse({ email, password })

## Decisions Made

- loginSchema (validates email format AND password min(1)) replaces emailSchema in mobile Login — single schema validates both fields, works in Capacitor native where HTML5 `required` may be bypassed
- PurchaseItem.subtotal matches the DB column name `purchase_items.subtotal` directly; using `total` was a naming mismatch introduced during Phase 4 mock data era
- Purchase status 'draft' is the backend's actual initial state per DTO; 'pending' was never valid and caused zero results when filtering

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three fixes were straightforward type/constant alignment with existing backend source of truth.

## Next Phase Readiness

- Mobile purchase section: Draft filter chip operational, item amounts display correct MXN currency, StatusBadge renders draft as gray
- Mobile login: Empty password rejected with "Password is required" error in both web and Capacitor native mode
- No blockers — phase 09 plan 01 complete

---

_Phase: 09-fix-mobile-purchase-login-bugs_
_Completed: 2026-03-02_
