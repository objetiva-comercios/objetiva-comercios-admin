# Deferred Items — Phase 10

## Pre-existing TypeScript Errors (Out-of-scope)

Discovered during 10-02 type migration. These errors existed before plan execution.

### SplashGate.tsx — FallbackProps type mismatch (8 occurrences)

**File:** `apps/mobile/src/components/auth/SplashGate.tsx` (lines 53, 61, 69, 77, 85, 93, 101, 109)

**Error:** `SectionErrorFallbackProps.error` is typed as `Error` but `react-error-boundary`'s `FallbackProps.error` is `unknown`. This causes type incompatibility when passing `SectionErrorFallbackProps` components as `fallbackRender` props.

**Fix:** Update `SectionErrorFallbackProps.error` from `Error` to `unknown`, or cast the error in the fallback component.

### Login.tsx / Signup.tsx — ZodError.errors property missing

**Files:** `apps/mobile/src/pages/Login.tsx` (line 20), `apps/mobile/src/pages/Signup.tsx` (line 22)

**Error:** `Property 'errors' does not exist on type 'ZodError<...>'` — likely a Zod version API change where `.errors` is no longer the property name.

**Fix:** Use `result.error.issues` instead of `result.error.errors` (Zod v3 uses `.issues`).
