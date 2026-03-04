---
phase: 03
plan: 02
subsystem: web-auth
tags: [auth, supabase, react-hook-form, zod, nextjs]
requires: [03-01]
provides: [signup-page, login-page, auth-callback, auth-redirects]
affects: [03-03, 03-04]
tech-stack:
  added: []
  patterns: [auth-redirect-middleware, email-confirmation-flow]
key-files:
  created:
    - apps/web/src/app/(auth)/signup/page.tsx
    - apps/web/src/app/auth/callback/route.ts
  modified:
    - apps/web/src/app/page.tsx
    - apps/web/src/middleware.ts
decisions:
  - id: AUTH-REDIRECT-PATTERN
    choice: Middleware-based auth state redirects
    rationale: Centralized auth logic prevents authenticated users from accessing auth pages and vice versa
  - id: SIGNUP-CONFIRMATION
    choice: Email confirmation via callback route
    rationale: Standard Supabase pattern with emailRedirectTo handling code exchange
metrics:
  duration: 31min
  completed: 2026-01-25
---

# Phase 3 Plan 02: Authentication Pages Summary

**One-liner:** Complete auth flow with signup/login pages, email confirmation callback, and middleware-based route protection

## What Was Built

### Authentication Pages

1. **Signup Page** (`/signup`)
   - Email, password, and password confirmation fields
   - Zod schema validation (min 8 chars, password match)
   - React Hook Form integration
   - Email confirmation toast messaging
   - Supabase `signUp` integration with email redirect
   - Proper window.location handling for SSR compatibility

2. **Auth Callback Route** (`/auth/callback`)
   - GET handler for email confirmation codes
   - Exchanges code for session via Supabase
   - Redirects to dashboard on success
   - Error handling with redirect to login

### Routing & Protection

3. **Root Page Redirect** (`/`)
   - Server-side auth check
   - Authenticated users → `/dashboard`
   - Unauthenticated users → `/login`

4. **Middleware Enhancements**
   - Session refresh on every request
   - Public route protection (login, signup, auth/callback)
   - Protected route enforcement (dashboard)
   - Bidirectional redirects:
     - Authenticated + auth pages → dashboard
     - Unauthenticated + protected → login

## Key Implementation Details

### Form Validation (Signup)

```typescript
const signupSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })
```

### Email Redirect Handling

Used conditional window check for SSR compatibility:

```typescript
const origin = typeof window !== 'undefined' ? window.location.origin : ''
const emailRedirectTo = origin ? `${origin}/auth/callback` : undefined
```

### Middleware Route Logic

```typescript
const isPublicRoute =
  pathname.startsWith('/login') ||
  pathname.startsWith('/signup') ||
  pathname.startsWith('/auth/callback')
const isProtectedRoute = pathname.startsWith('/dashboard')

// Bidirectional redirects
if (user && isPublicRoute && !pathname.startsWith('/auth/callback')) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
if (!user && isProtectedRoute) {
  return NextResponse.redirect(new URL('/login', request.url))
}
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ESLint regex escape complaint**

- **Found during:** Initial build
- **Issue:** ESLint no-useless-escape error on middleware matcher regex
- **Fix:** Simplified matcher pattern to `'/((?!api|_next/static|_next/image|favicon.ico).*)'`
- **Files modified:** `apps/web/src/middleware.ts`
- **Commit:** 71e1836

**2. [Rule 1 - Bug] TypeScript window undefined during build**

- **Found during:** Build compilation
- **Issue:** `Cannot find name 'window'` error in signup page
- **Fix:** Extracted window.location to runtime variable with typeof check
- **Files modified:** `apps/web/src/app/(auth)/signup/page.tsx`
- **Commit:** 71e1836

**3. [Rule 1 - Bug] Unused import in user-menu.tsx**

- **Found during:** Build lint phase
- **Issue:** `User` imported from lucide-react but never used
- **Fix:** Removed unused import
- **Files modified:** `apps/web/src/components/layout/user-menu.tsx`
- **Commit:** 71e1836 (via lint-staged)

## Testing Evidence

1. **Build Success:**

   ```
   ✓ Compiled successfully
   Tasks: 4 successful, 4 total
   ```

2. **Routes Generated:**
   - `/login` (3.3 kB) - Static pre-rendered
   - `/signup` (3.5 kB) - Static pre-rendered
   - `/auth/callback` (0 B) - Dynamic route
   - `/` (162 B) - Dynamic redirect

3. **Middleware Size:** 73.2 kB (includes Supabase SSR client)

## Requirements Coverage

| Requirement             | Status      | Evidence                                       |
| ----------------------- | ----------- | ---------------------------------------------- |
| AUTH-01 (Signup)        | ✅ Complete | Signup page with email/password/confirm        |
| AUTH-02 (Login)         | ✅ Complete | Login page already from 03-01                  |
| AUTH-03 (Session)       | ✅ Partial  | Middleware handles session refresh & redirects |
| AUTH-04 (Email Confirm) | ✅ Complete | Auth callback route exchanges codes            |

## Decisions Made

### AUTH-REDIRECT-PATTERN

**Decision:** Use middleware for centralized auth-based redirects
**Alternatives considered:**

- Client-side redirects in each page
- Route guards in layouts
  **Chosen because:**
- Single source of truth for auth logic
- Prevents flash of wrong content
- Cleaner than scattered useEffect checks

### SIGNUP-CONFIRMATION

**Decision:** Standard Supabase email confirmation flow with callback
**Alternatives considered:**

- OTP-based signup
- SMS verification
  **Chosen because:**
- Matches Supabase best practices
- No additional infrastructure needed
- Email is primary user identifier

## Next Phase Readiness

### Blockers

None. Authentication flow is complete.

### Concerns

1. **Email provider not configured:** Supabase email confirmation will fail without SMTP setup. Consider Supabase Auth UI for OAuth alternatives in production.
2. **Missing forgot password flow:** Login page has "Forgot password?" link but no implementation. Add in future plan if needed.

### Ready for Next Plan

✅ Yes - Dashboard pages can now assume authenticated user context

## Files Changed

### Created (2 files)

- `apps/web/src/app/(auth)/signup/page.tsx` (188 lines) - Signup form with validation
- `apps/web/src/app/auth/callback/route.ts` (21 lines) - Email confirmation handler

### Modified (2 files)

- `apps/web/src/app/page.tsx` (13 lines) - Changed from static demo to auth redirect
- `apps/web/src/middleware.ts` (69 lines) - Enhanced with auth-based route protection

## Commit History

| Commit  | Message                                                            | Files   |
| ------- | ------------------------------------------------------------------ | ------- |
| 71e1836 | feat(03-02): create signup page, auth callback, and auth redirects | 4 files |

## Performance Notes

- **Build time:** 46s (clean build)
- **Middleware overhead:** +73.2 kB to Next.js middleware bundle
- **Route load times:**
  - Login page: 201 kB First Load JS
  - Signup page: 202 kB First Load JS
  - Both include React Hook Form + Zod validators

## Lessons Learned

1. **SSR window handling:** Always guard `window` references with typeof check even in 'use client' components (they're still built server-side)
2. **Regex in Next.js config:** ESLint strict mode flags escaped dots in regex patterns; simplify matchers when possible
3. **Middleware complexity:** Auth logic in middleware is powerful but adds bundle size; monitor performance

---

_Generated: 2026-01-25_
_Phase: 3 of 6 | Plan: 2 of 4_
