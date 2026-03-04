# Phase 4: Mobile Application - Research

**Researched:** 2026-03-01
**Domain:** Capacitor + React + Vite mobile app with bottom-tab/drawer navigation, TanStack Query infinite scroll, Supabase client-side auth
**Confidence:** HIGH (core stack), MEDIUM (Capacitor routing quirk, bottom sheet patterns)

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Navigation structure**

- Bottom tabs (4): Dashboard, Articles, Orders, Inventory
- Drawer navigation for secondary items: Sales, Purchases, Profile, Settings, Logout
- Drawer triggered by hamburger menu icon on the left side of the header
- Active tab highlighted with primary brand color (consistent with web sidebar active state)
- Header shows dynamic page title that changes per section (e.g., "Dashboard", "Articles")
- Navigation is always visible — tabs and drawer are NOT context-dependent

**Data display**

- Card-based layout for all data lists (Articles, Orders, Sales, Purchases, Inventory)
- Each card shows key info: name/title, price/amount, status badge, secondary metadata
- Tapping a card opens a bottom sheet with full item details (dismissible by swipe down)
- Horizontal scrollable filter chips at the top of each list section
- Infinite scroll pagination — auto-loads more items as user scrolls down

**UI component approach**

- Tailwind CSS only — build mobile-specific components from scratch
- No Ionic or third-party mobile UI frameworks
- Share design tokens from @objetiva/ui (colors, spacing, typography via `cn` utility)
- React Router v6 for client-side navigation
- TanStack Query (React Query) for data fetching, caching, and infinite scroll support
- Dark mode supported from day one — follow system preference with toggle in Settings

**Auth & session**

- Login screen: centered card with Objetiva brand logo at top, email/password fields
- Full Login + Signup flows on mobile (matching web auth capabilities)
- Supabase client-side auth with auto-persist session in localStorage
- Session checked on app launch — valid session goes to Dashboard, expired refreshes token, no session goes to Login
- Branded splash screen with Objetiva logo + spinner while checking auth state on launch

### Claude's Discretion

- Exact card layout dimensions and spacing
- Bottom sheet component implementation details
- Loading skeleton designs for lists and dashboard
- Error state handling and retry UI
- Splash screen animation/transition
- Pull-to-refresh implementation details
- Capacitor plugin selection and configuration

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                         | Research Support                                                                                                  |
| ------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| NAV-01  | Mobile app displays bottom tabs for primary sections (Dashboard, Articles, Orders, Inventory)       | Tailwind-only fixed bottom tab bar component, React Router v6 `<Routes>` with index redirect                      |
| NAV-02  | Mobile app displays drawer navigation from header for secondary actions (Profile, Settings, Logout) | Slide-in drawer component using Tailwind transform/translate with React state; overlay backdrop                   |
| NAV-04  | Navigation is consistent and NOT context-dependent across platforms                                 | Layout wrapper renders tabs + drawer regardless of route; no conditional rendering based on page state            |
| NAV-05  | Layout includes header with app name and user menu                                                  | Sticky header component with hamburger trigger, dynamic title via `useLocation()`                                 |
| NAV-06  | Layout includes content area that adapts to navigation                                              | `flex-1 overflow-y-auto` content area above fixed bottom tabs; `pb-safe` padding-bottom for iPhone home indicator |
| NAV-07  | All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings)     | Tab sections as routes; drawer sections as additional routes; all wired in React Router config                    |
| UI-04   | Mobile and web feel cohesive despite platform-specific implementations                              | Shared `@objetiva/ui` design tokens (colors, spacing, CSS variables); same status badge color semantics           |
| MONO-05 | Mobile app (apps/mobile) builds and runs in browser                                                 | Vite dev server already configured at port 5173; React Router HashRouter works in browser too                     |
| MONO-06 | Mobile app can be built for iOS/Android via Capacitor                                               | Capacitor 7/8 installed in apps/mobile; `capacitor.config.ts` with `webDir: 'dist'`; `npx cap add ios android`    |

</phase_requirements>

---

## Summary

Phase 4 delivers the iOS/Android mobile application by adding Capacitor to the existing Vite + React skeleton at `apps/mobile`. The skeleton already has Tailwind, `@objetiva/ui` tokens, and the `@objetiva/types`/`@objetiva/utils` packages wired up. The core work is: (1) adding Capacitor and configuring it for native builds, (2) building the navigation shell (bottom tabs + header + drawer), (3) implementing Supabase browser client auth with a splash-screen gate, and (4) building card-list views with TanStack Query infinite scroll for all six sections.

The most important architectural decision is **HashRouter over BrowserRouter**. Capacitor serves the app from the local file system on native platforms (iOS uses `capacitor://localhost`, Android uses `http://localhost`). BrowserRouter relies on the HTML5 History API in ways that require a real HTTP server; HashRouter uses the URL hash (`#`) and works reliably in file-based environments. HashRouter also works identically in the Vite browser dev environment, making it the correct choice for all environments.

The web app's `fetchWithAuth` pattern uses `@supabase/ssr`'s `createBrowserClient` — the mobile app must use the base `@supabase/supabase-js` `createClient` directly (no SSR wrapper needed). Supabase's `persistSession: true` (the default) stores the token in `localStorage`, which survives app restarts. `onAuthStateChange` drives the auth gate: it fires synchronously on mount with the cached session, enabling the splash screen to resolve without a network round-trip in the common case.

**Primary recommendation:** Install Capacitor 7/8 + HashRouter + TanStack Query 5 + Supabase JS. Build all components from Tailwind only. Consume the same backend endpoints as web. The skeleton is already 80% wired; this phase is mostly component-level work on top of a working foundation.

---

## Standard Stack

### Core

| Library                 | Version               | Purpose                                   | Why Standard                                                                             |
| ----------------------- | --------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------- |
| `@capacitor/core`       | ^7.x or ^8.x          | Native iOS/Android runtime bridge         | Official Capacitor; works with Vite out of the box since day one                         |
| `@capacitor/cli`        | ^7.x or ^8.x (devDep) | CLI for `cap sync`, `cap add`, `cap open` | Required CLI tooling for all Capacitor workflows                                         |
| `@capacitor/ios`        | match core            | iOS platform wrapper                      | Required to generate the Xcode project                                                   |
| `@capacitor/android`    | match core            | Android platform wrapper                  | Required to generate the Android Studio project                                          |
| `react-router-dom`      | ^6.x                  | Client-side routing with HashRouter       | Locked decision; HashRouter required for Capacitor native file loading                   |
| `@tanstack/react-query` | ^5.x                  | Data fetching, caching, infinite scroll   | Locked decision; `useInfiniteQuery` maps directly to backend `{ data, meta }` pagination |
| `@supabase/supabase-js` | ^2.x                  | Browser-side auth client                  | Mobile has no server, so base JS client (not `@supabase/ssr`) is correct                 |

### Supporting

| Library                          | Version | Purpose                                              | When to Use                                                |
| -------------------------------- | ------- | ---------------------------------------------------- | ---------------------------------------------------------- |
| `react-intersection-observer`    | ^9.x    | Trigger `fetchNextPage` when scroll sentinel visible | Paired with `useInfiniteQuery` for zero-JS infinite scroll |
| `@tanstack/react-query-devtools` | ^5.x    | Query inspection during dev                          | Dev-only; omit from production builds                      |

### Alternatives Considered

| Instead of                    | Could Use                         | Tradeoff                                                                                                                                                                 |
| ----------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HashRouter                    | BrowserRouter                     | BrowserRouter fails on native file:// / capacitor:// protocol — do not use for Capacitor native targets                                                                  |
| Custom ThemeProvider          | `next-themes`                     | `next-themes` is Next.js-oriented; for Vite/React use a custom hook with `localStorage` + `window.matchMedia` + `.dark` class on `<html>` — simpler, no extra dependency |
| `react-intersection-observer` | Native `IntersectionObserver` ref | The library handles cleanup, SSR safety, and options memoization; worth 1KB                                                                                              |
| `@supabase/supabase-js`       | `@supabase/ssr`                   | `@supabase/ssr` is for server-side rendering; incorrect for Vite/mobile client-only context                                                                              |

**Installation (in `apps/mobile`):**

```bash
# From monorepo root, targeting apps/mobile
pnpm --filter @objetiva/mobile add @capacitor/core @capacitor/ios @capacitor/android
pnpm --filter @objetiva/mobile add -D @capacitor/cli
pnpm --filter @objetiva/mobile add react-router-dom @tanstack/react-query @supabase/supabase-js react-intersection-observer
pnpm --filter @objetiva/mobile add -D @tanstack/react-query-devtools

# Then initialize Capacitor inside apps/mobile
cd apps/mobile
npx cap init "Objetiva Comercios" "com.objetiva.comercios" --web-dir=dist
npx cap add ios
npx cap add android
```

---

## Architecture Patterns

### Recommended Project Structure

```
apps/mobile/
├── capacitor.config.ts      # Capacitor config (appId, appName, webDir: 'dist')
├── ios/                     # Generated by cap add ios (commit to git)
├── android/                 # Generated by cap add android (commit to git)
├── src/
│   ├── main.tsx             # App entry: QueryClientProvider + HashRouter + ThemeProvider
│   ├── App.tsx              # Routes definition + auth gate
│   ├── index.css            # Tailwind directives + CSS variables (light + .dark)
│   ├── lib/
│   │   ├── supabase.ts      # createClient() — browser Supabase client singleton
│   │   └── api.ts           # fetchWithAuth<T>() — mobile client-side equivalent
│   ├── hooks/
│   │   ├── useAuth.ts       # useEffect + onAuthStateChange; exposes { user, loading }
│   │   └── useTheme.ts      # localStorage + system pref + .dark class toggle
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx     # Root layout: header + content area + bottom tabs
│   │   │   ├── BottomTabs.tsx   # Fixed 4-tab bar with active highlight
│   │   │   ├── AppHeader.tsx    # Sticky header with title + hamburger button
│   │   │   └── DrawerNav.tsx    # Slide-in drawer with overlay backdrop
│   │   ├── ui/
│   │   │   ├── BottomSheet.tsx  # Swipe-dismiss detail sheet
│   │   │   ├── FilterChips.tsx  # Horizontal scrollable chip row
│   │   │   ├── Card.tsx         # Base mobile card component
│   │   │   ├── StatusBadge.tsx  # Color-semantic badge (reuse web palette)
│   │   │   └── Skeleton.tsx     # Loading skeleton variants
│   │   └── auth/
│   │       └── SplashGate.tsx   # Renders splash while auth resolves; routes after
│   └── pages/
│       ├── Login.tsx
│       ├── Signup.tsx
│       ├── Dashboard.tsx
│       ├── Articles.tsx
│       ├── Orders.tsx
│       ├── Inventory.tsx
│       ├── Sales.tsx
│       ├── Purchases.tsx
│       ├── Profile.tsx
│       └── Settings.tsx
```

### Pattern 1: Capacitor Configuration

**What:** `capacitor.config.ts` at `apps/mobile/` root. The `webDir` must match Vite's output directory (`dist`). The `appId` follows reverse domain notation.

**Example:**

```typescript
// Source: https://capacitorjs.com/docs/config
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.objetiva.comercios',
  appName: 'Objetiva Comercios',
  webDir: 'dist',
  ios: {
    scheme: 'App',
  },
}

export default config
```

### Pattern 2: App Entry with HashRouter

**What:** The app root wraps everything in `HashRouter`, `QueryClientProvider`, and a `ThemeInitializer`. This order matters — TanStack Query context must wrap all pages, HashRouter must wrap the auth gate.

**Example:**

```typescript
// Source: React Router v6 docs + Capacitor routing guidance
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SplashGate } from './components/auth/SplashGate'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,    // 5 minutes
      gcTime: 1000 * 60 * 30,      // 30 minutes
      retry: 2,
      refetchOnWindowFocus: false, // mobile: no window focus events
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <SplashGate />
      </HashRouter>
    </QueryClientProvider>
  )
}
```

### Pattern 3: Supabase Browser Client + Auth Gate

**What:** A single `createClient()` singleton for the whole mobile app. `useAuth` hook subscribes to `onAuthStateChange` and exports `{ user, loading }`. `SplashGate` renders splash until `loading` resolves, then routes to Login or AppShell.

**Example:**

```typescript
// lib/supabase.ts
// Source: https://context7.com/supabase/supabase-js/llms.txt
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true, // default true — survives app restart
      detectSessionInUrl: true, // handles OAuth callbacks
    },
  }
)

// hooks/useAuth.ts
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // onAuthStateChange fires synchronously with cached session on mount
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

### Pattern 4: Mobile API Client (fetchWithAuth)

**What:** Client-side equivalent of the web's `fetchWithAuth`. Gets token from Supabase session (no server, no SSR). Uses `import.meta.env.VITE_API_URL`.

**Example:**

```typescript
// lib/api.ts — mirrors web/src/lib/api.ts but client-side
import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3001'

export async function fetchWithAuth<T>(endpoint: string): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`
  }
  const res = await fetch(`${API_BASE}/api${endpoint}`, { headers })
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`)
  return res.json()
}
```

### Pattern 5: Infinite Scroll with useInfiniteQuery

**What:** The backend returns `{ data: T[], meta: { total, page, limit, totalPages } }`. Map page index to query params. Use `react-intersection-observer` to trigger next page when sentinel enters view.

**Example:**

```typescript
// Source: https://context7.com/tanstack/query/llms.txt
import { useInfiniteQuery } from '@tanstack/react-query'
import { useInView } from 'react-intersection-observer'
import { useEffect } from 'react'
import { fetchWithAuth } from '../lib/api'

const PAGE_SIZE = 20

function useInfiniteArticles(status?: string) {
  return useInfiniteQuery({
    queryKey: ['articles', { status }],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ page: String(pageParam), limit: String(PAGE_SIZE) })
      if (status) qs.set('status', status)
      return fetchWithAuth<PaginatedResponse<Product>>(`/products?${qs}`)
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.page < lastPage.meta.totalPages
        ? lastPage.meta.page + 1
        : undefined,
  })
}

function ArticleList() {
  const { ref, inView } = useInView()
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteArticles()

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="flex flex-col gap-3 p-4">
      {data?.pages.flatMap(page => page.data).map(article => (
        <ArticleCard key={article.id} article={article} />
      ))}
      {/* Invisible sentinel at the bottom */}
      <div ref={ref} className="h-1" />
      {isFetchingNextPage && <SkeletonCard />}
    </div>
  )
}
```

### Pattern 6: Dark Mode Without next-themes

**What:** For Vite/React (no Next.js), implement a custom ThemeProvider that checks `localStorage`, falls back to `window.matchMedia`, and toggles the `.dark` class on `<html>`. The CSS variables from the web app's `globals.css` are copied to `index.css`.

**Example:**

```typescript
// hooks/useTheme.ts
import { useState, useEffect } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getEffectiveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) ?? 'system'
  )

  useEffect(() => {
    const effective = getEffectiveTheme(theme)
    document.documentElement.classList.toggle('dark', effective === 'dark')
    localStorage.setItem('theme', theme)
  }, [theme])

  return { theme, setTheme }
}
```

The Tailwind config already has `darkMode: 'class'` — the web's CSS variable set (`:root` + `.dark`) is duplicated into `apps/mobile/src/index.css`.

### Pattern 7: Bottom Tab Bar

**What:** Fixed bottom bar with 4 tabs. Uses `useLocation()` from React Router to detect the active route. Safe-area padding accounts for iPhone home indicator.

**Example:**

```tsx
// components/layout/BottomTabs.tsx
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Package, ClipboardList, Warehouse } from 'lucide-react'
import { cn } from '@objetiva/ui'

const tabs = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Articles', href: '/articles', icon: Package },
  { label: 'Orders', href: '/orders', icon: ClipboardList },
  { label: 'Inventory', href: '/inventory', icon: Warehouse },
]

export function BottomTabs() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 bg-background border-t border-border
                    pb-safe flex"
    >
      {' '}
      {/* pb-safe = padding-bottom: env(safe-area-inset-bottom) */}
      {tabs.map(({ label, href, icon: Icon }) => (
        <NavLink
          key={href}
          to={href}
          className={({ isActive }) =>
            cn(
              'flex-1 flex flex-col items-center gap-1 py-2 text-xs transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )
          }
        >
          <Icon size={22} />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

### Anti-Patterns to Avoid

- **Using BrowserRouter:** Capacitor native targets load from file protocol. BrowserRouter's history API requires a real server. Use HashRouter exclusively.
- **Importing from `@supabase/ssr`:** The SSR package is for server environments (Next.js middleware). Mobile is client-only — import from `@supabase/supabase-js` directly.
- **Not adding `pb-safe` to the content area:** Without `padding-bottom: env(safe-area-inset-bottom)`, content scrolls behind the iPhone home indicator and the bottom tab bar overlaps it.
- **Calling `getSession()` for auth checks instead of `onAuthStateChange`:** `getSession()` can return a stale cached value; `onAuthStateChange` validates with the server and refreshes the token automatically.
- **Using Next.js patterns (server components, `use client`, `redirect()`):** This is a Vite/React SPA — all code is client-side. No server components, no `'use client'` directives, no `next/navigation`.

---

## Don't Hand-Roll

| Problem                       | Don't Build                                            | Use Instead                                                     | Why                                                                                   |
| ----------------------------- | ------------------------------------------------------ | --------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Infinite scroll detection     | Manual scroll event listener with debounce             | `react-intersection-observer` + `useInView`                     | IntersectionObserver is off-main-thread; scroll events are not                        |
| Token refresh                 | Manual JWT decode + setTimeout for refresh             | Supabase `autoRefreshToken: true` (default)                     | Handles expiry edge cases, app foreground events, race conditions                     |
| Query deduplication + caching | Custom fetch cache with Map                            | TanStack Query `QueryClient`                                    | Handles background refetch, stale-while-revalidate, deduplication, garbage collection |
| Swipe-to-dismiss gesture math | `touchstart`/`touchmove`/`touchend` with velocity calc | CSS `transition` + React state for sheet Y position (see below) | Start simple with CSS transform; use a library only if feel is inadequate             |

**Key insight:** The web's TanStack Table approach (rich table with sort/filter/pagination) is explicitly NOT reused on mobile. Mobile replaces it with card lists + infinite scroll — this is a deliberate divergence, not an omission.

---

## Common Pitfalls

### Pitfall 1: HashRouter URL in Capacitor vs Browser Dev

**What goes wrong:** Developers see `#/dashboard` in the URL bar in the browser dev server and assume something is wrong, then switch to BrowserRouter. This breaks native builds.
**Why it happens:** HashRouter is unfamiliar; BrowserRouter feels "more correct" for web.
**How to avoid:** Accept HashRouter as the correct choice for Capacitor. The hash is invisible to users on native (no visible URL bar). In browser dev it works fine.
**Warning signs:** Routing works in browser, crashes or shows blank screen on iOS simulator.

### Pitfall 2: Missing `webDir` in capacitor.config.ts

**What goes wrong:** `npx cap sync` copies nothing (or the wrong files) to native projects.
**Why it happens:** Capacitor defaults `webDir` to `www` (Angular default); Vite outputs to `dist`.
**How to avoid:** Explicitly set `webDir: 'dist'` in `capacitor.config.ts` immediately.
**Warning signs:** Blank white screen when running the app on simulator.

### Pitfall 3: Safe Area Insets on iPhone

**What goes wrong:** Content scrolls behind the tab bar or behind the iPhone notch/dynamic island.
**Why it happens:** The app renders full-screen in the WebView; CSS doesn't automatically account for native UI chrome.
**How to avoid:** Use `env(safe-area-inset-top/bottom/left/right)` CSS variables in the layout. The mobile skeleton's `index.css` already has `padding-top: env(safe-area-inset-top)` on `body`. Add `padding-bottom: env(safe-area-inset-bottom)` to the bottom tab bar. Add `viewport-fit=cover` to the `<meta name="viewport">` tag.
**Warning signs:** Content appears cut off or overlapping with tab bar on physical iPhone.

### Pitfall 4: Drawer Transparency on Dark Mode

**What goes wrong:** The slide-in drawer renders with a transparent or incorrect background.
**Why it happens:** Without explicit `bg-background` class, the element inherits the parent WebView background.
**How to avoid:** Always add `bg-background` to the drawer panel element (same fix as the web's Sheet component issue documented in STATE.md from Phase 3).
**Warning signs:** Drawer appears semi-transparent or shows page content through it.

### Pitfall 5: Environment Variables with Vite (`import.meta.env`)

**What goes wrong:** `process.env.NEXT_PUBLIC_*` references from the web app are copied without change, causing `undefined` at runtime.
**Why it happens:** Vite uses `import.meta.env.VITE_*` (not `process.env`). Next.js uses `process.env.NEXT_PUBLIC_*`.
**How to avoid:** All mobile env vars use the `VITE_` prefix and are accessed via `import.meta.env.VITE_SUPABASE_URL` etc. Create `apps/mobile/.env` and `apps/mobile/.env.example`.
**Warning signs:** Supabase client throws "URL is required" error; API calls go to `undefined`.

### Pitfall 6: pnpm Workspace + Capacitor Native Platform Paths

**What goes wrong:** `npx cap add ios` or `npx cap sync` fails when run from the monorepo root.
**Why it happens:** Capacitor CLI expects to be run from the directory containing `capacitor.config.ts`.
**How to avoid:** Always run Capacitor CLI commands from `apps/mobile/`, not from the monorepo root. Add Turborepo tasks for `cap:build` (runs `vite build && cap sync`) as a wrapper script.
**Warning signs:** `Error: Cannot find capacitor.config.ts` when running from root.

### Pitfall 7: `refetchOnWindowFocus` on Mobile

**What goes wrong:** Queries refetch excessively when the user switches apps and returns (focus events fire).
**Why it happens:** TanStack Query's `refetchOnWindowFocus: true` default is web-oriented; on mobile, tab/app switching triggers it constantly.
**How to avoid:** Set `refetchOnWindowFocus: false` in the global `QueryClient` defaults. Use pull-to-refresh for manual refresh instead.

---

## Code Examples

Verified patterns from official sources:

### Capacitor Config (capacitor.config.ts)

```typescript
// Source: https://capacitorjs.com/docs/config
import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.objetiva.comercios',
  appName: 'Objetiva Comercios',
  webDir: 'dist',
  ios: {
    scheme: 'App',
  },
}

export default config
```

### Auth State Gate (SplashGate)

```tsx
// components/auth/SplashGate.tsx
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { AppShell } from '../layout/AppShell'

export function SplashGate() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        {/* Objetiva brand logo */}
        <div className="w-16 h-16 bg-primary rounded-xl mb-6" />
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    const isAuthRoute = ['/login', '/signup'].includes(location.pathname)
    return isAuthRoute ? <Outlet /> : <Navigate to="/login" replace />
  }

  // Logged in — show the app shell
  return <AppShell />
}
```

### Complete Route Config (App.tsx)

```tsx
// App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { SplashGate } from './components/auth/SplashGate'
import { Dashboard } from './pages/Dashboard'
import { Articles } from './pages/Articles'
import { Orders } from './pages/Orders'
import { Inventory } from './pages/Inventory'
import { Sales } from './pages/Sales'
import { Purchases } from './pages/Purchases'
import { Profile } from './pages/Profile'
import { Settings } from './pages/Settings'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'

export function App() {
  return (
    <Routes>
      {/* Auth routes (no shell) */}
      <Route element={<SplashGate />}>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Protected routes (inside AppShell with tabs + header) */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/articles" element={<Articles />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/purchases" element={<Purchases />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}
```

### Infinite Query with Page-based Pagination

```typescript
// Source: https://context7.com/tanstack/query/llms.txt + backend { data, meta } contract
import { useInfiniteQuery } from '@tanstack/react-query'
import { fetchWithAuth } from '../lib/api'

interface Meta {
  total: number
  page: number
  limit: number
  totalPages: number
}
interface PaginatedResponse<T> {
  data: T[]
  meta: Meta
}

export function useInfiniteList<T>(endpoint: string, params: Record<string, string> = {}) {
  return useInfiniteQuery<PaginatedResponse<T>>({
    queryKey: [endpoint, params],
    queryFn: ({ pageParam = 1 }) => {
      const qs = new URLSearchParams({ page: String(pageParam), limit: '20', ...params })
      return fetchWithAuth<PaginatedResponse<T>>(`${endpoint}?${qs}`)
    },
    initialPageParam: 1,
    getNextPageParam: last =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
  })
}
```

### CSS Variables for Dark Mode (index.css)

```css
/* Copy web's design tokens into mobile index.css */
/* Source: apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
  }
}

body {
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  font-family: Inter, system-ui, sans-serif;
  margin: 0;
  padding: 0;
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### Capacitor Build Workflow

```bash
# Development (browser) — standard Vite
pnpm --filter @objetiva/mobile dev

# Build + sync to native platforms
pnpm --filter @objetiva/mobile build   # outputs dist/
npx cap sync                           # copies dist/ to ios/ and android/ (run from apps/mobile)

# Open in native IDE
npx cap open ios      # Opens Xcode (requires macOS)
npx cap open android  # Opens Android Studio

# Live reload during native development
# Add to capacitor.config.ts temporarily (DO NOT commit):
# server: { url: 'http://192.168.x.x:5173', cleartext: true }
npx cap copy && npx cap open ios
```

---

## State of the Art

| Old Approach               | Current Approach                              | When Changed   | Impact                                                                              |
| -------------------------- | --------------------------------------------- | -------------- | ----------------------------------------------------------------------------------- |
| Ionic for Capacitor apps   | Capacitor standalone with any UI framework    | Capacitor 3+   | No framework lock-in; use pure Tailwind                                             |
| React Native for mobile    | Capacitor + web tech                          | Ongoing        | Shared web components; one codebase                                                 |
| Manual fetch + local state | TanStack Query v5 with `useInfiniteQuery`     | TQ v5 (2023)   | `initialPageParam` required (changed from v4); `maxPages` option for memory control |
| `cacheTime` (TQ v4)        | `gcTime` (TQ v5)                              | TQ v5          | Renamed; same concept; use `gcTime`                                                 |
| Capacitor 6                | Capacitor 7/8 (latest 8.1.0 as of March 2026) | Late 2024/2025 | All versions compatible with Vite + React; install latest stable                    |

**Deprecated/outdated:**

- `BrowserRouter` with Capacitor: Works in browser dev but not on native — use `HashRouter`.
- `@supabase/ssr` for mobile: Server-only; use `@supabase/supabase-js` directly.
- `cacheTime` in TanStack Query config: Renamed to `gcTime` in v5 — using the old name is silently ignored.
- `IonReactRouter`: Ionic's router wrapper; not needed without Ionic framework.

---

## Open Questions

1. **Capacitor version to target (7 vs 8)**
   - What we know: Latest stable is 8.1.0 (March 2026); Capacitor 7 introduced with breaking changes in 2024
   - What's unclear: Whether Capacitor 8 has any breaking changes for Vite + pnpm monorepo setup
   - Recommendation: Start with Capacitor 7.x (more documented community patterns) unless the install automatically resolves to 8. Align `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android` to the same major version.

2. **Bottom sheet swipe-to-dismiss: CSS-only or library?**
   - What we know: The decision is Claude's discretion. CSS `transform: translateY` + React state can implement a basic sheet. Full velocity-based dismissal requires touch gesture math.
   - What's unclear: Whether the CSS-only approach will feel native enough for the project's quality bar.
   - Recommendation: Start with CSS transform approach (translate Y based on drag delta, snap on touchend). Add `react-spring-bottom-sheet` only if the implementation feels janky after testing on a real device.

3. **Pull-to-refresh: native Capacitor plugin or custom CSS?**
   - What we know: Claude's discretion. There is no official `@capacitor/pull-to-refresh` plugin as of research date (GitHub discussion #5829 confirms this is a gap). Custom implementation uses `touchstart`/`touchmove`/`touchend` events.
   - What's unclear: Whether the project needs the native spinner vs a custom CSS indicator.
   - Recommendation: Implement a simple custom pull-to-refresh hook with CSS spinner (matches web's loading patterns). This avoids a third-party plugin dependency.

4. **Monorepo Capacitor CLI path resolution**
   - What we know: `cap sync` must be run from the directory containing `capacitor.config.ts` (`apps/mobile/`).
   - What's unclear: Whether Turborepo tasks can wrap `cap sync` cleanly, or if a root-level npm script is simpler.
   - Recommendation: Add a `mobile:sync` script to the root `package.json` that `cd apps/mobile && npx cap sync`, and document it in the README.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not set in `.planning/config.json` (no `nyquist_validation` key present).

---

## Sources

### Primary (HIGH confidence)

- `/websites/capacitorjs` (Context7) — Capacitor config, platform setup, webDir, live reload, environment configs
- `/tanstack/query` (Context7) — `useInfiniteQuery` hook API, `QueryClient` setup, `initialPageParam`, `getNextPageParam`, `gcTime`
- `/supabase/supabase-js` (Context7) — `createClient` options, `onAuthStateChange`, `persistSession`, `autoRefreshToken`
- `/websites/reactrouter_6_30_3` (Context7) — `HashRouter`, `createHashRouter`, `NavLink`, `useLocation`, `Routes`/`Route` API
- `https://capacitorjs.com/docs/getting-started` — Installation steps, platform addition commands
- `https://capacitorjs.com/docs/config` — `CapacitorConfig` TypeScript interface, `webDir`, iOS scheme, Android config
- Project codebase: `apps/web/src/lib/api.ts`, `apps/web/src/lib/supabase/client.ts`, `apps/web/src/app/globals.css`, `apps/mobile/package.json`, `apps/mobile/vite.config.ts`

### Secondary (MEDIUM confidence)

- WebSearch: Capacitor Vite React HashRouter requirement for iOS/Android — confirmed by multiple community sources that file protocol requires HashRouter
- WebSearch: `@capacitor/core` latest version 8.1.0 as of March 2026 (npm)
- WebSearch: Dark mode implementation without `next-themes` for Vite/React (localStorage + `.dark` class pattern)
- `https://capacitorjs.com/solution/react` — React-specific setup confirmation

### Tertiary (LOW confidence)

- WebSearch: Bottom sheet gesture implementation — React community patterns; no single authoritative source; marked for validation on device

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — verified via Context7 and official Capacitor docs
- Architecture patterns: HIGH — derived from existing codebase patterns + official docs
- Capacitor routing (HashRouter): MEDIUM — multiple community sources confirm; no single official doc explicitly states "use HashRouter"; verified by understanding of file protocol behavior
- Bottom sheet / pull-to-refresh: MEDIUM — design patterns are clear; exact implementation feel requires device testing
- Pitfalls: HIGH for items sourced from STATE.md (already encountered in project); MEDIUM for Capacitor-specific pitfalls from community sources

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (Capacitor versions move; verify before adding platforms)
