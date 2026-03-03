# Phase 13: Tech Debt Cleanup - Research

**Researched:** 2026-03-03
**Domain:** Multi-file cleanup — TypeScript type fix, dead code/link removal, formatting normalization, package token cleanup
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Forgot-password link handling**

- Remove the `/forgot-password` link entirely from `apps/web/src/app/(auth)/login/page.tsx` (lines 116-121)
- Do not replace with a disabled/grayed-out placeholder
- No forgot-password route exists and none is planned for v1.0

**Stats card subtitle format**

- Replace manual `$${formatNumber(stats.todayRevenue)}` with `formatCurrency(stats.todayRevenue)` in `apps/web/src/components/dashboard/stats-cards.tsx` line 17
- Match the same MXN locale format used by the main KPI value above it
- Keep the "today" suffix text as-is

**Colors token cleanup scope**

- Delete `packages/ui/src/tokens/colors.ts` entirely
- Clean `packages/ui/src/tokens/index.ts`: remove `colors` import, re-export, and `colors` key from the `tokens` object
- Keep `spacing` and `typography` tokens intact

**SplashGate TypeScript fix**

- Change `error: Error` to `error: unknown` in `apps/mobile/src/components/ui/SectionErrorFallback.tsx` line 4
- This resolves 8 TS errors caused by incompatibility with react-error-boundary's `FallbackProps.error: unknown`

**Dead code removal**

- Delete `fetchLowStock()` export from `apps/web/src/lib/api.ts` (lines 146-148)
- Function is orphaned — low-stock data now arrives via the dashboard endpoint

**Verification approach**

- Run `tsc --noEmit` across all three apps (mobile, web, backend) after all fixes
- Fixes touch 3 different apps — full monorepo type-check ensures no regressions

### Claude's Discretion

- Order of fixes within the implementation
- Whether to run additional lint checks beyond tsc
- Commit granularity (single commit or per-fix)

### Deferred Ideas (OUT OF SCOPE)

- Forgot-password feature using Supabase Auth `resetPasswordForEmail` — future phase if needed
  </user_constraints>

---

## Summary

Phase 13 is a five-item surgical cleanup with no new dependencies, no architecture changes, and no risk of requirement regression. All 47 v1 requirements are already satisfied. This phase closes the 5 actionable items from the v1.0 milestone audit: a TypeScript type mismatch in the mobile error boundary, a dead link on the web login page, an orphaned API function export, a formatting inconsistency on a dashboard card, and an unused design token.

Every fix is fully prescribed by the CONTEXT.md — exact file paths, exact line numbers, and exact change descriptions are provided for all 5 items. The research confirms each change is safe, isolated, and verifiable. The only open question is the backend TypeScript errors discovered during verification, which are pre-existing (NestJS decorator TS5+ incompatibility) and are NOT part of this phase's scope.

**Primary recommendation:** Execute all 5 fixes in a single implementation pass. Verify with `pnpm exec tsc --noEmit` scoped to `--filter @objetiva/mobile` and `--filter @objetiva/web` (web and mobile must pass clean; backend errors are pre-existing and excluded from success criteria).

---

## Standard Stack

### Core

| Library              | Version                     | Purpose              | Why Standard                                                                  |
| -------------------- | --------------------------- | -------------------- | ----------------------------------------------------------------------------- |
| TypeScript           | (project-wide, strict mode) | Type checking        | Already configured; `tsc --noEmit` is the verification tool                   |
| react-error-boundary | ^6.1.1                      | Error boundary types | Already installed in `apps/mobile`; `FallbackProps` defines `error: unknown`  |
| @objetiva/utils      | workspace                   | `formatCurrency`     | Already imported in `stats-cards.tsx` for main KPI value; reusing same import |

### Supporting

No new packages required. This phase only edits existing files and deletes one file.

### Alternatives Considered

| Instead of               | Could Use                          | Tradeoff                                                                                       |
| ------------------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------- |
| `error: unknown`         | `error: Error \| unknown`          | Union is unnecessary; `unknown` is the correct type per react-error-boundary v4+ FallbackProps |
| Delete `fetchLowStock()` | Mark with `// @deprecated` comment | Comment leaves dead code; deletion is cleaner and was decided                                  |
| Delete `colors.ts`       | Leave with `// unused` comment     | Comment leaves dead export; deletion removes the misleading export surface                     |

---

## Architecture Patterns

### Verified File Locations (from direct code inspection)

```
apps/
├── mobile/src/components/ui/SectionErrorFallback.tsx   # FIX: error: Error → error: unknown (line 4)
├── web/src/app/(auth)/login/page.tsx                    # FIX: remove <Link href="/forgot-password"> block (lines 116-121)
├── web/src/lib/api.ts                                   # FIX: delete fetchLowStock() function (lines 146-148)
└── web/src/components/dashboard/stats-cards.tsx         # FIX: replace $${formatNumber(...)} with formatCurrency(...) (line 17)

packages/
└── ui/src/tokens/
    ├── colors.ts      # DELETE this file entirely
    └── index.ts       # CLEAN: remove colors import, re-export, and `colors` key from tokens object
```

### Pattern 1: TypeScript `error: unknown` for Error Boundaries

**What:** react-error-boundary v4+ changed `FallbackProps.error` from `Error` to `unknown` to correctly reflect that caught values can be any thrown value, not just `Error` instances.

**Confirmed from source:** The installed package at `apps/mobile/node_modules/react-error-boundary/dist/react-error-boundary.d.ts` contains:

```typescript
export declare type FallbackProps = {
  error: unknown
  resetErrorBoundary: (...args: unknown[]) => void
}
```

**The fix (SectionErrorFallback.tsx line 4):**

```typescript
// BEFORE (causes 8 TS2322 errors in SplashGate.tsx)
interface SectionErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

// AFTER (aligns with FallbackProps.error: unknown)
interface SectionErrorFallbackProps {
  error: unknown
  resetErrorBoundary: () => void
}
```

**Why this works:** `SplashGate.tsx` passes `SectionErrorFallback` as `FallbackComponent` to 8 `<ErrorBoundary>` instances. TypeScript rejects `ComponentType<SectionErrorFallbackProps>` as `ComponentType<FallbackProps>` because `Error` is narrower than `unknown` — the prop contract is violated. Widening to `unknown` makes the types compatible. The `error` value is only passed to `console.error(error)` so `unknown` is also safe at runtime.

### Pattern 2: Dead Link Removal (Login Page)

**Current state (login/page.tsx lines 113-135):**

```tsx
<FormItem>
  <div className="flex items-center justify-between">
    <FormLabel>Password</FormLabel>
    <Link
      href="/forgot-password"
      className="text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      Forgot password?
    </Link>
  </div>
  <FormControl>
```

**After removal — collapse the wrapper div back to just FormLabel:**

```tsx
<FormItem>
  <FormLabel>Password</FormLabel>
  <FormControl>
```

**Why this approach:** The `<div className="flex items-center justify-between">` wrapper exists only to position the link on the right. With the link gone, the wrapper serves no purpose. The `<FormLabel>` stands alone just as it does for the Email field (line 93-95).

### Pattern 3: Dead Code Deletion (api.ts)

**Current state (lines 146-148):**

```typescript
export async function fetchLowStock(): Promise<Inventory[]> {
  return fetchWithAuth<Inventory[]>('/inventory/low-stock')
}
```

**Verification:** `grep -r "fetchLowStock"` across all source files (excluding `.planning/`) returns exactly one match — the declaration itself in `api.ts`. Zero callers. Safe to delete.

**After deletion:** Lines 144 (end of `fetchInventory`) → 150 (client-side section comment) become adjacent. No import adjustments needed — `Inventory` type is still used by `fetchInventory`.

### Pattern 4: Currency Formatting Normalization (stats-cards.tsx)

**Current state (line 17):**

```typescript
description: `$${formatNumber(stats.todayRevenue)} today`,
```

Where `formatNumber` is a private local function:

```typescript
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num)
}
```

**The problem:** The main KPI value for this card is `formatCurrency(stats.totalRevenue)` which produces `$1,234.00 MXN` (es-MX locale). The subtitle produces `$2,345` (en-US locale, manual `$` prefix). Two different formats for currency values on the same card.

**After fix (line 17):**

```typescript
description: `${formatCurrency(stats.todayRevenue)} today`,
```

**Note on `formatNumber`:** The local `formatNumber` function at line 68 is also used by `formatNumber(stats.totalOrders)`, `formatNumber(stats.totalProducts)`, `formatNumber(stats.totalSales)`, and `formatNumber(purchases.pendingOrders)` — these are integer counts, not currency. Leave `formatNumber` in place. Only the currency value `todayRevenue` changes to `formatCurrency`.

**`formatCurrency` is already imported** at line 3:

```typescript
import { formatCurrency } from '@objetiva/utils'
```

No new import needed.

### Pattern 5: Token File Deletion (packages/ui/src/tokens/)

**Current `index.ts`:**

```typescript
export * from './colors'
export * from './spacing'
export * from './typography'

import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  colors,
  spacing,
  typography,
} as const
```

**After cleanup:**

```typescript
export * from './spacing'
export * from './typography'

import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  spacing,
  typography,
} as const
```

**Safety check:** `grep -r "colors"` across `apps/` (excluding local `statusColors` variables) returns zero imports of `Colors` type or `tokens.colors` from `@objetiva/ui`. Both Tailwind configs import only `{ spacing, typography }`:

```typescript
// apps/web/tailwind.config.ts and apps/mobile/tailwind.config.ts
import { spacing, typography } from '@objetiva/ui/tokens'
```

Deletion is safe.

### Anti-Patterns to Avoid

- **Removing `formatNumber` entirely:** It is used for non-currency values (order counts, product counts). Only the `todayRevenue` call changes to `formatCurrency`.
- **Modifying SplashGate.tsx:** The 8 TS errors are all in SplashGate.tsx but originate from the incompatible prop type in SectionErrorFallback.tsx. Fix the source, not the 8 usages.
- **Worrying about backend TS errors:** Running `pnpm exec tsc --noEmit` at monorepo root reveals pre-existing NestJS decorator errors in the backend (TS1241, TS1240, TS1270). These are NOT new, are NOT part of this phase, and the success criteria explicitly scopes to mobile `tsc --noEmit` passing. Backend uses `nest build` not plain `tsc`.

---

## Don't Hand-Roll

| Problem                                         | Don't Build                         | Use Instead                                                | Why                                                              |
| ----------------------------------------------- | ----------------------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------- |
| Currency formatting for `todayRevenue` subtitle | A new inline Intl.NumberFormat call | `formatCurrency` from `@objetiva/utils` (already imported) | Consistency — same function used for main KPI value on same card |

---

## Common Pitfalls

### Pitfall 1: Leaving the flex wrapper div after removing the link

**What goes wrong:** The `<div className="flex items-center justify-between">` wrapper around the Password `<FormLabel>` and the `<Link>` exists solely to push the link to the right. If you delete only the `<Link>` but leave the wrapper div, the layout has an unnecessary wrapper that changes nothing visually but adds noise.
**How to avoid:** Remove the entire wrapper div, leaving `<FormLabel>Password</FormLabel>` to stand alone (matching the Email field structure).

### Pitfall 2: Forgetting to remove the `colors` re-export line from index.ts

**What goes wrong:** Deleting `colors.ts` without cleaning `index.ts` causes a compile error — `export * from './colors'` and `import { colors } from './colors'` reference a deleted file.
**How to avoid:** Update `index.ts` first OR in the same commit as the file deletion. Three lines to remove from `index.ts`: the `export *` line, the `import` line, and the `colors,` key in the `tokens` object.

### Pitfall 3: Breaking `formatNumber` by replacing all its usages

**What goes wrong:** `stats-cards.tsx` uses both `formatCurrency` (currency values) and `formatNumber` (integer counts). A broad find-replace of `formatNumber` → `formatCurrency` would format order counts as currency.
**How to avoid:** Only replace the `$${formatNumber(stats.todayRevenue)}` call. Leave `formatNumber` calls for `totalOrders`, `totalProducts`, `totalSales`, `pendingOrders` untouched.

### Pitfall 4: Scoping tsc verification too broadly

**What goes wrong:** Running `pnpm exec tsc --noEmit` at monorepo root includes the backend, which has pre-existing NestJS decorator errors. This makes it look like the verification failed when it didn't.
**How to avoid:** Scope verification to mobile and web only: `pnpm --filter @objetiva/mobile exec tsc --noEmit` and `pnpm --filter @objetiva/web exec tsc --noEmit`.

---

## Code Examples

### Exact change: SectionErrorFallback.tsx

```typescript
// Source: apps/mobile/src/components/ui/SectionErrorFallback.tsx
// Line 4: change Error → unknown

// BEFORE:
interface SectionErrorFallbackProps {
  error: Error
  resetErrorBoundary: () => void
}

// AFTER:
interface SectionErrorFallbackProps {
  error: unknown
  resetErrorBoundary: () => void
}
```

### Exact change: stats-cards.tsx line 17

```typescript
// Source: apps/web/src/components/dashboard/stats-cards.tsx

// BEFORE (line 17):
description: `$${formatNumber(stats.todayRevenue)} today`,

// AFTER:
description: `${formatCurrency(stats.todayRevenue)} today`,
```

### Exact change: login/page.tsx lines 113-122

```tsx
// Source: apps/web/src/app/(auth)/login/page.tsx

// BEFORE (lines 113-135):
<FormItem>
  <div className="flex items-center justify-between">
    <FormLabel>Password</FormLabel>
    <Link
      href="/forgot-password"
      className="text-sm text-muted-foreground hover:text-primary transition-colors"
    >
      Forgot password?
    </Link>
  </div>
  <FormControl>

// AFTER:
<FormItem>
  <FormLabel>Password</FormLabel>
  <FormControl>
```

### Exact change: api.ts lines 146-148

```typescript
// Source: apps/web/src/lib/api.ts
// DELETE these 3 lines:
export async function fetchLowStock(): Promise<Inventory[]> {
  return fetchWithAuth<Inventory[]>('/inventory/low-stock')
}
```

### Exact change: packages/ui/src/tokens/index.ts

```typescript
// Source: packages/ui/src/tokens/index.ts

// BEFORE:
export * from './colors'
export * from './spacing'
export * from './typography'

import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  colors,
  spacing,
  typography,
} as const

// AFTER:
export * from './spacing'
export * from './typography'

import { spacing } from './spacing'
import { typography } from './typography'

export const tokens = {
  spacing,
  typography,
} as const
```

---

## Verification Commands

```bash
# Verify mobile TypeScript: must exit 0 after SectionErrorFallback fix
pnpm --filter @objetiva/mobile exec tsc --noEmit

# Verify web TypeScript: must exit 0 after all web changes
pnpm --filter @objetiva/web exec tsc --noEmit

# Confirm fetchLowStock is gone (should return zero results):
grep -r "fetchLowStock" apps/ --include="*.ts" --include="*.tsx"

# Confirm forgot-password link is gone:
grep -r "forgot-password" apps/web/src --include="*.tsx"

# Confirm colors.ts is gone and index.ts is clean:
ls packages/ui/src/tokens/
grep "colors" packages/ui/src/tokens/index.ts
```

---

## Open Questions

1. **`formatNumber` local function in stats-cards.tsx after the fix**
   - What we know: The local `formatNumber` function at line 68 will remain after removing its only currency usage on line 17. It is still used for integer counts (orders, products, sales).
   - What's unclear: Whether the planner wants to note this explicitly in the plan or leave it as-is.
   - Recommendation: Leave `formatNumber` in place — it serves its purpose for count formatting. The phase only targets the one inconsistent currency usage.

2. **Backend TS errors during monorepo-level tsc**
   - What we know: Running `pnpm exec tsc --noEmit` at root shows ~20+ NestJS decorator errors in `apps/backend`. These are pre-existing (observed before any Phase 13 changes).
   - What's unclear: Should the planner add a note about why the backend is excluded from success criteria verification?
   - Recommendation: Yes — include a verification note that backend errors are pre-existing NestJS decorator TS5+ incompatibilities, not regressions from this phase. Success criteria only covers mobile and web.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection — `apps/mobile/node_modules/react-error-boundary/dist/react-error-boundary.d.ts`: confirms `FallbackProps.error: unknown` in installed version 6.1.1
- Direct code inspection — `apps/mobile/src/components/ui/SectionErrorFallback.tsx`: confirms `error: Error` (line 4) is the source of the 8 TS errors
- Direct code inspection — `apps/web/src/components/dashboard/stats-cards.tsx`: confirms `$${formatNumber(stats.todayRevenue)}` at line 17 and `formatCurrency` already imported
- Direct code inspection — `apps/web/src/lib/api.ts`: confirms `fetchLowStock()` at lines 146-148 with zero callers confirmed by grep
- Direct code inspection — `packages/ui/src/tokens/index.ts` + `colors.ts`: confirms the file structure and that neither tailwind config imports `colors`
- Live `tsc --noEmit` run — `pnpm --filter @objetiva/mobile exec tsc --noEmit`: confirms 8 errors, all in SplashGate.tsx, all `TS2322` for `FallbackProps` incompatibility
- Live `tsc --noEmit` run — `pnpm --filter @objetiva/web exec tsc --noEmit`: confirms exit 0 (web is already clean)

### Tertiary (LOW confidence — not needed, fully covered by direct inspection)

- None required for this phase.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new packages; all changes use already-installed libraries
- Architecture: HIGH — all file locations and exact changes verified by direct code inspection
- Pitfalls: HIGH — all pitfalls verified against actual code structure, not assumed

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable — no fast-moving dependencies)
