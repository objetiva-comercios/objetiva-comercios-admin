# Phase 12: Fix Dashboard Links, Web Types & Doc Sync - Research

**Researched:** 2026-03-03
**Domain:** React/Next.js component refactoring, TypeScript type migration, documentation sync
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Dead link handling:**

- Recent Orders items open the existing `order-sheet` component inline (side panel) instead of navigating to a non-existent `/orders/{id}` page
- Low Stock Alert items open the existing `product-sheet` component inline instead of navigating to a non-existent `/inventory/{id}` page
- Reuse existing sheet components (`order-sheet.tsx`, `product-sheet.tsx`) as-is — no new detail views
- Convert `<Link>` elements to clickable rows that trigger sheet open state

**Mobile currency display:**

- MXN with es-MX locale is the correct currency/locale for the business
- Replace local `new Intl.NumberFormat('en-US', { currency: 'USD' })` with shared `formatCurrency` from `@objetiva/utils`
- Only fix currency formatting — plain number formatting (product counts, order counts) stays as-is

**Web entity ID type migration:**

- All entity type `id` fields become `number` (matching Drizzle serial): product.ts, order.ts, sale.ts, purchase.ts, inventory.ts
- All nested item type `id` fields (SaleItem, PurchaseItem, OrderItem) also become `number`
- All foreign key fields (productId, orderId, etc.) also become `number`
- Dashboard types already correct (`id: number`) — no change needed there

**Documentation sync:**

- Sync REQUIREMENTS.md checkboxes for MONO-01/02/03, DOC-01/02/04
- Sync ROADMAP.md plan checkboxes for Phases 6, 7, 10

### Claude's Discretion

- URL parameter ID handling strategy (parseInt at boundary vs other approach)
- How to wire sheet state management in dashboard components (useState, URL state, etc.)
- Exact TypeScript refactoring approach for ripple effects from id type changes

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                                                                     | Research Support                                                                                                                                      |
| ------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASH-01 | Dashboard displays key metrics (sales, inventory, orders)                                       | Dashboard components verified working; fix makes clickable rows non-navigating to dead URLs while preserving card display                             |
| NAV-07  | All sections are navigable (Dashboard, Articles, Purchases, Sales, Orders, Inventory, Settings) | Converting dead links to sheet triggers keeps dashboard functional without routing to nonexistent pages                                               |
| MONO-03 | TypeScript workspace resolution works across packages                                           | Web entity type id migration (`string` → `number`) aligns web types with backend Drizzle serial — proves workspace types are the authoritative source |
| UI-04   | Mobile and web feel cohesive despite platform-specific implementations                          | Mobile Dashboard using `formatCurrency` from `@objetiva/utils` (MXN/es-MX) matches web formatting; cohesive currency display across platforms         |

</phase_requirements>

## Summary

Phase 12 is a focused cleanup phase with four independently-scoped work areas: (1) converting dashboard dead links to in-place sheet displays, (2) migrating web entity ID types from `string` to `number`, (3) replacing the mobile Dashboard's local USD currency formatter with the shared `formatCurrency`, and (4) syncing stale documentation checkboxes. None of these areas has external library complexity — they are all mechanical edits to existing code patterns already established in the project.

The most architecturally interesting area is the dashboard dead-link fix. The current `recent-orders.tsx` and `low-stock-alerts.tsx` are Server Components (no `'use client'` directive) that render `<Link>` elements pointing to non-existent routes. To open sheets, they must become Client Components managing `useState`. This pattern is already established in `orders-client.tsx`, `articles-client.tsx`, and `inventory-client.tsx`. The critical sub-challenge is data mismatch: `RecentOrder` and `LowStockItem` (from `dashboard.ts`) contain only summary fields, while `OrderSheet` expects a full `Order` and `ProductSheet` expects a full `Product`. The resolution is to fetch the full entity by ID on row click via the existing backend endpoints (`GET /api/orders/:id`, `GET /api/products/:id`).

The type migration is purely mechanical: five web type files (`order.ts`, `product.ts`, `sale.ts`, `purchase.ts`, `inventory.ts`) have `id: string` and foreign key fields typed as `string`. Changing these to `number` will cascade to 16 consuming files identified in the codebase. TypeScript strict mode is enabled globally, so the compiler will surface all breakage immediately. The only real risk is that `key={order.id}` in JSX works equally with numbers (React accepts numeric keys), so no behavioral changes are expected — only type corrections.

**Primary recommendation:** Implement as a single plan with four sequential tasks ordered by dependency risk: mobile currency fix first (zero risk, no ripple), doc sync second (doc-only), type migration third (compile-verifiable), dashboard sheet wiring last (most behavior change).

## Standard Stack

### Core

| Library                            | Version                                | Purpose                                                   | Why Standard                                                                                      |
| ---------------------------------- | -------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| React `useState`                   | (Next.js 14.2 bundled)                 | Sheet open/close state in converted dashboard components  | Already used in all table client components (`orders-client.tsx`, `articles-client.tsx`, etc.)    |
| shadcn `Sheet`                     | (project copy in `src/components/ui/`) | Side-panel detail views                                   | Already used in `order-sheet.tsx`, `product-sheet.tsx`, `inventory-sheet.tsx`                     |
| `@objetiva/utils` `formatCurrency` | 1.0.0 (workspace)                      | Shared MXN/es-MX currency formatter                       | Already imported by all mobile pages except Dashboard.tsx; already imported by all web components |
| TypeScript                         | 5.3.x (strict mode)                    | Type checking after `id: string` → `id: number` migration | Strict mode will surface all ripple breakage at compile time                                      |

### Supporting

| Library                                       | Version | Purpose                                              | When to Use                                                        |
| --------------------------------------------- | ------- | ---------------------------------------------------- | ------------------------------------------------------------------ |
| `fetchWithAuth` (web `lib/api.ts`)            | local   | Fetch full `Order`/`Product` by ID for sheet display | When clicking a dashboard row to get the full entity for the sheet |
| `fetchWithAuth` pattern (mobile `lib/api.ts`) | local   | Same pattern, used on mobile for data fetching       | Not needed for this phase on mobile (only formatter change)        |

### Alternatives Considered

| Instead of                            | Could Use                               | Tradeoff                                                                                                                    |
| ------------------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Fetch full entity on row click (lazy) | Pre-fetch all items in server component | Lazy is simpler; pre-fetching would require lifting dashboard data shape or another API call at render                      |
| `useState` for sheet control          | URL state (searchParams)                | URL state adds complexity, browser history entries; useState matches established pattern across all table client components |

## Architecture Patterns

### Recommended Project Structure

No new files or directories are needed. All changes are edits to existing files:

```
apps/web/src/
├── components/dashboard/
│   ├── recent-orders.tsx        # Add 'use client', useState, OrderSheet, fetch-on-click
│   └── low-stock-alerts.tsx     # Add 'use client', useState, ProductSheet, fetch-on-click
├── types/
│   ├── order.ts                 # id: string → number, productId: string → number
│   ├── product.ts               # id: string → number
│   ├── sale.ts                  # id: string → number, productId: string → number
│   ├── purchase.ts              # id: string → number, productId: string → number
│   └── inventory.ts             # id: string → number, productId: string → number
apps/mobile/src/
└── pages/Dashboard.tsx          # Remove `currency` local var, import formatCurrency
.planning/
├── REQUIREMENTS.md              # Sync MONO-01/02/03, DOC-01/02/04 checkboxes to [x]
└── ROADMAP.md                   # Sync Phase 6 (all 4 plans), Phase 7 (all 2 plans), Phase 10 (10-04) checkboxes to [x]
```

### Pattern 1: Server Component → Client Component for Sheet State

**What:** Dashboard list components currently have no `'use client'` directive. To manage `useState` (sheet open/close, selected entity), they must become Client Components.

**When to use:** Any component that needs interactive state but currently renders as Server Component.

**Example (established in `orders-client.tsx`):**

```typescript
'use client'

import { useState } from 'react'
import { OrderSheet } from '@/components/tables/orders/order-sheet'
import type { Order } from '@/types/order'

// Adapted pattern for dashboard recent-orders.tsx:
export function RecentOrders({ orders }: RecentOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleRowClick = async (orderId: number) => {
    // Fetch full Order from backend (RecentOrder lacks items, email, etc.)
    const order = await fetchOrderById(orderId)
    setSelectedOrder(order)
    setSheetOpen(true)
  }

  return (
    <>
      <Card>
        {orders.map(order => (
          <div
            key={order.id}
            onClick={() => handleRowClick(order.id)}
            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
          >
            {/* row content */}
          </div>
        ))}
      </Card>
      <OrderSheet order={selectedOrder} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
```

**Key change:** `<Link href={...}>` → `<div onClick={...} className="... cursor-pointer">`. Remove `next/link` import. Add `'use client'`, `useState`, `OrderSheet`/`ProductSheet` import.

### Pattern 2: Fetch Full Entity by ID on Row Click (Client-side fetch for missing fields)

**What:** `RecentOrder` only has `{id, orderNumber, customerName, total, status, createdAt}`. `OrderSheet` needs the full `Order` (items, customerEmail, subtotal, tax, shippingAddress, updatedAt). Backend has `GET /api/orders/:id` and `GET /api/products/:id`.

**When to use:** When a summary type lacks fields a detail component needs, and the backend supports individual entity lookup.

**Example (web):**

```typescript
// In recent-orders.tsx (becomes 'use client')
async function fetchOrderById(id: number): Promise<Order> {
  const supabase = createBrowserClient(...)
  const { data: { session } } = await supabase.auth.getSession()
  const response = await fetch(`${API_BASE_URL}/api/orders/${id}`, {
    headers: { Authorization: `Bearer ${session?.access_token}` }
  })
  return response.json()
}
```

**NOTE:** The web `fetchWithAuth` in `lib/api.ts` uses `createClient()` (server-side Supabase). Client components need the browser Supabase client. The existing `fetchWithAuth` in `apps/mobile/src/lib/api.ts` is the correct reference for client-side auth fetch. For the web dashboard client components, the implementation should use the browser Supabase client factory (`createBrowserClient` / `@/lib/supabase/client`).

**Simpler alternative:** Add a `fetchOrderById(id)` and `fetchProductById(id)` helper to `apps/web/src/lib/api.ts` that works client-side, or add a separate client-side fetch utility. This is at Claude's discretion.

**LowStockItem → Product mapping:** `LowStockItem` has `productId: number`. The `product-sheet.tsx` needs a full `Product`. The endpoint is `GET /api/products/:id`. Use `item.productId` (not `item.id` which is the inventory row id) to fetch the product.

### Pattern 3: Web Type ID Migration (string → number)

**What:** Five type files have `id: string` and FK fields as `string`. Change to `number` to match backend Drizzle `serial()` columns.

**Impact matrix (verified by grep — 16 consuming files):**

- `order.ts` (Order, OrderItem) → used in: `order-sheet.tsx`, `orders-client.tsx`, `columns.tsx` (orders), `recent-orders.tsx` (via RecentOrder in dashboard.ts, already number), `lib/api.ts`
- `product.ts` (Product) → used in: `product-sheet.tsx`, `articles-client.tsx`, `columns.tsx` (products), `low-stock-alerts.tsx` (via LowStockItem in dashboard.ts, already number), `lib/api.ts`
- `sale.ts` (Sale, SaleItem) → used in: `sale-sheet.tsx`, `sales-client.tsx`, `columns.tsx` (sales), `lib/api.ts`
- `purchase.ts` (Purchase, PurchaseItem) → used in: `purchase-sheet.tsx`, `purchases-client.tsx`, `columns.tsx` (purchases), `lib/api.ts`
- `inventory.ts` (Inventory) → used in: `inventory-sheet.tsx`, `inventory-client.tsx`, `columns.tsx` (inventory), `lib/api.ts`

**TypeScript behavior:** `key={item.id}` in JSX accepts both `string` and `number` — no behavioral change. `parseFloat(row.getValue('total'))` in columns.tsx is for a numeric value field, not the id — not affected. No `parseInt` calls on IDs were found in consuming files.

**Example migration:**

```typescript
// Before (order.ts)
export interface OrderItem {
  id: string
  productId: string
  // ...
}
export interface Order {
  id: string
  // ...
}

// After (order.ts)
export interface OrderItem {
  id: number
  productId: number
  // ...
}
export interface Order {
  id: number
  // ...
}
```

### Pattern 4: Mobile Currency Formatter Replacement

**What:** `apps/mobile/src/pages/Dashboard.tsx` line 7 has:

```typescript
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
```

Used in 3 places: `currency.format(stats.todayRevenue)`, `currency.format(purchases.pendingValue)`, `currency.format(stats.weekRevenue)`.

**Replace with:**

```typescript
import { formatCurrency } from '@objetiva/utils'
// Then:
{
  formatCurrency(stats.todayRevenue)
}
{
  formatCurrency(purchases.pendingValue)
}
{
  formatCurrency(stats.weekRevenue)
}
```

`@objetiva/utils` is already in `apps/mobile/package.json` as a workspace dependency. All other mobile pages already import `formatCurrency` from `@objetiva/utils`. This is a drop-in replacement.

### Pattern 5: Documentation Checkbox Sync

**What:** Two documentation files have stale checkboxes. The traceability table in REQUIREMENTS.md already marks these as "Complete", but the checkbox items themselves are `[ ]`.

**REQUIREMENTS.md items to change to `[x]`:**

- `MONO-01`: `[ ]` → `[x]` (Monorepo with pnpm workspaces — delivered in Phase 1)
- `MONO-02`: `[ ]` → `[x]` (Turborepo configured — delivered in Phase 1)
- `MONO-03`: `[ ]` → `[x]` (TypeScript workspace resolution — delivered in Phase 1, extended in Phase 12)
- `DOC-01`: `[ ]` → `[x]` (README covers installation — delivered in Phase 1-04)
- `DOC-02`: `[ ]` → `[x]` (README covers env var setup — delivered in Phase 1-04 and Phase 7)
- `DOC-04`: `[ ]` → `[x]` (Env var examples/.env.example — delivered in Phase 7)

**ROADMAP.md plan checkboxes to change to `[x]`:**

- Phase 6: All 4 plan checkboxes: `06-01`, `06-02`, `06-03`, `06-04` (Phase 6 marked Complete in progress table)
- Phase 7: Both plan checkboxes: `07-01`, `07-02` (Phase 7 marked Complete in progress table)
- Phase 10: Plan `10-04` checkbox (Phase 10 marked Complete in progress table; 10-01/02/03 already `[x]`)

### Anti-Patterns to Avoid

- **Server Component importing client hooks:** Adding `useState` without adding `'use client'` will crash Next.js with a runtime error. Always add `'use client'` at the top when adding state.
- **Using server-side Supabase client in a Client Component:** `createClient()` from `@/lib/supabase/server` uses cookies and is only valid in Server Components. Client Components must use the browser client factory (`@/lib/supabase/client`).
- **Assuming `item.id` for product lookup:** In `LowStockItem`, `id` is the inventory row ID, not the product ID. Use `item.productId` to fetch `GET /api/products/:id`.
- **Changing `key={}` props:** React accepts numeric keys. No change needed to map/list key props after type migration.
- **Cascading type change across mobile types:** Mobile types in `apps/mobile/src/types/index.ts` already have `id: number` (aligned in Phase 10). Do NOT change mobile types — they are already correct.

## Don't Hand-Roll

| Problem                     | Don't Build                         | Use Instead                                     | Why                                                                                        |
| --------------------------- | ----------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Currency formatting         | Custom `new Intl.NumberFormat(...)` | `formatCurrency` from `@objetiva/utils`         | Shared, default MXN/es-MX, consistent across platforms — exactly what Phase 10 established |
| Sheet UI component          | Custom modal/drawer                 | Existing `order-sheet.tsx`, `product-sheet.tsx` | Already built, styled, tested — CONTEXT.md explicitly locked this decision                 |
| Detail view page            | New `/dashboard/orders/:id` route   | In-place sheet panel                            | CONTEXT.md locked to sheets; no new pages                                                  |
| TypeScript ripple detection | Manual grep                         | `pnpm tsc --noEmit` in `apps/web`               | Strict mode surfaces all type errors immediately                                           |

**Key insight:** All infrastructure exists. This phase is about wiring existing pieces together, not building new ones.

## Common Pitfalls

### Pitfall 1: Mixing Server and Client Component Auth Patterns

**What goes wrong:** The `fetchWithAuth` in `apps/web/src/lib/api.ts` uses `createClient()` (server-side Supabase from `@/lib/supabase/server`), which depends on `cookies()`. Calling this inside a Client Component fails at runtime.

**Why it happens:** The dashboard page `page.tsx` is a Server Component that passes data to child components. When `recent-orders.tsx` becomes a Client Component, it can no longer use server-only Supabase utilities.

**How to avoid:** Either (a) add a client-side fetch helper using `createBrowserClient` from `@/lib/supabase/client`, or (b) lift the fetch to the Server Component parent and pass fetched full entities down. Option (a) is simpler and consistent with how mobile handles client-side auth.

**Warning signs:** "You're importing a component that needs cookies, headers... This is only allowed from a Server Component" error in Next.js.

### Pitfall 2: LowStockItem.id vs LowStockItem.productId Confusion

**What goes wrong:** `LowStockItem.id` is the inventory record's primary key (from `inventory.id`). To fetch a full `Product` for `ProductSheet`, the correct ID is `LowStockItem.productId`.

**Why it happens:** The LowStockItem is derived from the inventory table. The dashboard backend returns `{id: inventory.id, productId: product.id, ...}`.

**How to avoid:** Verify by checking dashboard.ts: `productId: number` is explicitly named. Use `item.productId` when calling `GET /api/products/:id`.

**Warning signs:** ProductSheet displays the wrong product, or 404 from backend if wrong ID is used.

### Pitfall 3: TypeScript Strict Mode Ripple Underestimation

**What goes wrong:** Changing `id: string` to `id: number` in types.ts causes TypeScript errors in all 16 consuming files. Some may use the id in string contexts (template literals, string comparisons) that stop compiling.

**Why it happens:** `id: string` allows `order.id.toString()`, `String(order.id)`, string comparisons. With `id: number`, these either still compile (`.toString()` works on numbers too) or reveal a bug.

**How to avoid:** After each type file change, run `pnpm --filter=@objetiva/web tsc --noEmit` to see errors incrementally. Fix as you go.

**Warning signs:** Build errors after type change with messages like "Type 'number' is not assignable to type 'string'".

### Pitfall 4: Stale Dashboard types vs. Correct Mobile Types

**What goes wrong:** Researcher or planner assumes web `dashboard.ts` also has `id: string` (it does not). Dashboard types already have `id: number` — confirmed by inspection.

**Why it happens:** Confusion between the 5 entity types (order.ts, product.ts, etc.) and dashboard.ts.

**How to avoid:** Do NOT modify `apps/web/src/types/dashboard.ts`. Only modify the 5 entity type files listed in CONTEXT.md.

## Code Examples

Verified patterns from codebase inspection:

### Current Dead Link (recent-orders.tsx — to be replaced)

```typescript
// Source: apps/web/src/components/dashboard/recent-orders.tsx
import Link from 'next/link'

{orders.map(order => (
  <Link
    key={order.id}
    href={`/orders/${order.id}`}         // 404 — page doesn't exist
    className="flex items-center justify-between rounded-lg border p-3 ..."
  >
    {/* row content */}
  </Link>
))}
```

### Target Pattern (clickable row + sheet)

```typescript
'use client'
import { useState } from 'react'
import { OrderSheet } from '@/components/tables/orders/order-sheet'
import type { Order } from '@/types/order'
// Remove: import Link from 'next/link'

export function RecentOrders({ orders }: RecentOrdersProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const handleClick = async (orderId: number) => {
    // fetch full Order from /api/orders/:id (client-side)
    const order = await fetchOrderById(orderId)
    setSelectedOrder(order)
    setSheetOpen(true)
  }

  return (
    <>
      <Card>
        {orders.map(order => (
          <div
            key={order.id}
            onClick={() => handleClick(order.id)}
            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50 cursor-pointer"
          >
            {/* same row content as before */}
          </div>
        ))}
      </Card>
      <OrderSheet order={selectedOrder} open={sheetOpen} onOpenChange={setSheetOpen} />
    </>
  )
}
```

### Mobile Currency Fix (Dashboard.tsx)

```typescript
// Remove this (line 7):
const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })

// Add this import:
import { formatCurrency } from '@objetiva/utils'

// Replace: currency.format(stats.todayRevenue)
// With:    formatCurrency(stats.todayRevenue)
// (3 occurrences: todayRevenue, pendingValue, weekRevenue)
```

### Web Type ID Migration Example

```typescript
// Before: apps/web/src/types/order.ts
export interface OrderItem {
  id: string // → number
  productId: string // → number
  productName: string
  quantity: number
  price: number
}
export interface Order {
  id: string // → number
  // ... rest unchanged
}
```

### Doc Sync: REQUIREMENTS.md Pattern

```markdown
// Before:

- [ ] **MONO-01**: Monorepo structure with pnpm workspaces functional

// After:

- [x] **MONO-01**: Monorepo structure with pnpm workspaces functional
```

### Doc Sync: ROADMAP.md Phase 6 Pattern

```markdown
// Before:

- [ ] 06-01-PLAN.md — RBAC backend infrastructure ...
- [ ] 06-02-PLAN.md — Error boundaries ...
- [ ] 06-03-PLAN.md — Form validation ...
- [ ] 06-04-PLAN.md — Mobile touch target audit ...

// After:

- [x] 06-01-PLAN.md — RBAC backend infrastructure ...
- [x] 06-02-PLAN.md — Error boundaries ...
- [x] 06-03-PLAN.md — Form validation ...
- [x] 06-04-PLAN.md — Mobile touch target audit ...
```

## State of the Art

| Old Approach                                                 | Current Approach                                    | When Changed | Impact                                                                                    |
| ------------------------------------------------------------ | --------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------- |
| `<Link href="/orders/:id">` in dashboard                     | Clickable row + Sheet panel                         | This phase   | No dead-end 404 navigation; keeps user in dashboard context                               |
| `id: string` in web entity types                             | `id: number`                                        | This phase   | Aligns with backend Drizzle `serial()` returning JS numbers; removes silent mismatch      |
| Local `new Intl.NumberFormat('en-US', USD)` in Dashboard.tsx | `formatCurrency` from `@objetiva/utils` (es-MX/MXN) | This phase   | Consistent with rest of mobile pages (Orders, Sales, Purchases already fixed in Phase 10) |

**Deprecated/outdated:**

- `import Link from 'next/link'` in `recent-orders.tsx` and `low-stock-alerts.tsx`: replaced by clickable divs with sheet state

## Open Questions

1. **Client-side auth fetch in web dashboard components**
   - What we know: Server-side `fetchWithAuth` in `lib/api.ts` uses `createClient()` (server only). Client Components need a different approach.
   - What's unclear: Whether to add a `fetchOrderById`/`fetchProductById` to `lib/api.ts` with a flag, create a separate `lib/api-client.ts`, or use a different pattern.
   - Recommendation: Add simple inline `fetch` with browser Supabase client in the dashboard components themselves, matching the mobile `fetchWithAuth` pattern. Keep it minimal — this is one use case. Alternatively, add `fetchOrderById(id: number): Promise<Order>` and `fetchProductById(id: number): Promise<Product>` to `lib/api.ts` using the browser client, clearly separated from the server functions.

2. **Loading state for on-click entity fetch**
   - What we know: There is a latency gap between click and sheet open (network fetch).
   - What's unclear: Whether to show a loading indicator or just let the sheet open when ready.
   - Recommendation: At Claude's discretion — a simple `isLoading` state that shows a spinner or disables clicks during fetch is sufficient. The mobile app pattern uses full-page loading; for inline sheets a brief delay is acceptable.

## Validation Architecture

> `workflow.nyquist_validation` is not present in `.planning/config.json` — the key is absent, not `false`. Treating as disabled; skipping Validation Architecture section.

## Sources

### Primary (HIGH confidence)

Codebase inspection (direct file reads):

- `apps/web/src/components/dashboard/recent-orders.tsx` — confirmed `<Link>` dead links, no `'use client'`
- `apps/web/src/components/dashboard/low-stock-alerts.tsx` — confirmed `<Link>` dead links, no `'use client'`
- `apps/web/src/types/order.ts` — confirmed `id: string`, `productId: string`
- `apps/web/src/types/product.ts` — confirmed `id: string`
- `apps/web/src/types/sale.ts` — confirmed `id: string`, `productId: string`
- `apps/web/src/types/purchase.ts` — confirmed `id: string`, `productId: string`
- `apps/web/src/types/inventory.ts` — confirmed `id: string`, `productId: string`
- `apps/web/src/types/dashboard.ts` — confirmed `id: number` already correct; no change needed
- `apps/mobile/src/pages/Dashboard.tsx` — confirmed local `currency = new Intl.NumberFormat('en-US', {currency: 'USD'})` on line 7; 3 usages
- `apps/mobile/src/types/index.ts` — confirmed all mobile entity types already have `id: number`
- `apps/web/src/app/(dashboard)/orders/orders-client.tsx` — established `useState` + `OrderSheet` pattern
- `apps/web/src/app/(dashboard)/articles/articles-client.tsx` — established `useState` + `ProductSheet` pattern
- `apps/web/src/components/tables/orders/order-sheet.tsx` — confirmed `order.items`, `order.customerEmail` required; confirms summary types insufficient
- `apps/web/src/components/tables/products/product-sheet.tsx` — confirmed full `Product` required
- `packages/utils/src/formatters.ts` — confirmed `formatCurrency(amount, currency='MXN', locale='es-MX')` signature
- `apps/mobile/package.json` — confirmed `@objetiva/utils: workspace:*` already in dependencies
- `.planning/REQUIREMENTS.md` — confirmed 6 checkboxes are `[ ]` with traceability marked Complete
- `.planning/ROADMAP.md` — confirmed Phase 6 (4 plans `[ ]`), Phase 7 (2 plans `[ ]`), Phase 10 plan 10-04 (`[ ]`) despite phases showing Complete in progress table
- `apps/backend/src/modules/orders/orders.controller.ts` — confirmed `GET /orders/:id` endpoint exists
- `apps/backend/src/modules/products/products.controller.ts` — confirmed `GET /products/:id` endpoint exists
- `.planning/config.json` — confirmed `nyquist_validation` key absent; no test section required

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all libraries and patterns confirmed by direct codebase inspection
- Architecture: HIGH — all patterns verified in existing code; no guesswork
- Pitfalls: HIGH — server/client auth separation confirmed by Next.js 14 patterns in the codebase; LowStockItem productId vs id verified by direct type inspection

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable codebase; no fast-moving external dependencies in scope)
