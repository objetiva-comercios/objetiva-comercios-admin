---
phase: 07-fix-integration-bugs
plan: 02
subsystem: ui
tags: [react, next.js, typescript, tailwind, supabase, middleware]

# Dependency graph
requires:
  - phase: 07-fix-integration-bugs/07-01
    provides: Backend returns purchases KPI field in DashboardResponse, order/purchase/inventory columns fixed in DB
provides:
  - DashboardResponse type aligned with backend in both web and mobile
  - Purchases KPI card on web dashboard (5th stats card with Truck icon)
  - Purchases summary card on mobile dashboard
  - Deny-by-default auth middleware protecting all non-public routes
  - returnTo redirect chain (middleware sets param, login reads it)
  - DATABASE_URL documented in backend .env.example
affects: [phase-08, auth-flows, dashboard-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Suspense boundary wrapping useSearchParams in Next.js 14 client components
    - Deny-by-default middleware with public-route whitelist (isPublicRoute) instead of protected-route list

key-files:
  created: []
  modified:
    - apps/web/src/types/dashboard.ts
    - apps/mobile/src/types/index.ts
    - apps/web/src/components/dashboard/stats-cards.tsx
    - apps/web/src/app/(dashboard)/dashboard/page.tsx
    - apps/mobile/src/pages/Dashboard.tsx
    - apps/web/src/middleware.ts
    - apps/web/src/app/(auth)/login/page.tsx
    - apps/backend/.env.example

key-decisions:
  - 'Suspense boundary wrapping LoginForm sub-component isolates useSearchParams for Next.js 14 static prerender compatibility'
  - 'lg:grid-cols-5 for stats grid to accommodate 5th Pending Purchases card cleanly'
  - 'Text-only purchases summary card on mobile (no icon) — cleaner at mobile density'

patterns-established:
  - 'Deny-by-default middleware: maintain isPublicRoute whitelist, not isProtectedRoute list — all new routes protected automatically'
  - 'useSearchParams in Next.js 14 must be in a component wrapped by Suspense; extract form logic into sub-component'

requirements-completed:
  - DASH-01
  - DASH-02
  - AUTH-03

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 7 Plan 02: Frontend Type Alignment, Purchases KPI, and Deny-by-Default Auth Summary

**Aligned frontend DashboardResponse type with backend, added Pending Purchases KPI to web and mobile dashboards, and replaced isProtectedRoute whitelist with deny-by-default !isPublicRoute middleware with returnTo redirect chain.**

## Performance

- **Duration:** ~6 min
- **Started:** 2026-03-02T16:38:14Z
- **Completed:** 2026-03-02T16:43:37Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- DashboardResponse type now includes `purchases: { pendingOrders, pendingValue }` in both web and mobile — backend data no longer silently dropped
- Web dashboard shows 5 KPI cards including Pending Purchases (Truck icon, amber color) in lg:grid-cols-5 grid
- Mobile dashboard shows full-width Purchases summary card between stats grid and weekly summary section
- Auth middleware changed from isProtectedRoute (only /dashboard) to deny-by-default !isPublicRoute — articles, orders, inventory, sales, purchases, settings all now protected
- Login page reads returnTo query param and redirects there after successful authentication
- DATABASE_URL documented in backend .env.example with PostgreSQL placeholder

## Task Commits

Each task was committed atomically:

1. **Task 1: Align frontend types and add purchases KPI to both dashboards** - `327f698` (feat)
2. **Task 2: Implement deny-by-default auth middleware with returnTo redirect** - `450ca4e` (feat)
3. **Task 3: Add DATABASE_URL to backend .env.example** - `5fe49fd` (chore)

## Files Created/Modified

- `apps/web/src/types/dashboard.ts` - Added `purchases` field to DashboardResponse interface
- `apps/mobile/src/types/index.ts` - Added `purchases` field to DashboardResponse interface
- `apps/web/src/components/dashboard/stats-cards.tsx` - Added purchases prop, 5th KPI card (Truck icon, amber), grid to lg:grid-cols-5
- `apps/web/src/app/(dashboard)/dashboard/page.tsx` - Pass `data.purchases` to StatsCards
- `apps/mobile/src/pages/Dashboard.tsx` - Destructure purchases, add full-width pending purchases summary card
- `apps/web/src/middleware.ts` - Remove isProtectedRoute; deny-by-default with returnTo on redirect
- `apps/web/src/app/(auth)/login/page.tsx` - Extract LoginForm into Suspense-wrapped sub-component; read returnTo from searchParams
- `apps/backend/.env.example` - Add DATABASE_URL with placeholder connection string

## Decisions Made

- **Suspense boundary for useSearchParams:** Next.js 14 requires useSearchParams to be inside a Suspense boundary for static prerendering to succeed. Extracted the full login form into a `LoginForm` sub-component (still in same file), wrapped by `<Suspense fallback={<div className="animate-pulse" />}>` in the default export. No separate file needed.
- **lg:grid-cols-5 for web stats grid:** Clean 5-column layout for the 5 KPI cards (Total Revenue, Total Orders, Total Products, Total Sales, Pending Purchases).
- **Text-only purchases card on mobile:** Plan gave discretion on icon vs text-only. Text-only chosen for cleaner appearance at mobile density.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Suspense boundary around useSearchParams in login page**

- **Found during:** Task 2 (middleware and login page update)
- **Issue:** Next.js 14 static prerendering fails when a page component uses `useSearchParams()` without a Suspense boundary — build errored: "useSearchParams() should be wrapped in a suspense boundary at page /login"
- **Fix:** Extracted the login form JSX and logic into a `LoginForm` named component within the same file, then wrapped it in `<Suspense>` in the default `LoginPage` export
- **Files modified:** `apps/web/src/app/(auth)/login/page.tsx`
- **Verification:** `turbo build --filter=@objetiva/web` passed clean with /login showing as static (○)
- **Committed in:** `450ca4e` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix required for Next.js 14 compatibility. No scope creep — same functionality, just correct component structure.

## Issues Encountered

None beyond the Suspense boundary fix documented above.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All frontend types now match backend DB schema — OrderSheet and PurchaseSheet will receive complete data
- Purchases KPI visible on both web and mobile dashboards
- All authenticated routes protected by deny-by-default middleware
- returnTo redirect chain complete — users land at originally requested page after login
- Phase 7 integration bug fixes complete; ready for Phase 8 or final verification

---

_Phase: 07-fix-integration-bugs_
_Completed: 2026-03-02_
