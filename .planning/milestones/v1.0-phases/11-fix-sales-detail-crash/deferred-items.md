# Phase 11 — Deferred Items

## Pre-existing Out-of-Scope Issues

### Mobile SplashGate TypeScript Error

**File:** `apps/mobile/src/components/auth/SplashGate.tsx`
**Discovered during:** Phase 11 Plan 01 — Task 2 verification
**Status:** Pre-existing, confirmed via `git stash` test (error exists before plan changes)

**Issue:** `SectionErrorFallbackProps` types `error` as `Error`, but `FallbackProps` from `react-error-boundary` types `error` as `unknown`. This mismatch causes 8 TypeScript errors in SplashGate.tsx across all ErrorBoundary `FallbackComponent` prop usages.

**Error pattern:**

```
src/components/auth/SplashGate.tsx(53,28): error TS2322: Type '...SectionErrorFallbackProps...'
is not assignable to type 'ComponentType<FallbackProps> | undefined'.
Types of property 'error' are incompatible.
  Type 'unknown' is not assignable to type 'Error'.
```

**Fix:** Change `SectionErrorFallbackProps.error` from `Error` to `unknown` (or use type narrowing at call sites).

**Deferred because:** Unrelated to sales detail crash fix. Does not affect sales feature functionality. Should be addressed in a future code quality phase.
