---
phase: 13-tech-debt-cleanup
plan: 01
subsystem: ui
tags: [typescript, react-error-boundary, next.js, design-tokens, currency-formatting]

# Dependency graph
requires:
  - phase: 12-fix-dashboard-links-web-types-doc-sync
    provides: Web entity id:number migration and dashboard sheet panels
  - phase: 10-code-quality-type-safety-cleanup
    provides: formatCurrency from @objetiva/utils
provides:
  - Mobile TS zero errors (SplashGate FallbackProps type aligned)
  - Web login page without dead /forgot-password link
  - api.ts without fetchLowStock dead export
  - stats-cards.tsx with consistent MXN currency formatting on todayRevenue
  - packages/ui token barrel without unused colors export
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - apps/mobile/src/components/ui/SectionErrorFallback.tsx
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/web/src/lib/api.ts
    - apps/web/src/components/dashboard/stats-cards.tsx
    - packages/ui/src/tokens/index.ts
  deleted:
    - packages/ui/src/tokens/colors.ts

key-decisions:
  - 'error: unknown over error: Error in SectionErrorFallback — react-error-boundary v6 FallbackProps uses unknown, runtime usage is console.error so unknown is safe'
  - 'colors.ts deletion confirmed safe — tailwind configs import only spacing+typography from @objetiva/ui/tokens, zero consumers of colors or Colors type'

patterns-established: []

requirements-completed: []

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 13 Plan 01: Tech Debt Cleanup Summary

**Five surgical fixes: mobile TS2322 error boundary type, dead forgot-password link, dead fetchLowStock export, inconsistent MXN currency subtitle, and unused colors design token**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-03T12:47:02Z
- **Completed:** 2026-03-03T12:48:52Z
- **Tasks:** 2
- **Files modified:** 5 (+ 1 deleted)

## Accomplishments

- Fixed 8 mobile TS2322 errors in SplashGate.tsx by changing `error: Error` to `error: unknown` in SectionErrorFallback — aligns with react-error-boundary v6.1.1 FallbackProps type
- Removed dead `/forgot-password` link and its wrapper div from login/page.tsx (page now matches Email field structure)
- Deleted `fetchLowStock()` export from api.ts — no consumers anywhere in the codebase
- Fixed `stats-cards.tsx` todayRevenue subtitle: `$${formatNumber(...)}` replaced with `${formatCurrency(...)}` for consistent MXN/es-MX formatting
- Deleted `packages/ui/src/tokens/colors.ts` and cleaned `index.ts` barrel — both Tailwind configs only import `spacing` and `typography`

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix mobile TS error, remove web dead link and dead code, fix currency format** - `a127bbe` (fix)
2. **Task 2: Delete unused colors token and clean barrel export** - `2aed87f` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/mobile/src/components/ui/SectionErrorFallback.tsx` - error type changed from Error to unknown
- `apps/web/src/app/(auth)/login/page.tsx` - removed forgot-password link and wrapper div
- `apps/web/src/lib/api.ts` - deleted fetchLowStock function (3 lines removed)
- `apps/web/src/components/dashboard/stats-cards.tsx` - todayRevenue subtitle uses formatCurrency
- `packages/ui/src/tokens/index.ts` - removed colors re-export, import, and tokens.colors key
- `packages/ui/src/tokens/colors.ts` - DELETED

## Decisions Made

- `error: unknown` is safe for SectionErrorFallback because `error` is only passed to `console.error()` — no property access that would require narrowing
- `colors.ts` deletion is safe — confirmed zero consumers across web and mobile tailwind configs (both import only `{ spacing, typography }`)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — all 4 code edits and 1 deletion were clean and TypeScript checks passed immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

All 5 tech debt items from the v1.0 milestone audit are closed. Codebase is clean:

- Mobile: zero TypeScript errors
- Web: zero TypeScript errors
- No dead links or dead code
- Consistent MXN currency formatting throughout
- Trimmed package exports

Phase 13 is complete. No further work planned.

## Self-Check: PASSED

- SectionErrorFallback.tsx: FOUND
- login/page.tsx: FOUND
- api.ts: FOUND
- stats-cards.tsx: FOUND
- packages/ui/src/tokens/index.ts: FOUND
- packages/ui/src/tokens/colors.ts: CONFIRMED DELETED
- Commit a127bbe: FOUND
- Commit 2aed87f: FOUND

---

_Phase: 13-tech-debt-cleanup_
_Completed: 2026-03-03_
