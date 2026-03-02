---
phase: 06-polish-production
plan: 01
subsystem: auth
tags: [rbac, jwt, nestjs, roles, guards, decorators]

# Dependency graph
requires:
  - phase: 05-database-integration
    provides: All domain services/controllers with CRUD endpoints (POST/PATCH/DELETE)
  - phase: 01-foundation
    provides: JWT auth guard infrastructure (JwtAuthGuard, AuthenticatedUser types)
provides:
  - AppRole type ('admin' | 'viewer') in @objetiva/types shared package
  - @Roles() decorator with ROLES_KEY for per-method role annotation
  - RolesGuard enforcing role-based access on write endpoints
  - Fixed JWT extraction reading app_metadata.role (not Postgres role)
  - All 13 write endpoints (POST/PATCH/DELETE) restricted to admin role
affects: [web-frontend, mobile, any future API consumers]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "@UseGuards(RolesGuard) + @Roles('admin') per-method pattern for write endpoint protection"
    - "app_metadata.role extraction pattern for Supabase custom roles in JWT payload"
    - "NestJS Reflector.getAllAndOverride for reading decorator metadata in guards"

key-files:
  created:
    - apps/backend/src/common/decorators/roles.decorator.ts
    - apps/backend/src/common/guards/roles.guard.ts
  modified:
    - packages/types/src/index.ts
    - apps/backend/src/auth/auth.types.ts
    - apps/backend/src/auth/auth.middleware.ts
    - apps/backend/src/common/guards/jwt-auth.guard.ts
    - apps/backend/src/modules/products/products.controller.ts
    - apps/backend/src/modules/orders/orders.controller.ts
    - apps/backend/src/modules/inventory/inventory.controller.ts
    - apps/backend/src/modules/sales/sales.controller.ts
    - apps/backend/src/modules/purchases/purchases.controller.ts

key-decisions:
  - "Per-endpoint guard pattern (not global): @UseGuards(RolesGuard) applied only to write endpoints; GET endpoints remain unannotated and open to all authenticated users"
  - "Default role is 'viewer' for users without app_metadata.role: safe default, ensures new signups cannot write without explicit admin grant"
  - "AppRole type in shared @objetiva/types package: enables type-safe role checks across monorepo"

patterns-established:
  - "RBAC decoration pattern: @UseGuards(RolesGuard) + @Roles('admin') above HTTP method decorator for all write endpoints"
  - "Supabase JWT app_metadata.role extraction: payload.app_metadata?.role (not payload.role which is always 'authenticated')"

requirements-completed: [AUTH-06]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 06 Plan 01: RBAC Backend Implementation Summary

**Backend RBAC with AppRole type, RolesGuard, and all 13 write endpoints (POST/PATCH/DELETE) restricted to admin role, fixing critical JWT app_metadata.role extraction bug**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T14:39:19Z
- **Completed:** 2026-03-02T14:43:48Z
- **Tasks:** 2
- **Files modified:** 11 (7 modified + 2 created + 2 previously untracked)

## Accomplishments

- Fixed critical bug: JWT extraction now reads `app_metadata.role` (custom app role) instead of `payload.role` (always `"authenticated"` — the Postgres DB role)
- Created complete RBAC infrastructure: `AppRole` type, `@Roles()` decorator, `RolesGuard` with null-safe unannotated route handling
- Applied `@UseGuards(RolesGuard) + @Roles('admin')` to all 13 write endpoints across 5 domain controllers; GET endpoints remain open to all authenticated users

## Task Commits

Each task was committed atomically:

1. **Task 1: Create RBAC infrastructure** - `4d70735` (feat)
2. **Task 2: Apply @Roles to write endpoints** - `988b9d1` (feat)

## Files Created/Modified

- `packages/types/src/index.ts` - Added `AppRole = 'admin' | 'viewer'` type export; updated `User.role` from `string` to `AppRole`
- `apps/backend/src/auth/auth.types.ts` - Updated `AuthenticatedUser.role` from `string` to `AppRole`
- `apps/backend/src/auth/auth.middleware.ts` - Fixed role extraction: `app_metadata?.role ?? 'viewer'` (deviation auto-fix)
- `apps/backend/src/common/guards/jwt-auth.guard.ts` - Fixed role extraction: `app_metadata?.role ?? 'viewer'`
- `apps/backend/src/common/decorators/roles.decorator.ts` - NEW: `ROLES_KEY`, `@Roles()` decorator, re-exports `AppRole`
- `apps/backend/src/common/guards/roles.guard.ts` - NEW: `RolesGuard` with Reflector, null-safe unannotated route pass-through
- `apps/backend/src/modules/products/products.controller.ts` - `@UseGuards(RolesGuard) + @Roles('admin')` on Post/Patch/Delete
- `apps/backend/src/modules/orders/orders.controller.ts` - `@UseGuards(RolesGuard) + @Roles('admin')` on Post/Patch/Delete
- `apps/backend/src/modules/inventory/inventory.controller.ts` - `@UseGuards(RolesGuard) + @Roles('admin')` on Patch
- `apps/backend/src/modules/sales/sales.controller.ts` - `@UseGuards(RolesGuard) + @Roles('admin')` on Post/Patch/Delete
- `apps/backend/src/modules/purchases/purchases.controller.ts` - `@UseGuards(RolesGuard) + @Roles('admin')` on Post/Patch/Delete

## Decisions Made

- Per-endpoint guard pattern (not global): `@UseGuards(RolesGuard)` applied only to write endpoints, ensuring GET routes remain open to all authenticated users without any changes
- Default role is `'viewer'` for users without `app_metadata.role` in JWT: safe default so new signups cannot write data without explicit admin grant
- `AppRole` type lives in `@objetiva/types` shared package: enables type-safe role checks if mobile app or other consumers need role awareness

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed same app_metadata.role bug in auth.middleware.ts**

- **Found during:** Task 1 (build verification)
- **Issue:** `auth.middleware.ts` also had `payload.role` (the Postgres database role) instead of `app_metadata?.role`. The plan specified fixing `jwt-auth.guard.ts` but missed this parallel implementation. TypeScript error surfaced it during build.
- **Fix:** Added `AppRole` import and changed `role: (payload.role as string) ?? 'authenticated'` to `role: ((payload as any).app_metadata?.role as AppRole) ?? 'viewer'`
- **Files modified:** `apps/backend/src/auth/auth.middleware.ts`
- **Verification:** Backend compiled clean after fix
- **Committed in:** `4d70735` (Task 1 commit)

**2. [Rule 3 - Blocking] Built @objetiva/types package to generate dist/index.js**

- **Found during:** Task 1 (first build attempt)
- **Issue:** `@objetiva/types` has `"main": "./dist/index.js"` but `dist/` directory did not exist. TypeScript couldn't resolve the package.
- **Fix:** Ran `pnpm --filter @objetiva/types build` to compile the types package
- **Files modified:** `packages/types/dist/` (generated)
- **Verification:** All 5 `@objetiva/types` import errors resolved, backend compiled clean
- **Committed in:** Not committed separately (dist/ is gitignored)

---

**Total deviations:** 2 auto-fixed (1 bug fix, 1 blocking build issue)
**Impact on plan:** Both auto-fixes were necessary for compilation and correctness. No scope creep.

## Issues Encountered

- `packages/types` dist not generated before backend build — resolved by building types package first (common monorepo initialization step)

## User Setup Required

None - no external service configuration required. RBAC enforcement is fully code-based using JWT claims already present in Supabase tokens.

## Next Phase Readiness

- Backend RBAC complete: admin users have full write access, viewer users are restricted to read-only (GET) endpoints
- AUTH-06 requirement satisfied
- Ready for Phase 06 Plan 02 (next plan in polish-production phase)

## Self-Check: PASSED

- FOUND: `.planning/phases/06-polish-production/06-01-SUMMARY.md`
- FOUND: `apps/backend/src/common/decorators/roles.decorator.ts`
- FOUND: `apps/backend/src/common/guards/roles.guard.ts`
- FOUND: commit `4d70735` (Task 1)
- FOUND: commit `988b9d1` (Task 2)

---

_Phase: 06-polish-production_
_Completed: 2026-03-02_
