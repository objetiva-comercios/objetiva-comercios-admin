# Phase 6: Polish & Production - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Harden the application for production: error boundaries, loading states, RBAC enforcement, responsive refinements, form validation, performance optimization, and mobile offline handling. All data sections remain read-only — CRUD forms are a separate phase.

</domain>

<decisions>
## Implementation Decisions

### RBAC Role Model

- Two roles: **Admin** (full access) and **Viewer** (read-only)
- Roles stored in Supabase user metadata (`app_metadata.role`), already extracted from JWT by `JwtAuthGuard`
- Enforcement at **backend only** — NestJS guards reject unauthorized API calls with 403. Frontend shows everything; security comes from the API layer
- No in-app user management UI — admins assign roles via Supabase dashboard
- Default role for new signups: Viewer

### Error Display & Recovery

- **Inline error + retry** pattern — error message replaces the failed component with a retry button; rest of the page stays functional
- Error boundaries wrap each route/section independently (not one global boundary)
- **Friendly messages only** — no technical details exposed to users. Errors logged to console for developers
- **Auto-retry 2-3 times** on failed data fetches with exponential backoff before showing error state

### Mobile Offline Behavior

- **Banner + stale data** approach — show "Offline" banner at top when connection lost
- Display last-fetched data from cache while offline
- Disable actions that require network (form submits, navigation that triggers new API calls)
- Auto-dismiss banner and re-sync when connection restored

### Form Validation

- **No new CRUD forms** — data sections stay read-only. Validation focuses on existing forms (auth + settings)
- Add password strength indicator on signup
- Tighten email format validation on login
- **Shared validation approach** — same rules, same error messages on web and mobile
- Shared zod schemas where practical (from `packages/types` or a shared validation package)

### Settings Expansion

- Add **business settings form** (company name, address, tax ID) alongside existing profile form
- Follows existing react-hook-form + zod pattern from `profile-form.tsx`

### Performance

- **Lazy routes + bundle optimization** — leverage Next.js automatic code splitting, optimize images, tree-shake unused imports
- Measure with Lighthouse to verify 3s on 3G target
- **No runtime monitoring** for v1 — optimize only, no analytics/tracking tools
- **Spot-check touch targets** on mobile — audit buttons, links, table rows, nav elements. Fix anything under 44px
- Current loading skeletons (web `loading.tsx` per route, mobile `Skeleton`/`CardSkeleton`) are sufficient — no major rework needed

### Claude's Discretion

- Error boundary component design and structure
- Exact retry backoff timing and configuration
- Offline caching strategy implementation (React Query cache, localStorage, etc.)
- Bundle optimization specifics (which imports to tree-shake, image formats)
- How to structure shared validation schemas across packages
- Business settings form field details beyond the core fields mentioned

</decisions>

<specifics>
## Specific Ideas

- RBAC should feel invisible to admins (no restrictions) and clear to viewers (disabled buttons or read-only indicators, not missing UI)
- Error states should be recoverable without navigating away from the current page
- Offline banner should be non-intrusive — thin bar at the top, not a modal

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `JwtAuthGuard` (`apps/backend/src/common/guards/jwt-auth.guard.ts`): Already extracts `role` from JWT — add role-checking logic here
- `HttpExceptionFilter` (`apps/backend/src/common/filters/http-exception.filter.ts`): Consistent error JSON responses — extend for RBAC 403s
- `@Public()` decorator pattern: Existing mechanism to mark routes — create similar `@Roles()` decorator
- `Skeleton`/`CardSkeleton` (`apps/mobile/src/components/ui/Skeleton.tsx`): Reusable for mobile loading states
- `loading.tsx` files in web routes: Already provide route-level loading skeletons
- `profile-form.tsx`: Establishes react-hook-form + zod + shadcn Form pattern for all new forms
- `useToast` hook: Available for non-critical notifications

### Established Patterns

- Web: Next.js App Router with `loading.tsx` per route for Suspense-based loading
- Web: shadcn/ui components with dark theme support
- Mobile: React (Vite) + Capacitor with custom UI components
- Backend: NestJS guards + decorators + filters pattern
- Auth: Supabase Auth with JWT validation, role field in `AuthenticatedUser` type
- Forms: react-hook-form + zodResolver + shadcn Form components (web)
- Types: `@objetiva/types` exports `User` (with `role: string`) and `ApiResponse<T>`

### Integration Points

- Backend: New `@Roles()` guard integrates alongside existing `JwtAuthGuard` in NestJS module setup
- Web: Error boundaries wrap in `app/(dashboard)/layout.tsx` or per-route layouts
- Mobile: Offline detection hooks into app-level providers
- Shared types: Role enum/type should go in `packages/types`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 06-polish-production_
_Context gathered: 2026-03-02_
