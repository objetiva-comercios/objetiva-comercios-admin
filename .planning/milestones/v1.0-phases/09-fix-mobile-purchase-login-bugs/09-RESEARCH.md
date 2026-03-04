# Phase 9: Fix Mobile Purchase & Login Bugs - Research

**Researched:** 2026-03-02
**Domain:** Bug fixes — enum alignment, field name alignment, client-side validation
**Confidence:** HIGH

<phase_requirements>

## Phase Requirements

| ID      | Description                                            | Research Support                                                                                                                                                                                              |
| ------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-06  | Backend exposes /api/purchases endpoint with mock data | Purchase status enum ('draft'/'ordered'/'received'/'cancelled') and field names (subtotal vs total) must align between backend schema and frontend types; both mobile and web Purchase types need correction  |
| NAV-07  | All sections are navigable (including Purchases)       | Mobile Purchases filter chip must use correct status enums so filtering works; currently 'Pending' chip sends status=pending which matches zero backend rows                                                  |
| AUTH-02 | User can log in with email and password                | Mobile Login must validate password is non-empty before submitting; loginSchema from @objetiva/types provides the correct validation; HTML5 `required` attribute is bypassed in Capacitor native file:// mode |

</phase_requirements>

---

## Summary

Phase 9 closes three integration gaps and two flow bugs identified in the v1.0 milestone audit. All three bugs are in the mobile app (`apps/mobile`), with one secondary fix also needed in the web app (`apps/web`).

**Bug 1 — Purchase Status Enum Mismatch (API-06, NAV-07):** The mobile filter chip sends `status=pending` but the backend generator and database store `'draft'` as the initial status. The backend `PurchaseQueryDto` accepts `'draft' | 'ordered' | 'received' | 'cancelled'` — no `'pending'` value exists. Fix is two-part: (a) rename the 'Pending' filter chip to 'Draft' and change its value from `'pending'` to `'draft'` in `apps/mobile/src/pages/Purchases.tsx`, and (b) update the `Purchase` interface `status` union in `apps/mobile/src/types/index.ts` from `'pending' | 'ordered' | 'received' | 'cancelled'` to `'draft' | 'ordered' | 'received' | 'cancelled'`. The same status mismatch exists in the web purchase type, and the web `columns.tsx` statusColors/statusVariants map uses `'pending'` instead of `'draft'`, causing unstyled badges on draft purchases.

**Bug 2 — PurchaseItem Field Name Mismatch (API-06):** The mobile `PurchaseItem` interface declares `total: number`, but the backend Drizzle schema stores `subtotal: doublePrecision('subtotal')` — there is no `total` field on `purchase_items`. The mobile detail sheet renders `item.total` which is `undefined`, causing `Intl.NumberFormat().format(undefined)` to output `MXN NaN`. Fix: rename `total` to `subtotal` in `PurchaseItem` interface in `apps/mobile/src/types/index.ts` and update `Purchases.tsx` to reference `item.subtotal`. The same issue exists in the web's `src/types/purchase.ts` `PurchaseItem` interface (also has `total` instead of `subtotal`).

**Bug 3 — Mobile Login Password Validation Bypass (AUTH-02):** The mobile `Login.tsx` calls `emailSchema.safeParse(email)` before submission but never validates the `password` field. In browser mode, HTML5 `required` attribute prevents empty submission; in Capacitor native mode (file:// protocol), the WebView may not enforce HTML5 form validation. The `loginSchema` from `@objetiva/types` already exists with `password: z.string().min(1, 'Password is required')` — it simply needs to be imported and used in `Login.tsx`.

**Primary recommendation:** Three isolated, surgical code changes — each touching 1-2 files. No new dependencies. No migration required. All fixes are TypeScript type corrections and logic additions.

---

## Standard Stack

No new libraries needed. All fixes use existing project dependencies.

### Core (existing — no changes)

| Library           | Version                     | Purpose             | Why Standard                                                                  |
| ----------------- | --------------------------- | ------------------- | ----------------------------------------------------------------------------- |
| zod               | existing in @objetiva/types | Runtime validation  | Already used for emailSchema; loginSchema already exports password validation |
| React state       | built-in                    | UI state management | Filter chip state and form state already use useState                         |
| Intl.NumberFormat | built-in                    | Currency formatting | Already used in Purchases.tsx for formatCurrency                              |

### Supporting (existing — already installed)

| Library         | Version   | Purpose                   | When to Use                                                              |
| --------------- | --------- | ------------------------- | ------------------------------------------------------------------------ |
| @objetiva/types | workspace | Shared validation schemas | loginSchema already exported — just needs to be imported                 |
| TanStack Query  | existing  | Data fetching with params | useInfiniteList hook already passes filter params to /purchases endpoint |

**Installation:** None required.

---

## Architecture Patterns

### Pattern 1: Capacitor Native Form Validation

**What:** In Capacitor native mode (file:// protocol on iOS/Android), the HTML5 `required` attribute on `<input>` elements may not trigger browser-level form validation before `onSubmit` fires. Browser environments validate on form submit; native WebViews may not.
**When to use:** Any form input that relies solely on HTML `required` for validation must add explicit JS validation for native compatibility.
**Example (from existing Login.tsx pattern):**

```typescript
// Current — only validates email, not password:
const emailResult = emailSchema.safeParse(email)
if (!emailResult.success) { ... }

// Fix — use loginSchema for both fields:
const loginResult = loginSchema.safeParse({ email, password })
if (!loginResult.success) {
  const firstError = loginResult.error.errors[0]
  setError(firstError?.message ?? 'Invalid credentials')
  setLoading(false)
  return
}
```

### Pattern 2: Status Enum Alignment

**What:** Backend status enums are the source of truth. Frontend filter chips, type unions, and badge color maps must match the backend's exact string values.
**When to use:** Any time a frontend sends a status query param or renders status-dependent UI.
**Example:**

```typescript
// Backend PurchaseQueryDto accepts:
status?: 'draft' | 'ordered' | 'received' | 'cancelled'

// Mobile filter chips must match exactly:
const STATUS_FILTERS = [
  { label: 'Draft', value: 'draft' },      // was: { label: 'Pending', value: 'pending' }
  { label: 'Ordered', value: 'ordered' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
]

// Mobile Purchase type must match:
status: 'draft' | 'ordered' | 'received' | 'cancelled'  // was: 'pending' | ...
```

### Pattern 3: DB Schema Field Name as Source of Truth

**What:** Drizzle schema column names (camelCase JS properties) are the authoritative field names for API responses. Frontend types must use the same names as Drizzle's `$inferSelect`.
**When to use:** When backend returns data from Drizzle queries directly (no DTO transformation), frontend types must mirror Drizzle's field names.
**Example:**

```typescript
// Drizzle schema purchaseItems:
unitCost: doublePrecision('unit_cost').notNull(),
subtotal: doublePrecision('subtotal').notNull(),
// NO 'total' field exists on purchase_items table

// Mobile PurchaseItem type — fix:
interface PurchaseItem {
  unitCost: number
  subtotal: number  // was: total: number
}

// Purchases.tsx — fix references:
{item.quantity} x {formatCurrency(item.unitCost)}   // already correct
{formatCurrency(item.subtotal)}                       // was: item.total
```

### Web statusColors Fix Pattern

```typescript
// apps/web/src/components/tables/purchases/columns.tsx
// Current statusColors has 'pending' key — no 'draft' key:
const statusColors = {
  pending: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100', // REMOVE
  draft: 'bg-gray-100 text-gray-800 hover:bg-gray-100', // ADD
  ordered: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  received: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
}
// Same change needed for statusVariants map
```

### Anti-Patterns to Avoid

- **Changing backend status values:** Do not rename 'draft' to 'pending' in the generator or database. The DB has existing seeded data and changing the enum would require a migration. Align the frontend to the backend, not vice versa.
- **Adding a DB migration for this fix:** All fixes are pure TypeScript/logic changes. No schema alteration is needed.
- **Validating with emailSchema + separate password check:** Use loginSchema (combined object schema) for atomic validation. It already exists in `@objetiva/types`.

---

## Don't Hand-Roll

| Problem                      | Don't Build                   | Use Instead                                  | Why                                                                                     |
| ---------------------------- | ----------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Password presence validation | Custom `if (!password)` check | `loginSchema.safeParse({ email, password })` | loginSchema already in @objetiva/types with correct min(1) rule; single source of truth |
| Purchase status display name | Custom status-to-label map    | Use label in STATUS_FILTERS array            | Already the pattern; just change label from 'Pending' to 'Draft'                        |

**Key insight:** All three fixes are alignment issues, not missing features. The correct implementations already exist — they just aren't wired up or contain wrong values.

---

## Common Pitfalls

### Pitfall 1: Forgetting the Web Purchase Type

**What goes wrong:** Fixing only `apps/mobile/src/types/index.ts` leaves `apps/web/src/types/purchase.ts` with `total` instead of `subtotal` on `PurchaseItem`.
**Why it happens:** The audit identified the mobile bug; the web type has the same mismatch.
**How to avoid:** Update both `PurchaseItem` interfaces — mobile and web. Check `purchase-sheet.tsx` in web to see if it renders item amounts.
**Warning signs:** Web purchase detail sheet showing NaN amounts after fix.

### Pitfall 2: Forgetting the Web statusColors Map

**What goes wrong:** Fixing only mobile status enums leaves web `columns.tsx` with `pending` key in statusColors/statusVariants maps, causing unstyled badges for `'draft'` purchases on web.
**Why it happens:** The statusColors object has `'pending'` as a key but backend now only returns `'draft'` — the key lookup `statusColors['draft']` is `undefined`.
**How to avoid:** Update `statusVariants` and `statusColors` in `apps/web/src/components/tables/purchases/columns.tsx` to replace `pending` key with `draft` key.
**Warning signs:** Web purchase table showing plain/unstyled badges for draft purchases.

### Pitfall 3: loginSchema import error if @objetiva/types not rebuilt

**What goes wrong:** `loginSchema` is already defined in `packages/types/src/index.ts` and exported, but if `dist/` is stale, the import won't resolve at runtime.
**Why it happens:** TypeScript monorepo with workspace packages may cache stale dist files.
**How to avoid:** After updating Login.tsx, run `pnpm build --filter=@objetiva/types` or just `pnpm --filter=apps/mobile build` which triggers dependency rebuilds through Turborepo.
**Warning signs:** TypeScript compile error "Module not found" or runtime "loginSchema is undefined".

### Pitfall 4: Mobile StatusBadge showing 'Draft' as gray (acceptable)

**What goes wrong:** The mobile StatusBadge's STATUS_COLOR_MAP doesn't have a 'draft' entry, so draft purchases render with gray badge.
**Why it happens:** STATUS_COLOR_MAP was built with 'pending' as the initial status key; 'draft' was never added.
**How to avoid:** Add `draft: 'gray'` entry to STATUS_COLOR_MAP in `apps/mobile/src/components/ui/StatusBadge.tsx` for explicit gray styling (or accept fallback behavior since the component already defaults to 'gray' for unknown statuses).
**Warning signs:** None functionally — gray is reasonable for draft state. Add the explicit mapping for clarity.

### Pitfall 5: HTML5 `required` kept but loginSchema validation added before it

**What goes wrong:** If loginSchema validation returns an error and setLoading(false) is called, but `required` HTML attribute also shows browser tooltip on empty fields, duplicate error messages appear.
**Why it happens:** Both browser validation and JS validation active simultaneously.
**How to avoid:** The existing pattern in Login.tsx sets `required` on the input AND does JS validation — this is intentional (belt-and-suspenders). loginSchema fires first in `handleSubmit`, returns before Supabase call. No conflict.

---

## Code Examples

### Fix 1: Login.tsx — Use loginSchema

```typescript
// apps/mobile/src/pages/Login.tsx
import { loginSchema } from '@objetiva/types' // add loginSchema

async function handleSubmit(e: FormEvent) {
  e.preventDefault()
  setLoading(true)
  setError(null)

  // Validate both email AND password before submitting
  const loginResult = loginSchema.safeParse({ email, password })
  if (!loginResult.success) {
    setError(loginResult.error.errors[0]?.message ?? 'Please check your credentials')
    setLoading(false)
    return
  }

  const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
  if (authError) {
    setError(authError.message)
  }
  setLoading(false)
}
```

### Fix 2: Mobile types — Status enum and PurchaseItem field

```typescript
// apps/mobile/src/types/index.ts

export interface PurchaseItem {
  id: string
  productId: string
  productName: string
  quantity: number
  unitCost: number
  subtotal: number // was: total: number
}

export interface Purchase {
  // ...
  status: 'draft' | 'ordered' | 'received' | 'cancelled' // was: 'pending' | ...
  // ...
}
```

### Fix 3: Mobile Purchases.tsx — Filter chips and item.subtotal

```typescript
// apps/mobile/src/pages/Purchases.tsx

const STATUS_FILTERS = [
  { label: 'Draft', value: 'draft' },        // was: { label: 'Pending', value: 'pending' }
  { label: 'Ordered', value: 'ordered' },
  { label: 'Received', value: 'received' },
  { label: 'Cancelled', value: 'cancelled' },
]

// In item rendering (line ~152-156):
{item.quantity} x {formatCurrency(item.unitCost)}
{formatCurrency(item.subtotal)}  // was: item.total
```

### Fix 4: Web purchase types and columns

```typescript
// apps/web/src/types/purchase.ts
export interface PurchaseItem {
  subtotal: number // was: total: number
}
export interface Purchase {
  status: 'draft' | 'ordered' | 'received' | 'cancelled' // was: 'pending' | ...
}

// apps/web/src/components/tables/purchases/columns.tsx
const statusVariants = {
  draft: 'secondary', // was: pending: 'secondary'
  ordered: 'default',
  received: 'default',
  cancelled: 'destructive',
} as const

const statusColors = {
  draft: 'bg-gray-100 text-gray-800 hover:bg-gray-100', // was: pending: 'bg-yellow-...'
  ordered: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
  received: 'bg-green-100 text-green-800 hover:bg-green-100',
  cancelled: 'bg-red-100 text-red-800 hover:bg-red-100',
} as const
```

### Fix 5: Mobile StatusBadge — add 'draft' mapping

```typescript
// apps/mobile/src/components/ui/StatusBadge.tsx
const STATUS_COLOR_MAP: Record<string, BadgeVariant> = {
  // Gray — draft/inactive
  draft: 'gray', // ADD this line
  inactive: 'gray',
  // ... rest unchanged
}
```

---

## State of the Art

| Old Approach                         | Current Approach                                  | When Changed                                                              | Impact                              |
| ------------------------------------ | ------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------- |
| HTML5 `required` for form validation | HTML5 `required` + explicit JS schema validation  | Phase 6 established pattern (emailSchema), Phase 9 extends to loginSchema | Capacitor native mode compatibility |
| Hardcoded status strings in frontend | Backend enum as source of truth, frontend aligned | Phase 9 fix                                                               | Zero false-empty filter results     |

---

## Open Questions

1. **Does the web purchase-sheet.tsx render item.total or item.subtotal?**
   - What we know: `apps/web/src/types/purchase.ts` has `PurchaseItem.total`. The web PurchaseSheet likely renders this field.
   - What's unclear: Whether the web detail sheet also shows NaN amounts (audit only flagged mobile).
   - Recommendation: Read `apps/web/src/components/tables/purchases/purchase-sheet.tsx` during planning and fix if it references `item.total`.

2. **Should STATUS_FILTERS label be 'Draft' or keep 'Pending' with value='draft'?**
   - What we know: The backend status is `'draft'` (initial unconfirmed purchase order). 'Draft' is the accurate label.
   - What's unclear: Whether users/product expects 'Pending' as display label with 'draft' as internal value.
   - Recommendation: Use `{ label: 'Draft', value: 'draft' }` — label should match the actual meaning. 'Pending' was a mistaken assumption from the frontend; 'draft' is what the business data represents.

---

## File Change Map

| File                                                          | Change                                                                            | Bug             |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------- |
| `apps/mobile/src/pages/Login.tsx`                             | Import loginSchema; replace emailSchema-only check with loginSchema.safeParse     | AUTH-02         |
| `apps/mobile/src/types/index.ts`                              | PurchaseItem.total → subtotal; Purchase.status 'pending' → 'draft'                | API-06          |
| `apps/mobile/src/pages/Purchases.tsx`                         | STATUS_FILTERS: 'Pending'/'pending' → 'Draft'/'draft'; item.total → item.subtotal | API-06, NAV-07  |
| `apps/mobile/src/components/ui/StatusBadge.tsx`               | Add draft: 'gray' to STATUS_COLOR_MAP                                             | API-06          |
| `apps/web/src/types/purchase.ts`                              | PurchaseItem.total → subtotal; Purchase.status 'pending' → 'draft'                | API-06          |
| `apps/web/src/components/tables/purchases/columns.tsx`        | statusVariants/statusColors: 'pending' key → 'draft' key                          | API-06          |
| `apps/web/src/components/tables/purchases/purchase-sheet.tsx` | If item.total referenced, change to item.subtotal                                 | API-06 (verify) |

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `apps/backend/src/db/generators/purchase.generator.ts` — confirms status enum: `'draft' | 'ordered' | 'received' | 'cancelled'` (no 'pending')
- Direct code inspection: `apps/backend/src/db/schema.ts` — confirms `purchase_items` has `subtotal` column, no `total` column
- Direct code inspection: `apps/backend/src/modules/purchases/dto/purchase-query.dto.ts` — confirms `@IsIn(['draft', 'ordered', 'received', 'cancelled'])` validator
- Direct code inspection: `packages/types/src/index.ts` — confirms `loginSchema` already exported with `password: z.string().min(1, 'Password is required')`
- Direct code inspection: `apps/mobile/src/pages/Login.tsx` — confirms only `emailSchema` used, no password validation
- Direct code inspection: `apps/mobile/src/types/index.ts` — confirms `PurchaseItem.total` (wrong) and `Purchase.status: 'pending' | ...` (wrong)
- Direct code inspection: `.planning/v1.0-MILESTONE-AUDIT.md` — audit precisely documents all three bugs with severity ratings

### Secondary (MEDIUM confidence)

- Capacitor native behavior with HTML5 `required`: Based on Capacitor's architecture (WKWebView on iOS, WebView on Android) — HTML5 form validation may be inconsistent. The audit confirms this as a known gap.

### Tertiary (LOW confidence)

- None needed — all bugs fully characterized from source code.

---

## Metadata

**Confidence breakdown:**

- Bug identification: HIGH — all bugs identified from direct source code inspection and audit report
- Fix patterns: HIGH — fixes derived from existing code patterns in same codebase (emailSchema pattern → loginSchema pattern)
- Scope: HIGH — only 6-7 files affected, no new dependencies, no migrations

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable codebase, no fast-moving dependencies)
