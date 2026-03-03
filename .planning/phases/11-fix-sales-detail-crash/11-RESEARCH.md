# Phase 11: Fix Sales Detail View Crash - Research

**Researched:** 2026-03-03
**Domain:** NestJS Drizzle ORM batch-loading + TypeScript frontend type alignment (web + mobile)
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- **Drop `customerEmail`** from both web SaleSheet and mobile Sales BottomSheet — field doesn't exist in DB `sales` table, success criteria confirms removal
- **Drop web Sale type string IDs** — deferred to Phase 12 (web entity ID type alignment is Phase 12 scope)
- **Discount stays at sale level only** — current DB structure is correct (discount on parent `sales` record, not per-item)
- **Batch-load saleItems in `findAll()`** mirroring the existing orders pattern — use `inArray(saleItems.saleId, saleIds)` with lookup map, zip items into sale rows
- **Implicit response type** like orders — just add items to data, no explicit SaleWithItems DTO needed. Frontend Sale types already expect `items` array
- **No item count column** in web sales table list view — items only visible in detail sheet/bottom sheet
- Keep current list views unchanged (sale number, customer, total, status, payment method, date)
- **Same format on both web and mobile** — product name, quantity x price, subtotal on the right
- Consistent layout pattern across platforms (no platform-specific variations for this fix)

### Claude's Discretion

- **`notes` field** — decide whether to add `notes` text column to DB sales table (purchases have notes, orders don't) or remove notes references from frontend views
- **SKU display** — decide whether to show saleItem SKU in detail views based on density and what other entity details show
- **Field naming alignment** — decide whether frontend types adopt DB names (`price`, `subtotal`) or map them to display names (`unitPrice`, `total`). Success criteria says use `item.price` not `unitPrice`
- **Customer section after dropping email** — decide what to show (name only, or name + customerId)
- **Empty items state** — handle gracefully if a sale has zero items in DB

### Deferred Ideas (OUT OF SCOPE)

- Web Sale type `id: string` → `id: number` alignment — Phase 12 scope
- Adding `customerEmail` to sales DB table for parity with orders — decided against, dropping instead
  </user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                        | Research Support                                                                                                                                                                                                                                                                                                              |
| ------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API-05 | Backend exposes /api/sales endpoint with mock data | The endpoint exists and works, but `findAll()` does not batch-load `saleItems` — the items array is always absent/undefined in list responses. The fix adds the same `inArray` + Map batch-load block that orders.service.ts uses. After the fix, the endpoint returns full sale objects with items, satisfying the contract. |

</phase_requirements>

---

## Summary

Phase 11 is a surgical bug fix with extremely well-understood scope. The root cause is a single omission: `sales.service.ts findAll()` fetches sale rows but never loads the associated `sale_items` rows, so every Sale object in the paginated list has no `items` property. When the web SaleSheet or mobile Sales BottomSheet tries to render `sale.items.map(...)` it crashes with a TypeError because `items` is `undefined`.

The fix has two parts. The backend needs the same three-block pattern that `orders.service.ts` already uses (lines 92-118): collect IDs from the page result, `inArray` query `sale_items` filtered by those IDs, build a `Map<saleId, items[]>` lookup, zip items into each sale row. The frontend types and views need field-name corrections: both `SaleItem.unitPrice` → `price` and `SaleItem.total` → `subtotal` to match what the DB schema (`sale_items` table) actually provides, plus removal of all `sale.customerEmail` and `sale.notes` references (neither column exists on the `sales` table).

The discretionary decisions are simple: (1) remove `notes` references from frontend rather than migrating DB — no migration needed, less work, and purchases is the only entity that has notes anyway; (2) do not show SKU in item lines — other detail sheets (order-sheet, purchase-sheet) don't show SKU either; (3) customer section shows name only after email removal — `customerId` is an internal integer with no display value to users.

**Primary recommendation:** Copy the orders batch-load block verbatim into `sales.service.ts`, add `inArray` to the import, then align web and mobile types/views with the actual DB column names (`price`, `subtotal`) and drop the two phantom fields (`customerEmail`, `notes`).

---

## Standard Stack

### Core

| Library     | Version             | Purpose                          | Why Standard                                 |
| ----------- | ------------------- | -------------------------------- | -------------------------------------------- |
| drizzle-orm | (project-installed) | ORM query builder for PostgreSQL | Already used throughout all backend services |
| NestJS      | (project-installed) | Backend framework                | Entire backend is NestJS                     |
| TypeScript  | strict mode         | Type safety                      | Project-wide setting                         |

### Supporting

| Library                        | Version          | Purpose                       | When to Use                                                |
| ------------------------------ | ---------------- | ----------------------------- | ---------------------------------------------------------- |
| `inArray` (drizzle-orm export) | same drizzle-orm | WHERE id IN (...) batch query | Already used in orders.service.ts and purchases.service.ts |

### Alternatives Considered

| Instead of                       | Could Use             | Tradeoff                                                                                                                                         |
| -------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| inArray batch-load               | JOIN with aggregation | JOIN produces one row per item (row multiplication), requires manual de-duplication. Two-query approach is established pattern in this codebase. |
| Remove frontend notes/email refs | Add DB columns        | DB migration, seeder update, extra work with no value — the sales table does not have these fields and the domain doesn't require them           |

**Installation:** No new packages needed. `inArray` is already in drizzle-orm, already imported in orders.service.ts.

---

## Architecture Patterns

### Recommended Project Structure

No structural changes needed. All edits are within existing files:

```
apps/backend/src/modules/sales/
└── sales.service.ts              # Add batch-load block to findAll()

apps/web/src/
├── types/sale.ts                 # Fix SaleItem field names, remove customerEmail/notes
└── components/tables/sales/
    └── sale-sheet.tsx            # Remove customerEmail, fix item.unitPrice → item.price, item.total → item.subtotal

apps/mobile/src/
├── types/index.ts                # Fix SaleItem field names, remove customerEmail/notes from Sale
└── pages/Sales.tsx               # Remove customerEmail section, fix item.unitPrice → item.price, item.total → item.subtotal
```

### Pattern 1: Batch-Load Items in findAll() (orders pattern)

**What:** After the paginated data query, extract IDs from the page, run a single `inArray` query against the child table, build a Map for O(1) lookup, then zip items into each parent row.

**When to use:** Any `findAll()` that needs to return child entity arrays without N+1 queries.

**Example (from `orders.service.ts` lines 92-118, verified from source):**

```typescript
// Source: apps/backend/src/modules/orders/orders.service.ts (lines 92-118)
// Batch load items for all orders on this page
const orderIds = data.map(o => o.id)
const allItems =
  orderIds.length > 0
    ? await this.drizzle.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : []

// Build lookup map
const itemsByOrderId = new Map<number, (typeof allItems)[number][]>()
for (const item of allItems) {
  const list = itemsByOrderId.get(item.orderId) ?? []
  list.push(item)
  itemsByOrderId.set(item.orderId, list)
}

// Zip items into order rows
const dataWithItems = data.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.id) ?? [],
}))
```

For sales, the direct translation is:

```typescript
// To add to sales.service.ts findAll(), after the data query and before totalPages calculation
const saleIds = data.map(s => s.id)
const allItems =
  saleIds.length > 0
    ? await this.drizzle.db.select().from(saleItems).where(inArray(saleItems.saleId, saleIds))
    : []

const itemsBySaleId = new Map<number, (typeof allItems)[number][]>()
for (const item of allItems) {
  const list = itemsBySaleId.get(item.saleId) ?? []
  list.push(item)
  itemsBySaleId.set(item.saleId, list)
}

const dataWithItems = data.map(sale => ({
  ...sale,
  items: itemsBySaleId.get(sale.id) ?? [],
}))

// Then return dataWithItems instead of data:
return new PaginatedResponseDto(dataWithItems, { total, page, limit, totalPages })
```

Note: `inArray` must be added to the import line in `sales.service.ts` (it is currently NOT imported there — the current import only has `eq, ilike, or, and, gte, lte, desc, asc, count, sql, Column`).

### Pattern 2: Frontend Type Alignment to DB Schema

**What:** Frontend TypeScript interfaces must mirror actual DB column names returned by the backend.

**DB `sale_items` columns (from schema.ts, verified):**

- `id` (serial)
- `saleId` (integer)
- `productId` (integer)
- `productName` (varchar)
- `sku` (varchar)
- `quantity` (integer)
- `price` (doublePrecision) — NOT `unitPrice`
- `subtotal` (doublePrecision) — NOT `total`

**DB `sales` columns (from schema.ts, verified):**

- `id`, `saleNumber`, `customerId`, `customerName`, `subtotal`, `tax`, `discount`, `total`, `paymentMethod`, `status`, `createdAt`, `updatedAt`
- NO `customerEmail` column
- NO `notes` column

**Current (broken) web type (`apps/web/src/types/sale.ts`):**

```typescript
export interface SaleItem {
  id: string         // Phase 12 will fix id: string → number; leave as-is
  productId: string  // Phase 12 scope; leave as-is
  productName: string
  quantity: number
  unitPrice: number  // WRONG — DB column is `price`
  total: number      // WRONG — DB column is `subtotal`
}

export interface Sale {
  id: string          // Phase 12 scope
  ...
  customerEmail: string  // WRONG — not in DB
  notes: string          // WRONG — not in DB
}
```

**Fixed web type:**

```typescript
export interface SaleItem {
  id: string // kept as-is (Phase 12 handles)
  productId: string // kept as-is (Phase 12 handles)
  productName: string
  quantity: number
  price: number // renamed from unitPrice — matches DB
  subtotal: number // renamed from total — matches DB
}

export interface Sale {
  id: string
  saleNumber: string
  customerName: string
  // customerEmail: removed — not in DB
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  // notes: removed — not in DB
  createdAt: string
}
```

**Current (broken) mobile type (`apps/mobile/src/types/index.ts` lines 81-104):**

```typescript
export interface SaleItem {
  id: number
  productId: number
  productName: string
  quantity: number
  unitPrice: number  // WRONG — DB column is `price`
  total: number      // WRONG — DB column is `subtotal`
}

export interface Sale {
  ...
  customerEmail: string  // WRONG — not in DB
  notes: string          // WRONG — not in DB
}
```

**Fixed mobile type:**

```typescript
export interface SaleItem {
  id: number
  productId: number
  productName: string
  quantity: number
  price: number // renamed from unitPrice
  subtotal: number // renamed from total
}

export interface Sale {
  id: number
  saleNumber: string
  customerName: string
  // customerEmail: removed
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  // notes: removed
  createdAt: string
}
```

### Pattern 3: View Field Reference Corrections

**Web `sale-sheet.tsx` changes needed (from source read):**

- Line 59: Remove `<p className="text-sm text-muted-foreground">{sale.customerEmail}</p>` — and the surrounding Customer section if it becomes name-only (keep name, remove email line)
- Line 74: Change `item.unitPrice` → `item.price`
- Line 77: Change `item.total` → `item.subtotal`
- Lines 120-129: Remove the notes section (`{sale.notes && (...)}`), since `notes` will not be on the Sale type after fix

**Mobile `Sales.tsx` changes needed (from source read):**

- Lines 118-121: Remove the "Email" grid cell (`<div className="col-span-2">...</div>` with `selectedSale.customerEmail`)
- Line 133: Change `item.unitPrice` → `item.price`
- Line 137: Change `item.total` → `item.subtotal`
- Lines 166-170: Remove the notes block (`{selectedSale.notes && (...)}`)

### Discretionary Decisions (Claude's Discretion)

**`notes` field resolution:** Remove all `notes` references from frontend types and views. The `sales` DB table has no `notes` column (verified in schema.ts). The `purchases` table has `notes` (and it's shown in purchase detail), but sales never had it. No DB migration needed. The web SaleSheet shows a notes section (lines 120-129) and mobile Sales.tsx shows one (lines 166-170) — both should be removed.

**SKU display:** Do not show SKU. The `order_items` and `purchase_items` schemas both have SKU columns, and neither `order-sheet.tsx` (web orders detail) nor the mobile Orders BottomSheet display SKU per item. Consistent with all other detail views.

**Customer section after email removal:** Show name only. The `customerId` is an internal integer FK with no display value. All other entity detail views (orders, purchases) show customer/supplier name as a single text value. One-line customer section is sufficient.

**Empty items state:** Render a graceful empty state instead of an empty list. When `sale.items.length === 0`, show a small placeholder like `<p className="text-sm text-muted-foreground">No items</p>` inside the items section div. This prevents a visually confusing blank space. Both web and mobile should handle this.

### Anti-Patterns to Avoid

- **Importing `inArray` without the guard:** Must keep the `saleIds.length > 0 ? ... : []` guard before the `inArray` call. Drizzle-ORM throws for `inArray(col, [])` with an empty array. This guard is already established practice (see Phase 07 decision note and orders.service.ts line 95).
- **Changing `findOne()`:** The `findOne()` method already correctly loads items with a two-query pattern. Do not touch it.
- **Touching list view columns:** The sales table list view (columns.tsx for web, card layout for mobile) does not need to change. Items are only shown in the detail sheet/bottom sheet.
- **Adding new DTO types:** No explicit `SaleWithItems` DTO is needed. The implicit type inferred from the spread (`{ ...sale, items }`) is consistent with orders and purchases. TypeScript infers the shape from usage.

---

## Don't Hand-Roll

| Problem                          | Don't Build                     | Use Instead                                  | Why                                                                                           |
| -------------------------------- | ------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Batch fetching items for N sales | N+1 individual queries per sale | `inArray` + Map lookup (already in codebase) | N queries for N sales on a page; one query for all. Established pattern in orders.service.ts. |
| Empty array guard for inArray    | Custom SQL string building      | `length > 0` ternary with `[]` fallback      | Drizzle-ORM rejects inArray with empty array — guard is mandatory                             |

**Key insight:** Every pattern needed here already exists in this codebase. This is a copy-and-adapt task, not a design task.

---

## Common Pitfalls

### Pitfall 1: Missing `inArray` import in sales.service.ts

**What goes wrong:** TypeScript compile error — `inArray` is not exported from the current import line in `sales.service.ts`.

**Why it happens:** `sales.service.ts` was written before the batch-load pattern was established. Its import line (`eq, ilike, or, and, gte, lte, desc, asc, count, sql, Column`) does not include `inArray`.

**How to avoid:** Add `inArray` to the import from `'drizzle-orm'` at line 2 of `sales.service.ts`. Verify with `pnpm tsc --noEmit` after the change.

**Warning signs:** TypeScript error `Module '"drizzle-orm"' has no exported member 'inArray'` — but this would only appear if the import was removed from drizzle-orm itself, which hasn't happened. The actual risk is forgetting to add `inArray` to the import line.

### Pitfall 2: Returning `data` instead of `dataWithItems`

**What goes wrong:** After adding the batch-load block, the final `return` still passes `data` (without items) instead of `dataWithItems` (with items). No TypeScript error; the items array just stays undefined.

**Why it happens:** The batch-load block computes `dataWithItems` but the `return new PaginatedResponseDto(data, ...)` line was not updated.

**How to avoid:** Verify the return statement uses `dataWithItems` after adding the batch-load block.

### Pitfall 3: Field name mismatch between frontend type and view template

**What goes wrong:** TypeScript error at the component level after fixing the type — e.g., `item.unitPrice` in the template becomes a type error after `SaleItem.unitPrice` is removed.

**Why it happens:** Type fixes propagate errors to all usage sites, which is correct TypeScript behavior. These are the exact lines to fix.

**How to avoid:** Fix types first, then use TypeScript compile (`pnpm tsc --noEmit`) to find all usage sites automatically. There are exactly two known usage sites per platform (items loop `unitPrice` and `total` references).

**Warning signs:** TypeScript errors at `sale-sheet.tsx` and `Sales.tsx` after the type fix — these are expected and guide the view fixes.

### Pitfall 4: Forgetting the empty-array guard for `inArray`

**What goes wrong:** Runtime SQL error if the paginated page returns zero sales (empty `data` array). `inArray(saleItems.saleId, [])` produces invalid SQL.

**Why it happens:** Drizzle does not sanitize empty arrays in `inArray`.

**How to avoid:** Always use `saleIds.length > 0 ? await ... .where(inArray(...)) : []`. This is already the pattern in orders.service.ts (line 95) and purchases.service.ts (line 96). Copy it verbatim.

---

## Code Examples

Verified patterns from source files read during research:

### Backend: Complete findAll() batch-load block

```typescript
// Source: apps/backend/src/modules/sales/sales.service.ts (TO ADD after data query, before totalPages)
// Mirrors apps/backend/src/modules/orders/orders.service.ts lines 92-118 exactly

// Batch load items for all sales on this page
const saleIds = data.map(s => s.id)
const allItems =
  saleIds.length > 0
    ? await this.drizzle.db.select().from(saleItems).where(inArray(saleItems.saleId, saleIds))
    : []

// Build lookup map
const itemsBySaleId = new Map<number, (typeof allItems)[number][]>()
for (const item of allItems) {
  const list = itemsBySaleId.get(item.saleId) ?? []
  list.push(item)
  itemsBySaleId.set(item.saleId, list)
}

// Zip items into sale rows
const dataWithItems = data.map(sale => ({
  ...sale,
  items: itemsBySaleId.get(sale.id) ?? [],
}))

const totalPages = Math.ceil(total / limit)

return new PaginatedResponseDto(dataWithItems, { total, page, limit, totalPages })
```

Also update the `findAll()` import to include `inArray`:

```typescript
// Line 2 of sales.service.ts — add inArray
import { eq, ilike, or, and, gte, lte, desc, asc, count, sql, Column, inArray } from 'drizzle-orm'
```

### Web: Corrected SaleItem type

```typescript
// Source: apps/web/src/types/sale.ts (replacement)
export interface SaleItem {
  id: string // Phase 12 handles id: string → number
  productId: string // Phase 12 handles productId: string → number
  productName: string
  quantity: number
  price: number // was unitPrice — now matches DB sale_items.price
  subtotal: number // was total — now matches DB sale_items.subtotal
}

export interface Sale {
  id: string
  saleNumber: string
  customerName: string
  // customerEmail removed — no DB column
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  paymentMethod: 'cash' | 'card' | 'transfer' | 'credit'
  status: 'completed' | 'refunded' | 'partial_refund'
  // notes removed — no DB column
  createdAt: string
}
```

### Web: Corrected sale-sheet.tsx items loop and customer section

```typescript
// Customer section — name only (email removed)
<div>
  <h3 className="text-sm font-medium mb-2">Customer</h3>
  <div className="space-y-1">
    <p className="text-sm font-medium">{sale.customerName}</p>
  </div>
</div>

// Items loop — field names fixed
{sale.items.length === 0 ? (
  <p className="text-sm text-muted-foreground">No items</p>
) : (
  sale.items.map(item => (
    <div key={item.id} className="flex justify-between items-start">
      <div className="flex-1">
        <p className="text-sm font-medium">{item.productName}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} x {formatCurrency(item.price)}       {/* was item.unitPrice */}
        </p>
      </div>
      <p className="text-sm font-medium">{formatCurrency(item.subtotal)}</p>  {/* was item.total */}
    </div>
  ))
)}
// Notes section: remove entirely
```

### Mobile: Corrected Sales.tsx items loop and customer section

```typescript
// Customer grid cell — email cell removed
<div>
  <p className="text-xs text-muted-foreground">Customer</p>
  <p className="text-sm font-medium text-foreground">{selectedSale.customerName}</p>
</div>
// Remove the col-span-2 "Email" div entirely

// Items loop — field names fixed
{selectedSale.items.length === 0 ? (
  <p className="text-sm text-muted-foreground">No items</p>
) : (
  selectedSale.items.map(item => (
    <div key={item.id} className="flex items-center justify-between text-sm">
      <div className="flex-1 mr-2">
        <span className="text-foreground">{item.productName}</span>
        <span className="text-muted-foreground ml-2">
          {item.quantity} x {formatCurrency(item.price)}       {/* was item.unitPrice */}
        </span>
      </div>
      <span className="text-foreground font-medium">
        {formatCurrency(item.subtotal)}                         {/* was item.total */}
      </span>
    </div>
  ))
)}
// Notes section: remove entirely
```

---

## State of the Art

| Old Approach                           | Current Approach                      | When Changed               | Impact                                                                                                                                   |
| -------------------------------------- | ------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Mock data served from in-memory arrays | Drizzle ORM + PostgreSQL real queries | Phase 5                    | The `findOne()` two-query pattern was added then; `findAll()` batch-load was added for orders/purchases in Phase 7 but skipped for sales |
| N+1 queries for detail sheets          | Batch inArray + Map lookup            | Phase 7 (orders/purchases) | Phase 11 brings sales to parity                                                                                                          |

**Deprecated/outdated:**

- `sale.customerEmail` in frontend: was a placeholder field that never had a DB backing — remove it
- `SaleItem.unitPrice` in frontend: was a display-name alias that never matched the DB column — replace with `price`
- `SaleItem.total` (item-level) in frontend: was a display-name alias that never matched the DB column `subtotal` — replace with `subtotal`
- `sale.notes` in frontend: was a speculative field copied from Purchase — never had a DB backing — remove it

---

## Open Questions

1. **Does the web build currently fail due to TypeScript errors, or does it compile despite the wrong field names?**
   - What we know: `sale.customerEmail` and `item.unitPrice` are on the current Sale/SaleItem interfaces, so no TypeScript errors exist today — the types describe phantom fields that the runtime data doesn't have
   - What's unclear: whether the web build catches this at runtime or only when the sheet is opened
   - Recommendation: Proceed with the fix as described; TypeScript changes will surface any missed usage sites at compile time

2. **Are there any other files beyond sale-sheet.tsx and Sales.tsx that reference `sale.customerEmail`, `item.unitPrice`, `sale.notes`?**
   - What we know: CONTEXT.md identifies these two files; a grep should confirm no other files reference these fields before coding
   - Recommendation: Planner should include a grep step at the start of the plan to confirm scope

---

## Sources

### Primary (HIGH confidence)

- `apps/backend/src/modules/sales/sales.service.ts` — read directly; confirmed findAll() has no batch-load block; confirmed `saleItems` is imported but `inArray` is not
- `apps/backend/src/modules/orders/orders.service.ts` — read directly; lines 92-118 are the batch-load pattern to copy
- `apps/backend/src/modules/purchases/purchases.service.ts` — read directly; lines 93-119 confirm pattern is identical
- `apps/backend/src/db/schema.ts` — read directly; confirmed `sale_items` has `price` and `subtotal` (not `unitPrice`/`total`); confirmed `sales` table has NO `customerEmail` or `notes` columns
- `apps/web/src/types/sale.ts` — read directly; confirmed broken field names (`unitPrice`, `total`, `customerEmail`, `notes`)
- `apps/mobile/src/types/index.ts` — read directly; confirmed same broken field names in SaleItem and Sale interfaces
- `apps/web/src/components/tables/sales/sale-sheet.tsx` — read directly; confirmed exact lines using `customerEmail` (59), `unitPrice` (74), `item.total` (77), notes block (120-129)
- `apps/mobile/src/pages/Sales.tsx` — read directly; confirmed exact lines using `customerEmail` (120), `unitPrice` (133), `item.total` (137), notes block (166-170)

### Secondary (MEDIUM confidence)

None needed — all critical information sourced directly from the codebase.

---

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — pattern copied verbatim from existing working code (orders, purchases)
- Pitfalls: HIGH — identified from existing pattern implementations and the Phase 07 decision log (empty inArray guard)

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable codebase, low churn)
