---
phase: 04-mobile-application
plan: 01
subsystem: ui
tags: [capacitor, react-router, tanstack-query, supabase, vite, tailwind, mobile]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: monorepo structure, @objetiva/ui package with design tokens
  - phase: 02-backend-api-with-mock-data
    provides: REST API endpoints consumed by mobile fetchWithAuth
  - phase: 03-web-frontend-development
    provides: CSS variable design tokens and auth patterns to mirror
provides:
  - Capacitor config for native iOS/Android builds (webDir: dist)
  - Supabase browser client singleton with session persistence
  - Mobile fetchWithAuth API client using Supabase JWT
  - useAuth hook with onAuthStateChange reactive auth state
  - useTheme hook with system preference and localStorage persistence
  - Login and Signup pages with mobile-optimized touch targets
  - SplashGate auth gate with branded splash screen and route protection
  - App entry with HashRouter (Capacitor native compatible) and QueryClientProvider
  - All entity types matching web app contracts (Dashboard, Product, Order, Sale, Purchase, Inventory)
affects:
  - 04-02 (AppShell + bottom tabs + navigation - builds on this foundation)
  - 04-03 (Data pages - uses fetchWithAuth and types from this plan)
  - 04-04 (Settings/profile - uses useTheme hook from this plan)

# Tech tracking
tech-stack:
  added:
    - '@capacitor/core: native platform bridge'
    - '@capacitor/cli: native project tooling (devDep)'
    - '@capacitor/ios: iOS platform wrapper (devDep)'
    - '@capacitor/android: Android platform wrapper (devDep)'
    - 'react-router-dom: client-side routing with HashRouter'
    - '@tanstack/react-query: data fetching and caching'
    - '@tanstack/react-query-devtools: development tools (devDep)'
    - '@supabase/supabase-js: Supabase browser client (not ssr)'
    - 'react-intersection-observer: infinite scroll support'
    - 'lucide-react: icon library'
  patterns:
    - 'HashRouter pattern: required for Capacitor native file protocol compatibility'
    - 'onAuthStateChange pattern: reactive auth state (fires with cached session on mount)'
    - 'persistSession: true: token survives app restarts on native devices'
    - 'gcTime/staleTime pattern: TanStack Query v5 naming (gcTime was cacheTime in v4)'
    - 'CSS variable-based Tailwind colors: hsl(var(--name)) enables dark mode switching'
    - 'refetchOnWindowFocus: false: prevents excessive refetches on mobile app switching'

key-files:
  created:
    - apps/mobile/capacitor.config.ts
    - apps/mobile/src/lib/supabase.ts
    - apps/mobile/src/lib/api.ts
    - apps/mobile/src/hooks/useAuth.ts
    - apps/mobile/src/hooks/useTheme.ts
    - apps/mobile/src/types/index.ts
    - apps/mobile/src/pages/Login.tsx
    - apps/mobile/src/pages/Signup.tsx
    - apps/mobile/src/components/auth/SplashGate.tsx
    - apps/mobile/.env
    - apps/mobile/.env.example
  modified:
    - apps/mobile/package.json
    - apps/mobile/src/index.css
    - apps/mobile/tailwind.config.ts
    - apps/mobile/src/App.tsx
    - apps/mobile/src/main.tsx

key-decisions:
  - 'HashRouter over BrowserRouter: Capacitor native uses file:// protocol where BrowserRouter fails'
  - '@supabase/supabase-js over @supabase/ssr: mobile is client-side only, no server rendering'
  - 'onAuthStateChange over getSession: fires synchronously with cached session and handles token refresh'
  - '@capacitor/ios and @capacitor/android as devDependencies: platform wrappers not needed for browser dev'
  - 'No npx cap add ios/android: native project generation requires macOS/Android Studio on developer machine'
  - 'useTheme without next-themes: Vite app needs manual implementation of dark mode toggle'

patterns-established:
  - 'SplashGate pattern: single auth gate component handles loading/unauthenticated/authenticated states'
  - 'PlaceholderPage pattern: all routes immediately functional, replaced by real pages in subsequent plans'
  - 'CSS variable color pattern: Tailwind colors use hsl(var(--name)) format for dark mode support'

requirements-completed: [MONO-05, MONO-06, UI-04]

# Metrics
duration: 5min
completed: 2026-03-01
---

# Phase 4 Plan 01: Mobile App Foundation Summary

**Capacitor-configured Vite/React mobile app with Supabase auth (HashRouter, SplashGate, Login/Signup) and full design token system matching web app**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-01T22:44:01Z
- **Completed:** 2026-03-01T22:48:57Z
- **Tasks:** 3
- **Files modified:** 15

## Accomplishments

- Installed all Phase 4 dependencies: Capacitor, react-router-dom, TanStack Query v5, Supabase JS, lucide-react
- Created complete auth infrastructure: Supabase singleton, fetchWithAuth API client, useAuth hook, useTheme hook
- Built Login/Signup pages with branded layout, 44px touch targets, loading states, and error handling
- Wired app entry with HashRouter (Capacitor-compatible) + QueryClientProvider + SplashGate auth gate
- Replaced CSS variable system to exactly match web app design tokens with dark mode support

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, configure Capacitor, and set up CSS/env foundation** - `06675de` (feat)
2. **Task 2: Create auth infrastructure, API client, and type definitions** - `9eab794` (feat)
3. **Task 3: Create auth pages, SplashGate, and wire app entry point** - `6b2d27a` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `apps/mobile/capacitor.config.ts` - Capacitor config with appId, appName, webDir: 'dist', iOS scheme
- `apps/mobile/src/lib/supabase.ts` - Supabase browser client singleton with autoRefresh and persistSession
- `apps/mobile/src/lib/api.ts` - fetchWithAuth API client with JWT header injection via getSession
- `apps/mobile/src/hooks/useAuth.ts` - Auth state hook using onAuthStateChange subscription
- `apps/mobile/src/hooks/useTheme.ts` - Theme hook with system preference detection and localStorage
- `apps/mobile/src/types/index.ts` - All entity type definitions (12 interfaces) matching web app contracts
- `apps/mobile/src/pages/Login.tsx` - Login page with email/password, Supabase signInWithPassword
- `apps/mobile/src/pages/Signup.tsx` - Signup page with email confirmation flow and password validation
- `apps/mobile/src/components/auth/SplashGate.tsx` - Auth gate with branded splash and route protection
- `apps/mobile/src/App.tsx` - App root with HashRouter wrapping SplashGate
- `apps/mobile/src/main.tsx` - Entry with QueryClientProvider (staleTime 5min, gcTime 30min)
- `apps/mobile/src/index.css` - Full CSS variable system with :root and .dark theme (matching web)
- `apps/mobile/tailwind.config.ts` - darkMode: 'class' with CSS variable-based colors
- `apps/mobile/.env` + `.env.example` - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_API_URL

## Decisions Made

- HashRouter required for Capacitor: native file:// protocol breaks BrowserRouter path matching
- @supabase/supabase-js (not @supabase/ssr): mobile is purely client-side, no SSR
- onAuthStateChange instead of getSession: fires synchronously with cached session on mount, handles token refresh
- @capacitor/ios and @capacitor/android as devDependencies only: native builds happen on developer machines

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Built @objetiva/ui package before mobile build**

- **Found during:** Task 3 (build verification)
- **Issue:** `apps/mobile/tailwind.config.ts` imports `@objetiva/ui/tokens` which required compiled output in `packages/ui/dist/tokens/`. The dist directory was missing.
- **Fix:** Ran `pnpm --filter @objetiva/ui build` to compile TypeScript to dist/
- **Files modified:** packages/ui/dist/ (generated, not committed - in .gitignore)
- **Verification:** `pnpm --filter @objetiva/mobile build` succeeds with 138 modules transformed
- **Committed in:** (build artifact, not committed)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Auto-fix essential for build verification. No scope creep.

## Issues Encountered

- @objetiva/ui dist/ was not pre-built. Resolved by running `pnpm --filter @objetiva/ui build`. This is expected in a fresh checkout workflow and should be documented for developer onboarding.

## User Setup Required

None - no external service configuration required beyond updating `.env` with actual Supabase credentials when connecting to a live project.

## Next Phase Readiness

- Mobile app foundation fully ready for Plan 02 (AppShell + bottom tabs + navigation)
- All routes defined as placeholders, ready to be replaced with real page components
- HashRouter, QueryClientProvider, SplashGate, and auth hooks all in place
- Type definitions match web app contracts exactly, ensuring API response compatibility

---

_Phase: 04-mobile-application_
_Completed: 2026-03-01_

## Self-Check: PASSED

All created files verified on disk. All task commits verified in git history.

- FOUND: apps/mobile/capacitor.config.ts
- FOUND: apps/mobile/src/lib/supabase.ts
- FOUND: apps/mobile/src/lib/api.ts
- FOUND: apps/mobile/src/hooks/useAuth.ts
- FOUND: apps/mobile/src/hooks/useTheme.ts
- FOUND: apps/mobile/src/types/index.ts
- FOUND: apps/mobile/src/pages/Login.tsx
- FOUND: apps/mobile/src/pages/Signup.tsx
- FOUND: apps/mobile/src/components/auth/SplashGate.tsx
- FOUND: .planning/phases/04-mobile-application/04-01-SUMMARY.md
- FOUND commit: 06675de (Task 1)
- FOUND commit: 9eab794 (Task 2)
- FOUND commit: 6b2d27a (Task 3)
