---
phase: 10-code-quality-type-safety-cleanup
plan: '04'
subsystem: auth
tags: [zod, validation, mobile, react, typescript]

# Dependency graph
requires:
  - phase: 10-code-quality-type-safety-cleanup-01
    provides: signupSchema.safeParse() pattern added to Signup.tsx in plan 01
  - phase: 09-fix-mobile-purchase-login-bugs-01
    provides: loginSchema used in Login.tsx for both email+password validation
provides:
  - Correct Zod v4 error property access (.issues) in mobile Login.tsx and Signup.tsx
  - Schema-specific validation messages surfaced correctly to users (e.g. "Invalid email", "Passwords don't match")
affects: [10-VERIFICATION]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'Zod v4 uses ZodError.issues (not .errors) for validation issue array'

key-files:
  created: []
  modified:
    - apps/mobile/src/pages/Login.tsx
    - apps/mobile/src/pages/Signup.tsx

key-decisions:
  - 'Zod v4 ZodError.issues is the correct property; .errors does not exist in Zod v4 — access returned undefined causing validation messages to always fall through to generic fallback string'

patterns-established:
  - 'Zod v4 safeParse error access: result.error.issues[0]?.message (not .errors)'

requirements-completed: [AUTH-01, AUTH-05, UI-05, MONO-04]

# Metrics
duration: 1min
completed: 2026-03-03
---

# Phase 10 Plan 04: Zod v4 .errors to .issues Fix Summary

**Zod v4 API mismatch fixed in mobile Login.tsx and Signup.tsx: `.errors` replaced with `.issues` so schema-specific validation messages ("Invalid email", "Passwords don't match") display correctly instead of always falling through to generic fallback strings**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-03T01:36:22Z
- **Completed:** 2026-03-03T01:36:58Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Fixed Zod v4 API mismatch: `loginResult.error.errors[0]` -> `loginResult.error.issues[0]` in Login.tsx line 20
- Fixed same bug in Signup.tsx line 22: `result.error.errors[0]` -> `result.error.issues[0]`
- Zero `.errors[0]` references remain in either file; schema-specific messages now surface to users
- Closed the single verification gap identified in 10-VERIFICATION.md (score was 14/15 — now 15/15)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Zod v4 .errors to .issues in Login.tsx and Signup.tsx** - `2fa18a4` (fix)

## Files Created/Modified

- `apps/mobile/src/pages/Login.tsx` - Line 20: `loginResult.error.errors[0]` changed to `loginResult.error.issues[0]`
- `apps/mobile/src/pages/Signup.tsx` - Line 22: `result.error.errors[0]` changed to `result.error.issues[0]`

## Decisions Made

- None - followed plan as specified. The fix is a precise one-word change per file (`errors` -> `issues`). Zod v4.3.6 exposes validation issues under `.issues`; `.errors` does not exist and accessing it returned `undefined`, causing the `??` fallback to always activate.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the two edits applied cleanly and verification passed immediately.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 10 gap closure complete: 10-VERIFICATION.md score is now fully satisfied (15/15 truths verified)
- All 10 phases and all 39 plans (38 original + 1 gap closure) across the v1.0 milestone are complete
- No blockers or concerns

---

_Phase: 10-code-quality-type-safety-cleanup_
_Completed: 2026-03-03_

## Self-Check: PASSED

- FOUND: apps/mobile/src/pages/Login.tsx
- FOUND: apps/mobile/src/pages/Signup.tsx
- FOUND: .planning/phases/10-code-quality-type-safety-cleanup/10-04-SUMMARY.md
- FOUND: commit 2fa18a4
