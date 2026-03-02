---
phase: 06-polish-production
plan: 02
subsystem: ui
tags: [react, error-boundary, capacitor, offline, tanstack-query, next-js]

# Dependency graph
requires:
  - phase: 03-web-frontend-development
    provides: Web dashboard sections (dashboard, articles, orders, inventory, sales, purchases, settings) with page.tsx files
  - phase: 04-mobile-application
    provides: Mobile app with SplashGate routing, AppShell layout, TanStack Query setup
provides:
  - Per-section error boundaries for all 7 web dashboard routes via error.tsx convention
  - Mobile SectionErrorFallback component for react-error-boundary integration
  - Mobile offline detection hook using @capacitor/network
  - OfflineBanner component auto-dismissing on reconnect
  - TanStack Query exponential backoff retry configuration
affects: [06-03-frontend-loading-states, 06-04-production-build]

# Tech tracking
tech-stack:
  added:
    - react-error-boundary@6.1.1 (mobile error boundary wrapper)
    - "@capacitor/network@8.0.1 (native iOS/Android connectivity detection)"
  patterns:
    - Next.js App Router error.tsx convention for per-section error isolation
    - react-error-boundary FallbackComponent pattern for mobile page error handling
    - @capacitor/network over navigator.onLine for native connectivity reliability
    - Exponential backoff retry: Math.min(1000 * 2 ** attemptIndex, 30000)

key-files:
  created:
    - apps/web/src/app/(dashboard)/dashboard/error.tsx
    - apps/web/src/app/(dashboard)/articles/error.tsx
    - apps/web/src/app/(dashboard)/orders/error.tsx
    - apps/web/src/app/(dashboard)/inventory/error.tsx
    - apps/web/src/app/(dashboard)/sales/error.tsx
    - apps/web/src/app/(dashboard)/purchases/error.tsx
    - apps/web/src/app/(dashboard)/settings/error.tsx
    - apps/mobile/src/components/ui/SectionErrorFallback.tsx
    - apps/mobile/src/hooks/useNetworkStatus.ts
    - apps/mobile/src/components/OfflineBanner.tsx
  modified:
    - apps/mobile/src/components/auth/SplashGate.tsx
    - apps/mobile/src/components/layout/AppShell.tsx
    - apps/mobile/src/main.tsx
    - apps/mobile/package.json

key-decisions:
  - "react-error-boundary FallbackComponent pattern: wraps individual page Route elements, not the AppShell layout route, so navigation shell stays functional on page errors"
  - "@capacitor/network over navigator.onLine: navigator.onLine unreliable on native iOS/Android; Capacitor Network plugin uses native connectivity APIs"
  - "Thin yellow banner (not modal) for offline state: non-intrusive, auto-dismisses on reconnect by returning null when isOnline"
  - "Optimistic default isOnline=true: avoids false offline flash on app startup before getStatus() resolves"

patterns-established:
  - "Web error boundary pattern: error.tsx in each route directory, 'use client', useEffect logs error, friendly UI with AlertCircle + retry Button"
  - "Mobile error boundary pattern: ErrorBoundary FallbackComponent=SectionErrorFallback wrapping each Route element in SplashGate"
  - "Network status pattern: useNetworkStatus hook abstracts @capacitor/network, returns {isOnline} boolean"
  - "Exponential backoff: Math.min(1000 * 2 ** attemptIndex, 30000) caps at 30s max delay"

requirements-completed: [AUTH-06]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 6 Plan 02: Error Resilience Summary

**Per-section error boundaries for 7 web dashboard routes plus mobile offline detection with @capacitor/network, thin yellow OfflineBanner, and TanStack Query exponential backoff retry**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T14:47:07Z
- **Completed:** 2026-03-02T14:51:00Z
- **Tasks:** 3
- **Files modified:** 13

## Accomplishments

- Created 7 web error.tsx files (one per dashboard section) using Next.js App Router error boundary convention — each section now fails independently without crashing the whole page
- Installed react-error-boundary and wrapped all 8 mobile page routes in ErrorBoundary with SectionErrorFallback, keeping AppShell/navigation functional during page errors
- Added @capacitor/network offline detection with useNetworkStatus hook, thin OfflineBanner component, and TanStack Query exponential backoff retry (1s, 2s, 4s... capped at 30s)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create web error.tsx files for all 7 dashboard sections** - `6fa7cfb` (feat)
2. **Task 2: Add mobile error boundaries with react-error-boundary** - `5341769` (feat)
3. **Task 3: Add mobile offline detection, banner, and TanStack Query retry** - `8b66fef` (feat)

## Files Created/Modified

- `apps/web/src/app/(dashboard)/dashboard/error.tsx` - Dashboard section error boundary with retry
- `apps/web/src/app/(dashboard)/articles/error.tsx` - Articles section error boundary with retry
- `apps/web/src/app/(dashboard)/orders/error.tsx` - Orders section error boundary with retry
- `apps/web/src/app/(dashboard)/inventory/error.tsx` - Inventory section error boundary with retry
- `apps/web/src/app/(dashboard)/sales/error.tsx` - Sales section error boundary with retry
- `apps/web/src/app/(dashboard)/purchases/error.tsx` - Purchases section error boundary with retry
- `apps/web/src/app/(dashboard)/settings/error.tsx` - Settings section error boundary with retry
- `apps/mobile/src/components/ui/SectionErrorFallback.tsx` - Reusable mobile error fallback with "Try again"
- `apps/mobile/src/hooks/useNetworkStatus.ts` - Network connectivity hook using @capacitor/network
- `apps/mobile/src/components/OfflineBanner.tsx` - Thin yellow banner shown when offline, auto-dismisses on reconnect
- `apps/mobile/src/components/auth/SplashGate.tsx` - Added ErrorBoundary wrapping all 8 authenticated page routes
- `apps/mobile/src/components/layout/AppShell.tsx` - Added OfflineBanner between header and main content
- `apps/mobile/src/main.tsx` - Added retryDelay exponential backoff to QueryClient config
- `apps/mobile/package.json` - Added react-error-boundary@6.1.1 and @capacitor/network@8.0.1

## Decisions Made

- react-error-boundary wraps individual page Route elements (not AppShell) so navigation shell stays functional when a page throws
- @capacitor/network chosen over navigator.onLine — navigator.onLine unreliable on native iOS/Android, Capacitor uses native connectivity APIs
- Thin yellow banner (not modal) for offline indicator — non-intrusive, auto-dismisses when isOnline returns true
- Optimistic default isOnline=true prevents false offline flash on startup before getStatus() resolves

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Web and mobile error resilience complete; ready for Phase 6 Plan 03 (loading states polish)
- Both apps build successfully with zero TypeScript errors
- Mobile app bundle includes @capacitor/network — requires `npx cap sync` for native builds to include the plugin

---

_Phase: 06-polish-production_
_Completed: 2026-03-02_
