# Phase 6: Polish & Production - Research

**Researched:** 2026-03-02
**Domain:** RBAC (NestJS), Error Boundaries (Next.js / React), Offline Detection (Capacitor), Form Validation (Zod v4), Performance (Next.js), Mobile UX polish
**Confidence:** HIGH

---

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**RBAC Role Model**

- Two roles: Admin (full access) and Viewer (read-only)
- Roles stored in Supabase user metadata (`app_metadata.role`), already extracted from JWT by `JwtAuthGuard`
- Enforcement at backend only — NestJS guards reject unauthorized API calls with 403. Frontend shows everything; security comes from the API layer
- No in-app user management UI — admins assign roles via Supabase dashboard
- Default role for new signups: Viewer

**Error Display & Recovery**

- Inline error + retry pattern — error message replaces the failed component with a retry button; rest of the page stays functional
- Error boundaries wrap each route/section independently (not one global boundary)
- Friendly messages only — no technical details exposed to users. Errors logged to console for developers
- Auto-retry 2-3 times on failed data fetches with exponential backoff before showing error state

**Mobile Offline Behavior**

- Banner + stale data approach — show "Offline" banner at top when connection lost
- Display last-fetched data from cache while offline
- Disable actions that require network (form submits, navigation that triggers new API calls)
- Auto-dismiss banner and re-sync when connection restored

**Form Validation**

- No new CRUD forms — data sections stay read-only. Validation focuses on existing forms (auth + settings)
- Add password strength indicator on signup
- Tighten email format validation on login
- Shared validation approach — same rules, same error messages on web and mobile
- Shared zod schemas where practical (from `packages/types` or a shared validation package)

**Settings Expansion**

- Add business settings form (company name, address, tax ID) alongside existing profile form
- Follows existing react-hook-form + zod pattern from `profile-form.tsx`

**Performance**

- Lazy routes + bundle optimization — leverage Next.js automatic code splitting, optimize images, tree-shake unused imports
- Measure with Lighthouse to verify 3s on 3G target
- No runtime monitoring for v1 — optimize only, no analytics/tracking tools
- Spot-check touch targets on mobile — audit buttons, links, table rows, nav elements. Fix anything under 44px
- Current loading skeletons (web `loading.tsx` per route, mobile `Skeleton`/`CardSkeleton`) are sufficient — no major rework needed

### Claude's Discretion

- Error boundary component design and structure
- Exact retry backoff timing and configuration
- Offline caching strategy implementation (React Query cache, localStorage, etc.)
- Bundle optimization specifics (which imports to tree-shake, image formats)
- How to structure shared validation schemas across packages
- Business settings form field details beyond the core fields mentioned

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>

## Phase Requirements

| ID      | Description                                          | Research Support                                                                                                                                                               |
| ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AUTH-06 | User roles and permissions system (RBAC) implemented | NestJS `@Roles()` decorator + `RolesGuard` pattern; `app_metadata.role` JWT claim extraction; Admin/Viewer enum in `packages/types`; `JwtAuthGuard.extractUser()` fix required |

</phase_requirements>

---

## Summary

Phase 6 hardens the application across three platforms (NestJS backend, Next.js web, React/Capacitor mobile) for production readiness. The six workstreams are: RBAC enforcement, error boundaries with retry, mobile offline detection, form validation tightening, business settings form, and performance optimization.

The most critical implementation detail is that the current `JwtAuthGuard.extractUser()` reads `payload.role` which always returns `"authenticated"` (the Postgres database role), NOT the custom app role. The guard must be updated to read `payload.app_metadata?.role` to get the custom Admin/Viewer role stored in Supabase `app_metadata`. This is the foundation everything else depends on.

Next.js 14 App Router has a native error boundary system via `error.tsx` files (one per route segment, automatically a Client Component, receives `{ error, reset }`). This is the correct mechanism for the web app — it integrates with Suspense and route-level code splitting. The mobile app (React/Vite/Capacitor) needs `@capacitor/network` (already a dependency via `@capacitor/core`) for native offline detection with a custom `useNetworkStatus` hook.

**Primary recommendation:** Fix the JWT role extraction bug first, then wire `RolesGuard` to all controllers, then add error boundaries per route, then offline banner, then form validation, then business settings form, then performance audit with Lighthouse.

---

## Standard Stack

### Core — Already Installed

| Library                 | Version  | Purpose                                          | Why Standard                                       |
| ----------------------- | -------- | ------------------------------------------------ | -------------------------------------------------- |
| `@nestjs/common`        | ^10.0.0  | `ForbiddenException`, `SetMetadata`, `UseGuards` | NestJS built-in RBAC primitives                    |
| `@nestjs/core`          | ^10.0.0  | `Reflector` for metadata retrieval               | NestJS DI pattern                                  |
| `zod`                   | ^4.3.6   | Schema validation (web)                          | Already in use via `react-hook-form + zodResolver` |
| `react-hook-form`       | ^7.71.1  | Form state + validation (web)                    | Already established via `profile-form.tsx`         |
| `@hookform/resolvers`   | ^5.2.2   | Zod adapter for react-hook-form                  | Already installed                                  |
| `@capacitor/core`       | ^8.1.0   | Includes Network plugin API                      | Already installed                                  |
| `@tanstack/react-query` | ^5.90.21 | Mobile data caching (stale data while offline)   | Already in mobile app                              |

### New — Needs Installation

| Library                 | Version | Purpose                                                                 | When to Use                                                                   |
| ----------------------- | ------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `react-error-boundary`  | ^5.0.0  | Error boundary component with `fallbackRender` and `resetErrorBoundary` | Mobile app error boundaries (Vite/React); web uses built-in `error.tsx` files |
| `@next/bundle-analyzer` | latest  | Webpack bundle visualization                                            | One-time performance audit to find bloat                                      |

**Note on web error boundaries:** Next.js 14 App Router provides `error.tsx` (native file-system error boundaries) — do NOT install `react-error-boundary` for the web app. Use it only for the mobile app.

**Note on `@capacitor/network`:** This is part of `@capacitor/core` ecosystem and must be installed separately. Check if already present.

### Alternatives Considered

| Instead of                       | Could Use                                              | Tradeoff                                                                                             |
| -------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| NestJS `@Roles()` + `RolesGuard` | Casl, Permit.io                                        | Over-engineering: two roles need simple guard, not policy engine                                     |
| `error.tsx` files (Next.js)      | `react-error-boundary` in web                          | `error.tsx` is the App Router native approach — integrates with Suspense automatically               |
| `@capacitor/network`             | Browser `navigator.onLine` / `online`/`offline` events | Browser events work in web view but `@capacitor/network` gives native-accurate status on iOS/Android |
| TanStack Query stale cache       | `localStorage` for offline data                        | TanStack Query cache is already integrated in mobile; stale data is automatic with `staleTime`       |

**Installation:**

```bash
# Mobile app — react-error-boundary
cd apps/mobile && pnpm add react-error-boundary

# Web app — bundle analyzer (devDependency)
cd apps/web && pnpm add -D @next/bundle-analyzer

# Capacitor Network plugin (if not already present)
cd apps/mobile && pnpm add @capacitor/network
```

---

## Architecture Patterns

### Recommended Project Structure Additions

```
apps/backend/src/common/
├── guards/
│   ├── jwt-auth.guard.ts      # MODIFY: fix app_metadata.role extraction
│   └── roles.guard.ts         # NEW: RolesGuard checks AuthenticatedUser.role
├── decorators/
│   ├── public.decorator.ts    # existing
│   └── roles.decorator.ts     # NEW: @Roles('admin') | @Roles('viewer')

apps/web/src/app/(dashboard)/
├── dashboard/
│   ├── error.tsx              # NEW: per-section error boundary
│   └── loading.tsx            # existing
├── articles/
│   └── error.tsx              # NEW
├── [each section]/
│   └── error.tsx              # NEW: 5 more sections

apps/web/src/components/settings/
└── business-form.tsx          # NEW: react-hook-form + zod business settings

apps/mobile/src/
├── hooks/
│   ├── useNetworkStatus.ts    # NEW: @capacitor/network hook
│   └── useAuth.ts             # existing
├── components/
│   └── OfflineBanner.tsx      # NEW: thin top bar
└── App.tsx                    # MODIFY: wrap with QueryClientProvider if not done

packages/types/src/
└── index.ts                   # MODIFY: add Role enum, validation schemas
```

---

### Pattern 1: RBAC — Fix JWT Role Extraction

**CRITICAL BUG:** The existing `JwtAuthGuard.extractUser()` reads `payload.role` which is always `"authenticated"` (the Supabase Postgres database role, NOT the custom app role). Custom roles live in `payload.app_metadata.role`.

**Fix in `jwt-auth.guard.ts`:**

```typescript
// Source: Supabase JWT documentation + code inspection
private extractUser(payload: any): AuthenticatedUser {
  return {
    userId: payload.sub ?? '',
    email: (payload.email as string) ?? '',
    // FIXED: read from app_metadata.role, not top-level role
    // Top-level payload.role is always "authenticated" (Postgres role)
    role: (payload.app_metadata?.role as string) ?? 'viewer',
  }
}
```

**Default:** Falls back to `'viewer'` when no `app_metadata.role` is set — safe default for new signups.

---

### Pattern 2: RBAC — @Roles() Decorator and RolesGuard

**`apps/backend/src/common/decorators/roles.decorator.ts`:**

```typescript
// Source: NestJS official guards documentation
import { SetMetadata } from '@nestjs/common'

export type AppRole = 'admin' | 'viewer'
export const ROLES_KEY = 'roles'
export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles)
```

**`apps/backend/src/common/guards/roles.guard.ts`:**

```typescript
// Source: NestJS official guards documentation
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY, AppRole } from '../decorators/roles.decorator'
import { AuthenticatedRequest } from '../../auth/auth.types'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No @Roles() decorator means open to all authenticated users
    if (!requiredRoles || requiredRoles.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>()
    const user = request.user

    if (!user) {
      throw new ForbiddenException('User not authenticated')
    }

    const hasRole = requiredRoles.includes(user.role as AppRole)
    if (!hasRole) {
      throw new ForbiddenException('Insufficient permissions')
    }

    return true
  }
}
```

**Usage on controllers (POST/PATCH/DELETE only — all GETs remain open to both roles):**

```typescript
// Source: NestJS official guards documentation
@Post()
@UseGuards(RolesGuard)
@Roles('admin')
create(@Body() dto: CreateProductDto) { ... }

@Patch(':id')
@UseGuards(RolesGuard)
@Roles('admin')
update(@Param('id') id: string, @Body() dto: UpdateProductDto) { ... }
```

**Note:** Since all data is currently read-only (no CRUD UI exists yet), applying `@Roles('admin')` to write endpoints is a forward-looking guard — all GET endpoints remain accessible to both roles.

---

### Pattern 3: Next.js Error Boundaries via `error.tsx`

**How it works (Next.js 14 App Router official docs):**

- `error.tsx` in a route segment automatically wraps that segment's `page.tsx` in a React error boundary
- MUST be a Client Component (`'use client'` required)
- Receives `{ error: Error & { digest?: string }, reset: () => void }` props
- `reset()` attempts to re-render the segment — calls backend again
- Errors bubble UP to the nearest `error.tsx` in the route hierarchy

**`apps/web/src/app/(dashboard)/[section]/error.tsx` pattern:**

```typescript
// Source: https://nextjs.org/docs/app/building-your-application/routing/error-handling
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for developers — never expose to users
    console.error('[Section Error]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <div>
        <h3 className="font-semibold text-lg">Something went wrong</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Unable to load this section. Please try again.
        </p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
```

**Create `error.tsx` for each section:** `dashboard`, `articles`, `orders`, `inventory`, `sales`, `purchases`, `settings` — all under `apps/web/src/app/(dashboard)/`.

---

### Pattern 4: Mobile Error Boundaries (react-error-boundary)

Mobile uses Vite/React without Next.js App Router, so `error.tsx` files do not apply. Use `react-error-boundary` package with `fallbackRender`:

```typescript
// Source: github.com/bvaughn/react-error-boundary
import { ErrorBoundary } from 'react-error-boundary'

function SectionFallback({
  error,
  resetErrorBoundary,
}: {
  error: Error
  resetErrorBoundary: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 gap-4">
      <p className="text-sm text-muted-foreground">Unable to load this section.</p>
      <button
        className="text-primary text-sm underline"
        onClick={resetErrorBoundary}
      >
        Try again
      </button>
    </div>
  )
}

// Wrap each page component in AppShell routing
<ErrorBoundary FallbackComponent={SectionFallback}>
  <Dashboard />
</ErrorBoundary>
```

**Retry with TanStack Query:** After `resetErrorBoundary()` triggers, TanStack Query re-runs the query. The `useQuery` result will re-fetch automatically.

---

### Pattern 5: Mobile Offline Detection (`@capacitor/network`)

**`apps/mobile/src/hooks/useNetworkStatus.ts`:**

```typescript
// Source: https://capacitorjs.com/docs/apis/network
import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    // Get initial status
    Network.getStatus().then(status => {
      setIsOnline(status.connected)
    })

    // Subscribe to changes
    const listenerPromise = Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected)
    })

    // Cleanup: remove listener on unmount
    return () => {
      listenerPromise.then(handle => handle.remove())
    }
  }, [])

  return { isOnline }
}
```

**`apps/mobile/src/components/OfflineBanner.tsx`:**

```typescript
import { useNetworkStatus } from '../hooks/useNetworkStatus'

export function OfflineBanner() {
  const { isOnline } = useNetworkStatus()

  if (isOnline) return null

  return (
    <div className="w-full bg-yellow-500 text-yellow-950 text-xs font-medium text-center py-1 px-3">
      No connection — showing cached data
    </div>
  )
}
```

**Integration:** Add `<OfflineBanner />` at the top of `AppShell` layout, above the main content area.

**TanStack Query stale data:** Mobile already uses TanStack Query. Configure with `staleTime` to keep data available when offline:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
      retry: 2, // Auto-retry 2 times before showing error
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    },
  },
})
```

---

### Pattern 6: Form Validation — Signup Password Strength

**Shared Zod schema in `packages/types/src/index.ts`:**

```typescript
// Source: Zod v4 documentation (zod.dev/api)
import { z } from 'zod'

export const emailSchema = z.string().email('Please enter a valid email address').toLowerCase()

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Must contain at least one number')

export const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
```

**Password strength indicator (inline — no library):** Track strength client-side with `watch()` from react-hook-form:

```typescript
// No additional library needed — compute strength from password value
const password = form.watch('password')

function getPasswordStrength(pwd: string): 'weak' | 'fair' | 'strong' {
  let score = 0
  if (pwd.length >= 8) score++
  if (/[A-Z]/.test(pwd)) score++
  if (/[0-9]/.test(pwd)) score++
  if (/[^A-Za-z0-9]/.test(pwd)) score++
  if (score <= 1) return 'weak'
  if (score <= 2) return 'fair'
  return 'strong'
}
```

---

### Pattern 7: Business Settings Form

The `business/page.tsx` currently exists with disabled inputs and a placeholder alert. Replace with a functional `react-hook-form + zod` form following the same pattern as `profile-form.tsx`.

Since there is no backend endpoint for business settings yet (the CONTEXT.md scope is read-only data sections), business settings should:

1. Store data to Supabase `user_metadata` (via `supabase.auth.updateUser({ data: { business: { name, address, tax_id } } })`) — same approach as profile
2. OR display an "in development" placeholder if backend business settings endpoint doesn't exist

**Decision for planner:** Use Supabase `user_metadata` for business settings storage — no new backend endpoint needed, consistent with the profile form approach.

---

### Pattern 8: Performance Optimization

**Next.js 14 built-in (no configuration needed):**

- Server Components automatic code-splitting per route ✅ already active
- Route prefetching via `<Link>` ✅ already in use
- Streaming via `loading.tsx` files ✅ already in all routes

**Add for this phase:**

**1. Bundle analysis:**

```javascript
// apps/web/next.config.mjs
import bundleAnalyzer from '@next/bundle-analyzer'
const withBundleAnalyzer = bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })
export default withBundleAnalyzer({
  /* existing config */
})

// Run: ANALYZE=true pnpm build
```

**2. Lazy-load heavy Client Components:**

```typescript
// Source: https://nextjs.org/docs/app/guides/lazy-loading
import dynamic from 'next/dynamic'

// Only if recharts is identified as a large bundle via analyzer
const SalesChart = dynamic(() => import('./sales-chart'), {
  loading: () => <Skeleton className="h-[350px]" />,
  ssr: false, // charts are client-only
})
```

**3. Lighthouse measurement (not CI — manual check):**

```bash
# Build production first
pnpm build && pnpm start
# Then run Chrome Lighthouse in DevTools → Throttling: Slow 3G
# Target: Performance score ≥ 70, LCP ≤ 3s
```

---

### Anti-Patterns to Avoid

- **Reading `payload.role` for app role:** This is the Postgres database role (`"authenticated"`), not the custom app role. Always use `payload.app_metadata?.role`.
- **Single global error boundary:** The CONTEXT.md explicitly rejects this. Each route section gets its own `error.tsx`.
- **Installing `react-error-boundary` in the web app:** Next.js 14 App Router has native `error.tsx` — using both adds confusion and duplication.
- **Using `navigator.onLine` in Capacitor:** Unreliable on native iOS/Android. Use `@capacitor/network` plugin.
- **Applying `@Roles('admin')` to GET endpoints:** All data is read-only for now. Only write endpoints (POST/PATCH/DELETE) need role enforcement, and those don't have UIs yet. Apply the decorator to write routes as a policy floor.
- **Exposing error details in user-facing messages:** Log to console only. Show friendly copy like "Unable to load this section."
- **Global `app.useGlobalGuards(new RolesGuard(...))` without `@Roles()` decorator:** If `RolesGuard` is registered globally, every unannotated route would be locked. The guard must return `true` when no `@Roles()` decorator is present.

---

## Don't Hand-Roll

| Problem                    | Don't Build                          | Use Instead                               | Why                                                                            |
| -------------------------- | ------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------ |
| Error boundaries in web    | Custom class component ErrorBoundary | `error.tsx` files (Next.js built-in)      | Next.js integrates with Suspense, route hierarchy, and Turbopack automatically |
| Error boundaries in mobile | Custom class component ErrorBoundary | `react-error-boundary` package            | Handles resetKeys, onError callback, TypeScript types                          |
| Network status detection   | `setInterval(() => fetch('/ping'))`  | `@capacitor/network`                      | Native platform events, no polling overhead, works offline                     |
| Password strength scoring  | Complex regex state machine          | Inline scoring function (4 lines)         | Problem is simple enough; no library needed                                    |
| TanStack Query retry logic | Custom fetch wrapper with setTimeout | `retry` + `retryDelay` QueryClient config | Built-in, respects error types, integrates with React lifecycle                |
| NestJS role enforcement    | Middleware or interceptor            | `@Roles()` + `RolesGuard`                 | Guards run after JwtAuthGuard, have access to decorated metadata               |

**Key insight:** The RBAC, error boundaries, and offline detection problems each have canonical solutions in the existing tech stack. The only new addition is `react-error-boundary` for mobile (1 package) and `@capacitor/network` (if not already installed).

---

## Common Pitfalls

### Pitfall 1: Wrong JWT Field for App Role

**What goes wrong:** `request.user.role` is always `"authenticated"` — RBAC checks always pass or always fail depending on comparison.
**Why it happens:** `payload.role` in Supabase JWT is the Postgres database role, not the custom application role. The current `JwtAuthGuard.extractUser()` reads the wrong field.
**How to avoid:** Extract from `payload.app_metadata?.role` with fallback to `'viewer'`. This is the critical fix that must happen before any RBAC enforcement works.
**Warning signs:** All users appear to have `role === 'authenticated'` in request.user, or RBAC decorator never blocks access.

### Pitfall 2: Global RolesGuard Blocking Unannotated Routes

**What goes wrong:** Registering `RolesGuard` globally in `main.ts` with `useGlobalGuards()` breaks all routes that don't have `@Roles()` — they throw 403.
**Why it happens:** Guard runs on every request; without `@Roles()` metadata, the reflector returns null/undefined, and naive guard implementations deny access.
**How to avoid:** The `canActivate()` method MUST return `true` when `requiredRoles` is null/empty. Keep `RolesGuard` as a `@UseGuards(RolesGuard)` decoration on individual controllers/methods, not globally registered.
**Warning signs:** Health check or login route starts returning 403.

### Pitfall 3: `error.tsx` Not Catching Async Data Fetch Errors

**What goes wrong:** Server Component throws during data fetch, but the error doesn't render the `error.tsx` fallback — instead the whole page breaks.
**Why it happens:** `error.tsx` wraps the page in a client-side error boundary, but the server-side rendering error must be thrown during rendering, not in a `useEffect`. Server Components that `throw` propagate correctly. Using `try/catch` that swallows the error bypasses the boundary.
**How to avoid:** In Server Components, let the `fetch` error propagate (don't try/catch). The `error.tsx` boundary will catch it and display the retry UI.
**Warning signs:** Page shows blank instead of the error fallback.

### Pitfall 4: `navigator.onLine` Unreliable on Capacitor

**What goes wrong:** `navigator.onLine` returns `true` even when device has no internet (connected to WiFi but no internet access, or iOS behavior differences).
**Why it happens:** Browser-level API reports network interface status, not actual connectivity. Capacitor's native plugin uses platform-level connectivity APIs.
**How to avoid:** Always use `@capacitor/network` for offline detection in Capacitor apps. Falls back to browser API in web context.
**Warning signs:** Offline banner doesn't appear, or appears incorrectly.

### Pitfall 5: `react-error-boundary` v5 `'use client'` in Next.js

**What goes wrong:** Importing `react-error-boundary` in a Server Component (no `'use client'`) causes build error in Next.js.
**Why it happens:** `react-error-boundary` uses React hooks internally — it's a client-only library.
**How to avoid:** This is moot — use `error.tsx` (native Next.js) for the web app, not `react-error-boundary`. Only install `react-error-boundary` in the mobile app.
**Warning signs:** Build error: "You're importing a component that needs useState..." in web app.

### Pitfall 6: Zod v4 API Differences from v3

**What goes wrong:** `.email()` message, `.min()`, and `.superRefine()` behave slightly differently in Zod v4.
**Why it happens:** The project uses `zod ^4.3.6`. In v4, `ctx.path` is no longer available in `.superRefine()`. Use `.refine()` for simple cross-field checks (password confirm).
**How to avoid:** Use `.refine()` for confirmPassword check. Use `.regex()` for password pattern rules. Test schemas separately before wiring into forms.
**Warning signs:** TypeScript errors in shared `packages/types` when running `pnpm typecheck`.

---

## Code Examples

### Example 1: Register RolesGuard in NestJS (per-controller, not global)

```typescript
// Source: NestJS official documentation
import { Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'  // already global
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'

@Controller('products')
// JwtAuthGuard is already global — don't add it again
export class ProductsController {
  @Get()
  findAll() { ... }  // Both admin and viewer can access

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin')
  create(@Body() dto: CreateProductDto) { ... }  // Admin only
}
```

### Example 2: `error.tsx` with retry — complete web pattern

```typescript
// Source: https://nextjs.org/docs/app/getting-started/error-handling
// apps/web/src/app/(dashboard)/dashboard/error.tsx
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="font-semibold text-lg">Unable to load dashboard</h3>
      <p className="text-muted-foreground text-sm">
        Something went wrong. Your data is safe.
      </p>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
```

### Example 3: useNetworkStatus hook with cleanup

```typescript
// Source: https://capacitorjs.com/docs/apis/network
// apps/mobile/src/hooks/useNetworkStatus.ts
import { useEffect, useState } from 'react'
import { Network } from '@capacitor/network'

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true)

  useEffect(() => {
    let cleanup: (() => void) | undefined

    Network.getStatus().then(status => {
      setIsOnline(status.connected)
    })

    Network.addListener('networkStatusChange', status => {
      setIsOnline(status.connected)
    }).then(handle => {
      cleanup = () => handle.remove()
    })

    return () => {
      cleanup?.()
    }
  }, [])

  return { isOnline }
}
```

### Example 4: QueryClient with retry + staleTime for offline

```typescript
// Source: TanStack Query v5 documentation
// apps/mobile/src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
})

// Wrap App:
// <QueryClientProvider client={queryClient}><App /></QueryClientProvider>
```

### Example 5: Business settings form (new component)

```typescript
// apps/web/src/components/settings/business-form.tsx
// Follows exact same pattern as profile-form.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'

const businessFormSchema = z.object({
  company_name: z.string().min(2, 'Company name must be at least 2 characters'),
  address: z.string().optional(),
  tax_id: z.string().optional(),
})

type BusinessFormValues = z.infer<typeof businessFormSchema>

export function BusinessForm({ initialValues }: { initialValues: BusinessFormValues }) {
  const { toast } = useToast()
  const form = useForm<BusinessFormValues>({
    resolver: zodResolver(businessFormSchema),
    defaultValues: initialValues,
  })

  async function onSubmit(values: BusinessFormValues) {
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      data: { business: values },
    })
    if (error) {
      toast({ title: 'Error', description: 'Failed to save settings.', variant: 'destructive' })
    } else {
      toast({ title: 'Saved', description: 'Business settings updated.' })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* company_name, address, tax_id fields */}
        <Button type="submit">Save changes</Button>
      </form>
    </Form>
  )
}
```

---

## State of the Art

| Old Approach                           | Current Approach                                 | When Changed                               | Impact                                                       |
| -------------------------------------- | ------------------------------------------------ | ------------------------------------------ | ------------------------------------------------------------ |
| Class-based Error Boundary component   | `error.tsx` file convention (Next.js App Router) | Next.js 13.0 (2022)                        | No boilerplate; integrates with Suspense and route hierarchy |
| Global error boundary at app root      | Per-route `error.tsx` files                      | Next.js 13.0                               | Other sections stay functional when one fails                |
| Manual fetch retry logic               | TanStack Query `retry` + `retryDelay` config     | TanStack Query v4 (2022)                   | Exponential backoff out-of-the-box                           |
| `navigator.onLine` for offline         | `@capacitor/network`                             | Capacitor v4 (2022)                        | Native platform accuracy on iOS/Android                      |
| `payload.role` for app role (Supabase) | `payload.app_metadata.role`                      | Always — this is a bug in the current code | RBAC cannot work without this fix                            |

**Deprecated/outdated:**

- `react-error-boundary` in Next.js App Router pages: Superseded by `error.tsx`. Still valid for Vite/React (mobile app).
- Registering guards globally without null-check on metadata: Pattern causes all unannotated routes to fail.

---

## Open Questions

1. **Does the mobile app have `QueryClientProvider` wrapping?**
   - What we know: `@tanstack/react-query` is in `apps/mobile/package.json`. The `App.tsx` only shows `<HashRouter><SplashGate /></HashRouter>`.
   - What's unclear: Whether `QueryClientProvider` is already added somewhere between the SplashGate and page components, or if it needs to be added in `main.tsx`.
   - Recommendation: Check `apps/mobile/src/main.tsx` during planning. If missing, add `QueryClientProvider` in Wave 0 of the plan.

2. **Is `@capacitor/network` already installed in the mobile app?**
   - What we know: `@capacitor/core` ^8.1.0 is in `apps/mobile/package.json`, but `@capacitor/network` is a separate package.
   - What's unclear: Whether it was installed separately.
   - Recommendation: `pnpm add @capacitor/network` as part of Wave 0 setup. If already present, it's a no-op.

3. **Business settings storage: Supabase `user_metadata` vs. new backend endpoint?**
   - What we know: CONTEXT.md says add business settings form. No backend endpoint for business settings exists. Profile form stores to Supabase `user_metadata`.
   - What's unclear: Whether business settings should persist to Supabase or await a backend `settings` table.
   - Recommendation: Use Supabase `user_metadata` (`data.business` field) — same as profile. This avoids a new backend endpoint, is consistent, and can be migrated to a proper settings table in a future phase.

4. **Supabase `app_metadata.role` population — is the hook configured?**
   - What we know: CONTEXT.md says admins assign roles via Supabase dashboard. The JWT fix will read `app_metadata.role`.
   - What's unclear: Whether the Supabase project already has a Custom Access Token Hook configured to propagate `app_metadata.role` into the JWT, or whether admins manually update it via dashboard.
   - Recommendation: Document in phase that setting `app_metadata.role` via Supabase dashboard (Auth > Users > Edit) is sufficient — Supabase includes `app_metadata` in the JWT automatically without a hook. The hook is only needed for dynamic role lookups from a DB table.

---

## Sources

### Primary (HIGH confidence)

- Next.js official docs (lastUpdated: 2026-02-27) — error handling, `error.tsx`, production checklist: https://nextjs.org/docs/app/getting-started/error-handling, https://nextjs.org/docs/app/guides/production-checklist
- NestJS official guards documentation — `Reflector.getAllAndOverride`, `SetMetadata`, `RolesGuard` pattern: https://docs.nestjs.com/guards
- Supabase JWT fields documentation — `app_metadata` vs. top-level `role` distinction: https://supabase.com/docs/guides/auth/jwt-fields
- Capacitor Network API documentation — `getStatus()`, `addListener('networkStatusChange')`: https://capacitorjs.com/docs/apis/network
- Codebase inspection — `jwt-auth.guard.ts`, `auth.types.ts`, `profile-form.tsx`, package.json files

### Secondary (MEDIUM confidence)

- react-error-boundary GitHub (bvaughn) — v5/v6 API: `ErrorBoundary`, `fallbackRender`, `FallbackComponent`, `resetErrorBoundary`: https://github.com/bvaughn/react-error-boundary
- Supabase Custom Access Token Hook docs — app_metadata role claim population: https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook
- NestJS RBAC implementation gist (Ajay-Maury) — cross-verifies official docs pattern: https://gist.github.com/Ajay-Maury/711cb15073ea6de3796a9f389e16e959
- TanStack Query v5 `retry` + `retryDelay` defaults — cross-verified with known v5 API

### Tertiary (LOW confidence — needs validation)

- Zod v4 `superRefine` behavior change (`ctx.path` removed) — from search results, not directly verified against official Zod v4 changelog
- Password strength scoring pattern — from community examples; logic is simple enough to verify by testing

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages already installed except `react-error-boundary` (mobile) and `@next/bundle-analyzer`; verified from `package.json` files
- Architecture: HIGH — Next.js `error.tsx` pattern verified from official 2026-02-27 docs; NestJS guard pattern verified from official docs; Capacitor network verified from official docs
- RBAC bug finding: HIGH — code inspection confirms `payload.role` extraction is wrong; Supabase JWT structure verified from official docs
- Pitfalls: HIGH — all pitfalls derived from code inspection + official docs; not speculative
- Offline detection: HIGH — Capacitor Network API verified from official docs

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (30 days; Next.js 14 stable, NestJS 10 stable, Capacitor 8 stable)
