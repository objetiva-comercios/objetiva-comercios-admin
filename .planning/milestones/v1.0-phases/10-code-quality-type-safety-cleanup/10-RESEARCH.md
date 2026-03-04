# Phase 10: Code Quality & Type Safety Cleanup - Research

**Researched:** 2026-03-03
**Domain:** TypeScript monorepo cleanup — dead code removal, shared utility consolidation, type migration
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Locale strategy for formatters:**

- Update @objetiva/utils to accept locale/currency params: `formatCurrency(amount, currency?, locale?)` and `formatDate(date, locale?)`
- Default to `es-MX` / `MXN` since this is a Mexican business app
- Web app should also use es-MX/MXN formatting for consistency across platforms
- Date formatting in Spanish (es-MX locale) to match the Mexican audience
- Web's date-fns usage stays separate — only consolidate formatCurrency in web, not dates. Web uses `format`/`formatDistanceToNow` from date-fns which is a different pattern

**Scope of type fixes in mobile:**

- Fix ALL entity id types from `string` to `number`: Order, OrderItem, Purchase, PurchaseItem, Sale, SaleItem, Product, Inventory
- Fix ripple effects: change types and fix all TypeScript build errors that surface
- Keep types local in mobile for now — moving to @objetiva/types is a bigger refactor for a future phase
- Claude investigates API call patterns during implementation to ensure number ids work at the boundaries

**Mobile signup validation approach:**

- Mirror Login.tsx's existing pattern — Signup should follow the same approach Login already uses for shared schema validation
- Import `signupSchema` from `@objetiva/types` and replace manual if-checks (lines 20-37 in Signup.tsx)
- Keep English error messages for now — localization is a separate concern
- Keep password strength indicator (getPasswordStrength) separate from schema validation — different purposes

**Dead code removal:**

- Delete `auth.middleware.ts` file — confirmed 100% dead code, nothing references it
- Stick to the 4 specified success criteria — no broad dead code sweep
- Claude verifies JwtAuthGuard coverage as a safety check before deleting
- Claude verifies @objetiva/utils and @objetiva/types package health during implementation

### Claude's Discretion

- Exact implementation of locale parameter signatures in @objetiva/utils
- How to handle edge cases in type migration (string-to-number coercion at API boundaries)
- Whether to clean up any comments/docs mentioning AuthMiddleware if found
- Package build verification approach

### Deferred Ideas (OUT OF SCOPE)

- Full i18n/localization system for error messages and UI text — future phase
- Moving mobile entity types to @objetiva/types shared package — future refactor phase
- Broader dead code sweep across the monorepo — could be a maintenance task
- Web date formatting consolidation into @objetiva/utils — web's date-fns usage is fine as-is
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                 | Research Support                                                                                                                                                                      |
| ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AUTH-01 | User can sign up with email and password via Supabase Auth  | Signup.tsx validation refactor uses signupSchema from @objetiva/types; pattern already proven in Login.tsx                                                                            |
| AUTH-05 | Backend validates JWT tokens from Supabase on every request | Dead code audit confirms JwtAuthGuard (registered globally in main.ts) handles all auth; AuthMiddleware is never registered and safe to delete                                        |
| UI-05   | Components live in packages/ui with shared design tokens    | @objetiva/utils formatCurrency/formatDate are the shared utilities that need consolidation — fixing their export to be the canonical implementation satisfies monorepo sharing intent |
| MONO-04 | packages/ui exports shared design tokens and types          | Updating @objetiva/utils formatters to support locale params and having apps import from there closes the gap where both apps had identical inline duplicates                         |

</phase_requirements>

## Summary

This phase is a focused cleanup of four concrete problems discovered during the Phase 8/10 milestone audit. All four problems are verified in the codebase and none require new dependencies or infrastructure.

The work divides cleanly into four independent tasks: (1) delete one backend file, (2) update one shared package with optional locale params and rebuild, (3) replace 12 local formatter function definitions with imports, and (4) change 8 `id: string` fields to `id: number` and fix TypeScript compilation errors that surface.

The key complexity is the type migration: changing entity ids from `string` to `number` affects key usage in list rendering (`key={item.id}`) and anywhere ids are passed to API endpoints. The `item.id.toString()` adapter pattern handles the key prop smoothly; API boundary calls need investigation during implementation.

**Primary recommendation:** Execute as 1-2 plans in dependency order: first update @objetiva/utils (package rebuild), then swap imports in apps and fix types simultaneously (since both apps already depend on the package).

## Standard Stack

### Core

| Library         | Version      | Purpose                                     | Why Standard                        |
| --------------- | ------------ | ------------------------------------------- | ----------------------------------- |
| TypeScript      | ^5.3.0       | Type system across monorepo                 | Already in use, strict mode enabled |
| @objetiva/utils | workspace:\* | Shared formatters                           | Already a dependency in both apps   |
| @objetiva/types | workspace:\* | Shared schemas/types                        | Already a dependency in both apps   |
| zod             | ^4.3.6       | Runtime schema validation                   | Already used in @objetiva/types     |
| pnpm workspaces | 9.0.0        | Monorepo dependency resolution              | Already configured                  |
| Turborepo       | 2.x          | Build orchestration with `^build` dependsOn | Already configured                  |

### Supporting

| Library             | Version             | Purpose                       | When to Use                                                               |
| ------------------- | ------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| tsc                 | (TypeScript CLI)    | Build @objetiva/utils package | After updating formatters.ts, run `pnpm --filter @objetiva/utils build`   |
| Intl.NumberFormat   | Browser/Node native | Currency formatting           | No external dependency needed — already used in all local implementations |
| Intl.DateTimeFormat | Browser/Node native | Date formatting               | Same — native, zero bundle cost                                           |

### Alternatives Considered

| Instead of                          | Could Use                               | Tradeoff                                                                                   |
| ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------ |
| Optional locale/currency params     | Separate `formatCurrencyMXN()` function | Named variants are explicit but proliferate; optional params with defaults are standard    |
| Updating @objetiva/utils formatDate | Leave date utils in mobile              | Decided: consolidate only formatCurrency in web, formatDate in mobile — web keeps date-fns |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended Project Structure

No structural changes — this phase modifies existing files only.

```
packages/utils/src/
└── formatters.ts        # Update signatures: (amount, currency?, locale?) and (date, locale?)

apps/mobile/src/
├── types/index.ts       # Change 8 entity id types: string → number
└── pages/
    ├── Signup.tsx        # Replace manual if-checks with signupSchema.safeParse()
    ├── Articles.tsx      # Replace local formatCurrency/formatDate with import
    ├── Sales.tsx         # Replace local formatCurrency/formatDate with import
    ├── Orders.tsx        # Replace local formatCurrency/formatDate with import
    ├── Profile.tsx       # Replace local formatDate with import
    ├── Inventory.tsx     # Replace local formatDate with import
    └── Purchases.tsx     # Replace local formatCurrency/formatDate with import

apps/web/src/components/
├── dashboard/stats-cards.tsx     # Replace local formatCurrency with import
├── dashboard/recent-orders.tsx   # Replace local formatCurrency with import
└── tables/
    ├── sales/sale-sheet.tsx      # Replace inline formatCurrency with import
    ├── purchases/purchase-sheet.tsx  # Replace inline formatCurrency with import
    ├── orders/order-sheet.tsx    # Replace inline formatCurrency with import
    └── products/product-sheet.tsx    # Replace inline formatCurrency with import

apps/backend/src/auth/
└── auth.middleware.ts    # DELETE this file
```

### Pattern 1: Updated @objetiva/utils Formatter Signature

**What:** Add optional `currency` and `locale` params with es-MX/MXN defaults. The existing `formatCurrency(amount, currency?)` signature already has a currency param but defaults to USD and hardcodes `en-US`. Update to default `es-MX`/`MXN` and add locale param.

**When to use:** Any time currency or date needs displaying — import from package, never define locally.

**Example:**

```typescript
// packages/utils/src/formatters.ts (after update)
export function formatCurrency(amount: number, currency = 'MXN', locale = 'es-MX'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(amount)
}

export function formatDate(date: Date | string, locale = 'es-MX'): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(new Date(date))
}
```

**Import pattern in mobile (after):**

```typescript
// apps/mobile/src/pages/Articles.tsx (after)
import { formatCurrency, formatDate } from '@objetiva/utils'
// No local formatCurrency/formatDate functions defined
```

**Import pattern in web (after):**

```typescript
// apps/web/src/components/dashboard/stats-cards.tsx (after)
import { formatCurrency } from '@objetiva/utils'
// No local formatCurrency function
```

### Pattern 2: signupSchema.safeParse() (mirroring Login.tsx)

**What:** Replace manual if-checks in Signup.tsx with a single `signupSchema.safeParse()` call. Matches how Login.tsx already uses `loginSchema.safeParse()`.

**Current state (manual if-checks, lines 20-37):**

```typescript
// Signup.tsx — BEFORE (remove this)
if (password !== confirmPassword) {
  setError('Passwords do not match')
  return
}
if (!/[A-Z]/.test(password)) {
  setError('Password must contain at least one uppercase letter')
  return
}
if (!/[0-9]/.test(password)) {
  setError('Password must contain at least one number')
  return
}
if (password.length < 8) {
  setError('Password must be at least 8 characters')
  return
}
```

**After (mirroring Login.tsx pattern):**

```typescript
// Signup.tsx — AFTER
import { signupSchema, getPasswordStrength } from '@objetiva/types'

async function handleSubmit(e: FormEvent) {
  e.preventDefault()
  setError(null)

  const result = signupSchema.safeParse({ email, password, confirmPassword })
  if (!result.success) {
    setError(result.error.errors[0]?.message ?? 'Please check your inputs')
    setLoading(false)
    return
  }

  setLoading(true)
  const { error: authError } = await supabase.auth.signUp({ email, password })
  // ...
}
```

**Key note:** `signupSchema` already contains a `.refine()` check for `confirmPassword` match — it fully covers all current if-checks. `getPasswordStrength` is already imported (line 4 of Signup.tsx) — keep that import.

### Pattern 3: Entity id Type Migration (string → number)

**What:** Change 8 entity interfaces in `apps/mobile/src/types/index.ts` from `id: string` to `id: number`. Then fix downstream TypeScript errors.

**Entities to fix:**

- `Product.id: string` → `number`
- `OrderItem.id: string` → `number`, `OrderItem.productId: string` → `number`
- `Order.id: string` → `number`
- `SaleItem.id: string` → `number`, `SaleItem.productId: string` → `number`
- `Sale.id: string` → `number`
- `PurchaseItem.id: string` → `number`, `PurchaseItem.productId: string` → `number`
- `Purchase.id: string` → `number`
- `Inventory.id: string` → `number`, `Inventory.productId: string` → `number`

**Ripple effect: React key props**

```typescript
// BEFORE: key prop works because string is already valid
{items.map(item => <div key={item.id}>...</div>)}

// AFTER: number is also valid as React key — no change needed
// React accepts string | number | bigint for key prop
{items.map(item => <div key={item.id}>...</div>)}
```

**React key accepts `number` directly** — this is not a breaking change for key props.

**Ripple effect: API boundary calls**

```typescript
// If any code does string interpolation with id:
const url = `/api/orders/${order.id}`  // Works: number coerces to string in template literal

// If any code compares id to string:
if (item.id === '123') { ... }  // TypeScript error: string vs number comparison — FIX these
```

**Pattern to investigate during implementation:** Check all pages using entity ids for navigation, filtering, or API calls. The `useInfiniteList` hook and query functions use `params` as `Record<string, string>` — if id is passed as a filter param, it needs `.toString()`.

### Pattern 4: Dead Code Deletion

**What:** Delete `apps/backend/src/auth/auth.middleware.ts`.

**Verification checklist before deletion:**

1. Confirm `AuthMiddleware` is NOT imported in `auth.module.ts` ✅ (verified: auth.module.ts has no middleware registration)
2. Confirm `AuthMiddleware` is NOT imported anywhere in `apps/backend/src/` ✅ (verified: no imports found)
3. Confirm `JwtAuthGuard` IS registered globally in `main.ts` ✅ (line 25: `app.useGlobalGuards(new JwtAuthGuard(new Reflector()))`)

After deletion, verify backend TypeScript compiles clean: `pnpm --filter @objetiva/backend type-check`.

### Pattern 5: Package Build Sequence

The `turbo.json` configures `"dependsOn": ["^build"]` — consuming packages build after their dependencies. This means:

```bash
# 1. Rebuild utils package after updating formatters.ts
pnpm --filter @objetiva/utils build

# 2. Type-check consuming apps to confirm no regressions
pnpm --filter @objetiva/web type-check
pnpm --filter @objetiva/mobile type-check
pnpm --filter @objetiva/backend type-check
```

### Anti-Patterns to Avoid

- **Changing the @objetiva/utils `currency` parameter position:** The existing signature is `formatCurrency(amount, currency?)` — keep this positional order when adding `locale?` as the third param. Any existing call sites that pass currency explicitly (e.g., `formatCurrency(price, 'USD')`) will still work.
- **Removing `formatDate` from mobile pages without re-checking edge cases:** Mobile `Purchases.tsx` uses `formatDate(iso: string | null)` with a null guard. The shared `formatDate` accepts `Date | string` — the null check wrapper must stay at the call site or be handled differently.
- **Assuming all web formatDate calls can be consolidated:** Web uses date-fns `format()` and `formatDistanceToNow()` — these are NOT the same as `Intl.DateTimeFormat`. The CONTEXT.md decision is web dates stay with date-fns.
- **Building apps before rebuilding the utils package:** If you update `formatters.ts` but run app type-check without rebuilding utils dist/, the apps will compile against stale type declarations.

## Don't Hand-Roll

| Problem                     | Don't Build            | Use Instead                            | Why                                                    |
| --------------------------- | ---------------------- | -------------------------------------- | ------------------------------------------------------ |
| Currency formatting         | Custom format function | `Intl.NumberFormat` (already in use)   | Handles MXN/es-MX formatting, locale-aware, zero deps  |
| Date formatting             | Custom format function | `Intl.DateTimeFormat` (already in use) | Same — locale-aware, covers all cases                  |
| Schema validation in Signup | New validation logic   | `signupSchema` from `@objetiva/types`  | Schema already exists, already tested by Login.tsx use |

**Key insight:** Every "hand-rolled" instance in this phase is a duplicate of something that already exists and works correctly.

## Common Pitfalls

### Pitfall 1: Locale Default Change Breaks Existing Tests or Snapshots

**What goes wrong:** Changing `formatCurrency` default from `en-US`/`USD` to `es-MX`/`MXN` changes all formatting outputs. Any hardcoded expected values like `"$1,234.56"` vs `"$1,234.56 MXN"` break.
**Why it happens:** Test snapshots capture exact formatted strings.
**How to avoid:** There are no automated tests in this project — verify manually by running each app and checking numbers render correctly with MXN prefix.
**Warning signs:** None — `nyquist_validation` is `false` in config.json; rely on TypeScript compilation + visual verification.

### Pitfall 2: Mobile formatDate Null Handling

**What goes wrong:** `Purchases.tsx` calls `formatDate(iso: string | null)` with a null guard baked in: `if (!iso) return 'Not received'`. The shared `formatDate` signature is `formatDate(date: Date | string): string` — it does NOT accept null.
**Why it happens:** The type signatures diverge at the call site in Purchases.tsx.
**How to avoid:** In `Purchases.tsx`, keep the null check before calling the imported function:

```typescript
import { formatDate } from '@objetiva/utils'
// In component:
const displayDate = purchase.receivedAt ? formatDate(purchase.receivedAt) : 'Not received'
```

Or add null handling inline: `formatDate(iso ?? '')` with an empty string fallback. Either approach works.
**Warning signs:** TypeScript error `Argument of type 'string | null' is not assignable to parameter of type 'string | Date'`.

### Pitfall 3: Profile.tsx formatDate Different Signature

**What goes wrong:** `Profile.tsx` has `formatDate(iso: string | undefined)` with `if (!iso) return 'Unknown'`. Similar to Purchases null handling.
**Why it happens:** Profile handles undefined (Supabase `created_at` can be undefined).
**How to avoid:** Same null/undefined guard pattern before calling shared `formatDate`:

```typescript
const displayDate = user.created_at ? formatDate(user.created_at) : 'Unknown'
```

### Pitfall 4: Duplicate Sale Entity `notes` Field in Mobile

**What goes wrong:** `Sale` in `apps/mobile/src/types/index.ts` has a `notes: string` field. The backend `sales` schema (Drizzle) has no `notes` column. This is a pre-existing mismatch — do not fix in this phase.
**Why it happens:** Mobile types were authored independently.
**How to avoid:** The CONTEXT.md scope is clear: only fix `id` types (`string` → `number`). Don't fix other type mismatches discovered during the id migration.

### Pitfall 5: Mobile Sale `customerEmail` Not in Backend Schema

**What goes wrong:** `Sale` interface has `customerEmail: string` but the backend `sales` table has no `customer_email` column. Same pre-existing issue.
**How to avoid:** Same as Pitfall 4 — scope only id types.

### Pitfall 6: Web Order/Purchase Types Also Have `id: string`

**What goes wrong:** The scope in CONTEXT.md says "mobile" but the success criteria says "Mobile Order/Purchase id typed as number matching backend response." However, web types (`apps/web/src/types/order.ts`, `apps/web/src/types/purchase.ts`) ALSO have `id: string`.
**Why it happens:** The audit specifically called out mobile — web may work differently (Next.js with string serialization).
**How to avoid:** Focus on mobile types first as specified. For web, check if types are used in key props or routing — if so, web can be fixed opportunistically. The CONTEXT.md success criterion is explicitly about Mobile.

## Code Examples

Verified patterns from actual codebase inspection:

### Current Local formatCurrency (mobile — to be removed)

```typescript
// apps/mobile/src/pages/Articles.tsx lines 17-19 (CURRENT — duplicated 4x)
function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount)
}
```

### Current Local formatCurrency (web — to be removed)

```typescript
// apps/web/src/components/dashboard/stats-cards.tsx lines 67-72 (CURRENT — duplicated 2x as module-scope)
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount)
}

// apps/web/src/components/tables/sales/sale-sheet.tsx line 37 (CURRENT — duplicated 4x as inline closures)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}
```

**Key observation:** Mobile already uses `es-MX`/`MXN`. Web uses `en-US`/`USD`. After update, ALL should use the shared `es-MX`/`MXN` default.

### signupSchema Structure (already in @objetiva/types)

```typescript
// packages/types/src/index.ts (CURRENT — no changes needed)
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

The schema handles: email format validation, password min 8 chars, uppercase letter, number, and confirmPassword match. This replaces lines 20-37 of Signup.tsx completely.

### JwtAuthGuard Global Registration (confirmed active)

```typescript
// apps/backend/src/main.ts line 25 (CURRENT — JwtAuthGuard is active)
app.useGlobalGuards(new JwtAuthGuard(new Reflector()))
```

`AuthMiddleware` is safe to delete: it exports `AuthMiddleware` class but the class is never imported in any backend source file.

## State of the Art

| Old Approach                           | Current Approach                               | When Changed         | Impact                                                                                                        |
| -------------------------------------- | ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------- |
| AuthMiddleware (NestJS NestMiddleware) | JwtAuthGuard (NestJS CanActivate global guard) | Phase 2 (02-01 plan) | Middleware was superseded; the file was created in Phase 1 planning but never wired after Phase 2 replaced it |
| Local formatCurrency per file          | Shared @objetiva/utils                         | This phase           | Eliminates 12 copies; consistent es-MX/MXN                                                                    |
| Manual if-checks in Signup             | signupSchema.safeParse()                       | This phase           | Matches Login.tsx pattern; zod handles all rules                                                              |
| Entity id: string                      | Entity id: number                              | This phase           | Matches serial('id') DB schema which returns JS numbers                                                       |

## Open Questions

1. **Web Order/Purchase id types also need fixing?**
   - What we know: `apps/web/src/types/order.ts` and `apps/web/src/types/purchase.ts` both have `id: string` (confirmed)
   - What's unclear: The CONTEXT.md success criteria says "Mobile" only — whether web types also need fixing is not locked
   - Recommendation: Fix web types opportunistically if it surfaces zero extra work (same pattern). If web has more ripple effects (URL routing, etc.), defer to avoid scope creep.

2. **SaleItem.total vs SaleItem.unitPrice field name alignment**
   - What we know: Mobile `SaleItem` has `total: number` but backend `sale_items` schema has `subtotal` column (from Phase 9 fix). Mobile also has `unitPrice` but schema has `price`.
   - What's unclear: Whether this causes runtime issues (it does cause NaN display if field name is wrong)
   - Recommendation: Out of scope for this phase per CONTEXT.md. Log it but don't fix.

3. **Package rebuild order during plan execution**
   - What we know: Turborepo `dependsOn: ["^build"]` ensures correct build order in full `pnpm build` runs
   - What's unclear: Whether running `pnpm --filter @objetiva/web type-check` directly (without rebuilding utils first) will pick up fresh types
   - Recommendation: Always run `pnpm --filter @objetiva/utils build` explicitly before type-checking consuming apps.

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not present in `.planning/config.json` (no nyquist_validation key).

## File Inventory (Exact Change Manifest)

### Files to DELETE

| File                                       | Reason                                                                     |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `apps/backend/src/auth/auth.middleware.ts` | Dead code — AuthMiddleware never registered, JwtAuthGuard handles all auth |

### Files to MODIFY

| File                                                          | Change                                                                                                           |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `packages/utils/src/formatters.ts`                            | Add locale/currency optional params, default to es-MX/MXN                                                        |
| `apps/mobile/src/pages/Signup.tsx`                            | Replace manual if-checks (lines 20-37) with `signupSchema.safeParse()`                                           |
| `apps/mobile/src/types/index.ts`                              | Change 8 entity id fields from `string` to `number`                                                              |
| `apps/mobile/src/pages/Articles.tsx`                          | Remove local formatCurrency/formatDate, import from @objetiva/utils                                              |
| `apps/mobile/src/pages/Sales.tsx`                             | Remove local formatCurrency/formatDate, import from @objetiva/utils                                              |
| `apps/mobile/src/pages/Orders.tsx`                            | Remove local formatCurrency/formatDate, import from @objetiva/utils                                              |
| `apps/mobile/src/pages/Profile.tsx`                           | Remove local formatDate, import from @objetiva/utils (add null guard at call site)                               |
| `apps/mobile/src/pages/Inventory.tsx`                         | Remove local formatDate, import from @objetiva/utils                                                             |
| `apps/mobile/src/pages/Purchases.tsx`                         | Remove local formatCurrency/formatDate, import from @objetiva/utils (add null guard at call site for receivedAt) |
| `apps/web/src/components/dashboard/stats-cards.tsx`           | Remove local formatCurrency, import from @objetiva/utils                                                         |
| `apps/web/src/components/dashboard/recent-orders.tsx`         | Remove local formatCurrency, import from @objetiva/utils                                                         |
| `apps/web/src/components/tables/sales/sale-sheet.tsx`         | Remove inline formatCurrency closure, import from @objetiva/utils                                                |
| `apps/web/src/components/tables/purchases/purchase-sheet.tsx` | Remove inline formatCurrency closure, import from @objetiva/utils                                                |
| `apps/web/src/components/tables/orders/order-sheet.tsx`       | Remove inline formatCurrency closure, import from @objetiva/utils                                                |
| `apps/web/src/components/tables/products/product-sheet.tsx`   | Remove inline formatCurrency closure, import from @objetiva/utils                                                |

### Files with potential ripple effects from id: string → number

- `apps/mobile/src/pages/Articles.tsx` — `key={product.id}` (React accepts number: no change)
- `apps/mobile/src/pages/Orders.tsx` — `key={order.id}`, `key={item.id}` (no change)
- `apps/mobile/src/pages/Sales.tsx` — `key={sale.id}`, `key={item.id}` (no change)
- `apps/mobile/src/pages/Purchases.tsx` — `key={purchase.id}`, `key={item.id}` (no change)
- `apps/mobile/src/pages/Inventory.tsx` — `key={item.id}` (no change)
- Any API filter params that pass id as string to URL — inspect during implementation

## Sources

### Primary (HIGH confidence)

- Direct codebase inspection — all file contents read and verified
- `apps/backend/src/main.ts` — JwtAuthGuard global registration confirmed
- `apps/backend/src/auth/auth.middleware.ts` — no references in any backend source file confirmed
- `apps/backend/src/db/schema.ts` — all entity ids are `serial('id').primaryKey()` → JS `number`
- `apps/mobile/src/pages/Login.tsx` — safeParse pattern confirmed as the model for Signup
- `packages/types/src/index.ts` — signupSchema exports `email`, `password`, `confirmPassword` with refine for match
- `packages/utils/src/formatters.ts` — current signature confirmed, needs locale/currency defaults updated
- `.planning/config.json` — `nyquist_validation` key absent; no test infrastructure section needed

### Secondary (MEDIUM confidence)

- React key prop accepting `number` type — verified by standard React documentation (this is fundamental React behavior, HIGH confidence)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — no new dependencies, all existing packages verified
- Architecture: HIGH — direct codebase inspection, not speculation
- Pitfalls: HIGH — null handling issues found by reading actual code signatures
- File inventory: HIGH — exact grep and file counts verified (12 files with local formatters, confirmed)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable — no external dependencies, all internal codebase)
