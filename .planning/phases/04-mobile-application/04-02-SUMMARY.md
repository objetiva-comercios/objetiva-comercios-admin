---
phase: 04-mobile-application
plan: 02
subsystem: ui
tags: [navigation, layout, bottom-tabs, drawer, dashboard, tanstack-query, react-router]

# Dependency graph
requires:
  - phase: 04-01
    provides: HashRouter, SplashGate, useAuth, fetchWithAuth, types, Supabase client, QueryClientProvider
provides:
  - AppShell layout composing header + content + bottom tabs + drawer
  - BottomTabs with 4 primary sections and NavLink active highlighting
  - AppHeader with hamburger trigger and dynamic route-based title
  - DrawerNav slide-in from left with secondary nav and logout
  - Dashboard page with KPI cards, weekly summary, low stock alerts, recent orders
  - SplashGate updated to use AppShell layout route pattern
affects:
  - 04-03 (data pages render inside AppShell via Outlet — nav shell complete)
  - 04-04 (settings/profile page already wired as PlaceholderPage inside AppShell)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - 'NavLink isActive pattern: active tab/drawer item highlighted with text-primary'
    - 'Layout route pattern: Route with element=<AppShell/> and no path wraps child routes via Outlet'
    - 'Drawer backdrop pattern: conditional fixed overlay + CSS translate for slide-in animation'
    - 'Skeleton loading pattern: animate-pulse divs matching visual structure of real content'
    - 'Intl.NumberFormat pattern: currency formatting without date-fns dependency'
    - 'useNavigate for programmatic navigation inside event handlers (logout, view all links)'

key-files:
  created:
    - apps/mobile/src/components/layout/BottomTabs.tsx
    - apps/mobile/src/components/layout/AppHeader.tsx
    - apps/mobile/src/components/layout/DrawerNav.tsx
    - apps/mobile/src/components/layout/AppShell.tsx
    - apps/mobile/src/pages/Dashboard.tsx
  modified:
    - apps/mobile/src/components/auth/SplashGate.tsx

key-decisions:
  - 'Layout route pattern over per-route AppShell wrapping: single Route with no path shares AppShell across all authenticated routes'
  - 'Conditional backdrop rendering: render backdrop div only when open=true avoids invisible click target when drawer closed'
  - 'Intl.NumberFormat over date-fns: keeps mobile bundle lean; currency formatting does not require a library'
  - 'formatRelativeTime helper function: simple minutes/hours/days logic avoids date-fns import for relative time'
  - 'ESLint react/no-unescaped-entities: apostrophes in JSX text must use HTML entities (&apos;) — caught by pre-commit hook'

# Metrics
duration: 3min
completed: 2026-03-01
---

# Phase 4 Plan 02: Navigation Shell & Dashboard Summary

**Bottom tabs + slide-in drawer nav shell with AppShell layout route and Dashboard KPI page using TanStack Query**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-01T22:52:47Z
- **Completed:** 2026-03-01T22:55:53Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Built 4-component navigation shell: BottomTabs (4 tabs with NavLink active state), AppHeader (dynamic title via useLocation + hamburger trigger), DrawerNav (left slide-in with backdrop and logout), AppShell (layout route composing all three with useState drawer control)
- Updated SplashGate to use AppShell layout route pattern — all authenticated routes render via Outlet
- Built Dashboard page with 2x2 KPI grid, weekly summary strip, low stock alerts list, and recent orders list
- Dashboard uses TanStack Query useQuery with fetchWithAuth for typed backend data fetching
- Loading skeletons, error state with retry, currency formatting, and relative timestamps implemented

## Task Commits

Each task was committed atomically:

1. **Task 1: Build layout components — AppShell, BottomTabs, AppHeader, DrawerNav** - `fe66b01` (feat)
2. **Task 2: Build Dashboard page with KPI cards and mobile-optimized layout** - `3225b83` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/mobile/src/components/layout/BottomTabs.tsx` - Fixed bottom bar, 4 NavLink tabs with isActive highlighting
- `apps/mobile/src/components/layout/AppHeader.tsx` - Sticky header, hamburger button, dynamic title via useLocation
- `apps/mobile/src/components/layout/DrawerNav.tsx` - Left slide-in drawer, backdrop overlay, nav items, logout via supabase.auth.signOut()
- `apps/mobile/src/components/layout/AppShell.tsx` - Root layout: header + Outlet + BottomTabs + DrawerNav with useState
- `apps/mobile/src/pages/Dashboard.tsx` - Dashboard with KPI cards, weekly summary, low stock alerts, recent orders, loading/error states
- `apps/mobile/src/components/auth/SplashGate.tsx` - Updated to use AppShell layout route and Dashboard import

## Decisions Made

- Layout route pattern (Route with no path, element=AppShell) wraps all authenticated child routes — cleaner than repeating AppShell in each route
- Conditional backdrop: only rendered when drawer is open, preventing invisible click targets
- Intl.NumberFormat instead of date-fns for currency: avoids adding a library for formatting only
- Simple inline formatRelativeTime helper: minutes/hours/days relative time without extra dependencies

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint react/no-unescaped-entities: apostrophes in JSX text**

- **Found during:** Task 2 (pre-commit hook)
- **Issue:** "Today's Revenue" and "Today's Sales" JSX text contained unescaped apostrophes, which react/no-unescaped-entities ESLint rule rejects
- **Fix:** Replaced `'` with `&apos;` HTML entities in both labels
- **Files modified:** `apps/mobile/src/pages/Dashboard.tsx`
- **Commit:** Included in `3225b83` after fix

---

**Total deviations:** 1 auto-fixed (1 ESLint entity escape)
**Impact on plan:** Minimal. Single-character fix. No scope changes.

## Self-Check: PASSED
