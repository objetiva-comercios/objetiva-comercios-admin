# Phase 7: Fix Integration Bugs & Deployment Blockers - Research

**Researched:** 2026-03-02
**Domain:** Bug fixes across backend (NestJS/Drizzle), frontend types (Next.js/React), auth middleware (Supabase SSR), DB schema migrations
**Confidence:** HIGH

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Detail panel data loading (OrderSheet / PurchaseSheet crashes)**

- Backend joins orderItems/purchaseItems in the list endpoint response — always included, no conditional param
- Frontend Sheet components continue to call `order.items.map()` / `purchase.items.map()` as-is — the data will now be present
- Fix applies to both web and mobile apps (backend fix benefits both)
- Edge case: if items array is empty, Claude decides whether to show empty state or hide section

**Phantom fields handling**

- Add all phantom fields to DB schema via Drizzle migration:
  - `orders.shippingAddress` (text) — orders should track shipping destination
  - `purchases.supplierContact` (text) — contact info for supplier
  - `purchases.shipping` (numeric) — shipping cost on purchase orders
  - `purchases.notes` (text) — free-form notes on purchases
  - `purchases.receivedAt` (timestamp, nullable) — when purchase was received
  - `inventory.reservedQuantity` (integer) — reserved stock count
  - `inventory.availableQuantity` (integer) — available stock count
  - `inventory.reorderPoint` (integer) — threshold for low-stock alerts
- Seed script must populate these new columns with realistic data
- Backend services must include new fields in API responses

**Auth middleware scope**

- Deny-by-default: protect all routes, whitelist only public routes (/login, /signup, /auth/callback)
- Remove the `isProtectedRoute = pathname.startsWith('/dashboard')` check — replace with inverse logic
- Unauthenticated users hitting any non-public route get redirected to `/login?returnTo={original_path}`
- After login, user is redirected back to the returnTo path
- Root path (`/`) does smart redirect: `/dashboard` if logged in, `/login` if not

**Dashboard purchases KPI**

- Update `DashboardResponse` type in web and mobile to include `purchases` field matching backend response
- Add purchases KPI card(s) to the existing KPI cards row on the dashboard
- Apply to both web and mobile dashboards for consistency

### Claude's Discretion

- Empty items edge case UI (show message vs hide section)
- Purchases KPI card layout (two cards vs single card with both metrics)
- Exact seed data values for new DB columns
- DATABASE_URL documentation format in .env.example

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID      | Description                                               | Research Support                                                                                                                                            |
| ------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DASH-01 | Dashboard displays key metrics (sales, inventory, orders) | Backend DashboardService already returns `purchases` field — web/mobile `DashboardResponse` types just need the field added; then a new KPI card renders it |
| DASH-02 | Dashboard shows realistic operational data from backend   | Phantom fields must be added to DB schema + seed data so API responses contain all fields frontend expects                                                  |
| AUTH-03 | User session persists across browser/app refresh          | Middleware deny-by-default ensures ALL authenticated routes redirect to login when session is absent, not just /dashboard                                   |

</phase_requirements>

---

## Summary

Phase 7 is a pure bug-fix phase with six discrete defects identified by the v1.0 milestone audit. The defects fall into four categories: two runtime crashes in web detail panel components, one silently dropped KPI, seven phantom fields causing blank UI, one auth middleware coverage gap, and one missing environment variable documentation entry.

All bugs are straightforward mechanical fixes with clear root causes established by the audit. No new libraries are needed. The hardest task is the Drizzle schema migration for phantom fields (8 new columns across 3 tables), which requires migration generation, seed script updates, backend service response updates, and frontend type alignment — a chain of changes that must land atomically.

The auth middleware fix inverts a single boolean condition and adds `returnTo` query param support. The dashboard KPI fix is two files: add `purchases` to `DashboardResponse` type (web and mobile), then add a KPI card to both dashboard pages. The `DATABASE_URL` fix is one line in `apps/backend/.env.example`.

**Primary recommendation:** Fix in dependency order — DB migration first (unblocks seed data), then backend service join fixes (unblocks crash fixes), then type/UI updates (consume fixed backend), then auth middleware and .env.example last (independent fixes).

---

## Standard Stack

No new libraries required for this phase. All work uses the existing project stack.

### Core (already installed)

| Library               | Version  | Purpose                | Role in This Phase                                                      |
| --------------------- | -------- | ---------------------- | ----------------------------------------------------------------------- |
| drizzle-orm           | ^0.45.1  | ORM + query builder    | Add new schema columns, generate migration, update seed queries         |
| drizzle-kit           | ^0.31.9  | Migration CLI          | `db:generate` for new migration SQL, `db:migrate` to apply              |
| postgres              | ^3.4.8   | PostgreSQL driver      | No change — already wired                                               |
| @supabase/ssr         | existing | Supabase SSR client    | Middleware auth check already uses this — only logic changes            |
| @tanstack/react-query | existing | Data fetching (mobile) | No change — type update propagates automatically                        |
| next                  | 14.2     | Web framework          | Middleware file is standard Next.js Edge middleware                     |
| @faker-js/faker       | existing | Seed data generation   | Add faker calls for 8 new fields in purchase/order/inventory generators |

### Installation

```bash
# No new dependencies required
```

---

## Architecture Patterns

### Confirmed Project Patterns (from code inspection)

#### Pattern 1: Two-Query findOne vs JOIN for parent+items

The project deliberately uses two separate queries for parent + items (established in Phase 5-02 decisions). `findOne()` already does this correctly. The crash is that `findAll()` returns rows WITHOUT items.

**Decision for fix:** Include items as a batch query after `findAll()` data fetch — load all items for the returned page of orders/purchases in one additional query, then zip them back by ID. This avoids N+1 queries.

```typescript
// Pattern: Batch load items for paginated list
// Source: Established project pattern from Phase 05-02 decision log

// After getting paginated `data` rows from findAll:
const orderIds = data.map(o => o.id)
const allItems =
  orderIds.length > 0
    ? await this.drizzle.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds))
    : []

// Zip items back by orderId
const itemsByOrderId = new Map<number, typeof allItems>()
for (const item of allItems) {
  const list = itemsByOrderId.get(item.orderId) ?? []
  list.push(item)
  itemsByOrderId.set(item.orderId, list)
}

const dataWithItems = data.map(order => ({
  ...order,
  items: itemsByOrderId.get(order.id) ?? [],
}))
```

Note: `inArray` must be imported from `drizzle-orm`. Check the current import list in orders.service.ts — it is NOT currently imported.

#### Pattern 2: Drizzle Schema Migration (addColumn)

Project uses `drizzle-kit generate` + `drizzle-kit migrate`. The workflow is:

1. Edit `apps/backend/src/db/schema.ts` — add new columns to existing `pgTable` definitions
2. Run `pnpm db:generate` from the backend package to produce a new SQL migration file in `apps/backend/drizzle/`
3. Run `pnpm db:migrate` to apply the migration to the running database
4. Run `pnpm db:seed` to repopulate with updated seed data (seed truncates + refills all tables)

```typescript
// Drizzle addColumn pattern — append to existing pgTable definition
// Source: apps/backend/src/db/schema.ts (existing pattern)

export const orders = pgTable('orders', {
  // ... existing columns ...
  shippingAddress: text('shipping_address'), // nullable by default (no .notNull())
})

export const purchases = pgTable('purchases', {
  // ... existing columns ...
  supplierContact: text('supplier_contact'),
  shipping: doublePrecision('shipping').notNull().default(0),
  notes: text('notes'),
  receivedAt: timestamp('received_at'), // nullable — no .notNull()
})

export const inventory = pgTable('inventory', {
  // ... existing columns ...
  reservedQuantity: integer('reserved_quantity').notNull().default(0),
  availableQuantity: integer('available_quantity').notNull().default(0),
  reorderPoint: integer('reorder_point').notNull().default(10),
})
```

**Critical:** Existing rows in production DB will get column defaults. New nullable columns (text, timestamp) default to NULL. New non-null columns with `.default(0)` or `.default(10)` will backfill correctly. No data loss.

#### Pattern 3: Frontend Type Alignment with Backend Response

The project keeps separate type files per app:

- Web: `apps/web/src/types/dashboard.ts`, `order.ts`, `purchase.ts`, `inventory.ts`
- Mobile: `apps/mobile/src/types/index.ts` (single file, all types)

Type changes must be made in BOTH places to keep apps consistent.

```typescript
// Web: apps/web/src/types/dashboard.ts
// Add purchases to DashboardResponse:
export interface DashboardResponse {
  stats: DashboardStats
  purchases: {
    // ADD THIS — matches backend DashboardService return shape
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}

// Mobile: apps/mobile/src/types/index.ts
// Same addition to DashboardResponse interface
```

The backend `DashboardService` (confirmed by code inspection) already returns:

```typescript
{
  stats: { ... },
  purchases: { pendingOrders: number, pendingValue: number },
  lowStockItems: [...],
  recentOrders: [...]
}
```

So the type mismatch is purely on the frontend side. Backend needs no change for the KPI.

#### Pattern 4: Next.js Middleware Deny-by-Default

Current middleware in `apps/web/src/middleware.ts` only redirects to login when `pathname.startsWith('/dashboard')`. The fix replaces `isProtectedRoute` logic with inverse: allow only public routes, block everything else.

```typescript
// Source: apps/web/src/middleware.ts (existing structure to preserve)

const { pathname } = request.nextUrl

// Public routes — only these bypass auth check
const isPublicRoute =
  pathname.startsWith('/login') ||
  pathname.startsWith('/signup') ||
  pathname.startsWith('/auth/callback')

// Deny-by-default: if not authenticated and not a public route → redirect to login
if (!user && !isPublicRoute) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('returnTo', pathname) // preserve return path
  return NextResponse.redirect(loginUrl)
}

// If authenticated, redirect public auth pages → dashboard (keep existing behavior)
if (user && isPublicRoute && !pathname.startsWith('/auth/callback')) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}
```

**Note:** The root path `/` is currently handled by `apps/web/src/app/page.tsx` as a Server Component that does smart redirect based on Supabase session. This remains unchanged — the middleware redirects to login for `/` when unauthenticated (which then redirects again to login, but that's fine and consistent).

#### Pattern 5: Seed Script Update for New Columns

The seed script at `apps/backend/src/db/seed.ts` uses explicit column mapping when inserting (not spread). New columns must be explicitly added to each insert call.

```typescript
// Pattern for nullable/optional fields in seed (purchase generator example)
// Source: apps/backend/src/db/seed.ts (existing pattern)

await db.insert(schema.purchases).values({
  // ... existing fields ...
  supplierContact: purchase.supplierContact, // new field from generator
  shipping: purchase.shipping, // new field from generator
  notes: purchase.notes ?? null, // nullable
  receivedAt: purchase.receivedAt ? new Date(purchase.receivedAt) : null,
})
```

The generators (`purchase.generator.ts`, `order.generator.ts`, `inventory.generator.ts`) must also be updated to produce realistic values for the new fields.

### Anti-Patterns to Avoid

- **N+1 queries in findAll:** Do NOT do a separate `findOne()` for each row to get items. Use the batch `inArray` pattern above.
- **Modifying migration SQL by hand:** Always run `drizzle-kit generate` and let it produce the migration — never write migration SQL manually (will break the migration journal).
- **Type narrowing via `as any`:** The `DashboardResponse` type change should cascade cleanly via TypeScript. Do not add `as any` casts to suppress type errors — fix the root type.
- **Only fixing web middleware:** The middleware only exists in web (`apps/web/src/middleware.ts`). Mobile uses Supabase `onAuthStateChange` in the router for auth gating — this is separate and already works correctly. Do not create a middleware for mobile.

---

## Don't Hand-Roll

| Problem                             | Don't Build             | Use Instead                                    | Why                                                                                             |
| ----------------------------------- | ----------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Batch load items for paginated list | Custom N+1 loop         | `inArray()` from drizzle-orm                   | One query for all items; `inArray` handles IN clause correctly including empty array edge case  |
| DB schema migration                 | Manual SQL ALTER TABLE  | `drizzle-kit generate` + `drizzle-kit migrate` | Keeps migration journal consistent; handles column ordering, constraints, indexes automatically |
| Auth redirect with returnTo         | Custom URL construction | `URL` + `searchParams.set()`                   | Already in project; correctly percent-encodes path params                                       |

**Key insight:** This phase is mechanical fix work. The project infrastructure (Drizzle, NestJS, Next.js middleware) already handles all the hard problems. Every fix is a targeted change to existing code.

---

## Common Pitfalls

### Pitfall 1: `inArray` with Empty Array

**What goes wrong:** `WHERE id IN ()` is invalid SQL. If the paginated list returns 0 rows, `orderIds` is empty, and calling `inArray(orderItems.orderId, [])` will throw or produce invalid SQL.
**Why it happens:** Drizzle-orm's `inArray` does not guard against empty arrays internally (confirmed by common usage pattern).
**How to avoid:** Guard with `if (orderIds.length > 0)` before the items query — return empty items map otherwise.
**Warning signs:** TypeScript doesn't catch this — only shows at runtime when a page has 0 results.

### Pitfall 2: Migration Column Default Mismatch

**What goes wrong:** Adding `doublePrecision('shipping').notNull().default(0)` to `purchases` — existing DB rows get `shipping = 0`, but when seed script runs with `TRUNCATE RESTART IDENTITY CASCADE` it wipes and refills, so defaults only matter if migration runs WITHOUT re-seeding.
**Why it happens:** The seed truncates all tables, so column defaults are moot in development. In production (if data exists), the defaults become important.
**How to avoid:** Choose defaults that are safe for existing rows: `0` for numeric fields, `10` for `reorderPoint`, `0` for `reservedQuantity`/`availableQuantity`. Nullable columns (text, timestamp) need no default — NULL is appropriate.
**Warning signs:** Migration fails if `notNull()` is set without a default AND the table has existing rows.

### Pitfall 3: `inArray` Import Missing

**What goes wrong:** `inArray` is not currently imported in `orders.service.ts` or `purchases.service.ts`. Adding the batch query pattern without adding `inArray` to the import causes a compilation error.
**Why it happens:** The current services use `eq`, `ilike`, `and`, etc. but not `inArray`. It's a new import addition.
**How to avoid:** Add `inArray` to the drizzle-orm import: `import { ..., inArray } from 'drizzle-orm'`.

### Pitfall 4: Backend `OrderItem` Field Name Mismatch

**What goes wrong:** The DB schema `orderItems` table has a `subtotal` column (not `total`). But the web type `OrderItem` has only `price` and `quantity` (computes total as `price * quantity`). The purchase item type has `total` (not `subtotal`). These field name differences between DB schema and frontend types must be reconciled when serializing.
**Why it happens:** Frontend types were written to match original mock data structure, not the DB schema.
**How to avoid:** When the backend `findAll` returns items, map column names to the expected API shape. Check existing `findOne` responses — they already return `subtotal` for `orderItems` and `subtotal` for `purchaseItems`. The frontend `OrderSheet` uses `item.price * item.quantity` for display, so `subtotal` from DB is fine as a pass-through.

### Pitfall 5: Auth Middleware Must NOT Protect API Routes

**What goes wrong:** The Next.js middleware matcher in `apps/web/src/middleware.ts` already excludes `_next/static`, `_next/image`, `favicon.ico`, and image files. It does NOT exclude `/api/` routes — but the web app has no `/api/` routes (backend is a separate NestJS process at port 3001). This is safe.
**Why it happens:** Confusion between Next.js API routes and the NestJS backend.
**How to avoid:** No change needed to the matcher. The deny-by-default logic only affects Next.js page routes. The NestJS backend has its own JWT guard.

### Pitfall 6: Seed Generators Must Produce Deterministic Data

**What goes wrong:** Purchase generator uses `faker.seed(id + 40000)`. If new fields are added without the same seed being set before generating them, the same seed call could produce different values for existing fields (breaking determinism).
**Why it happens:** `faker.seed()` resets the random sequence. If you call additional `faker.xxx` methods before existing field generation, all downstream values shift.
**How to avoid:** Add new faker calls for new fields AFTER all existing fields are computed, at the end of the generator function. The seed is set once at the top — all calls after it are deterministic in sequence.

---

## Code Examples

Verified patterns from codebase inspection:

### Batch Items Query (Order findAll fix)

```typescript
// Source: orders.service.ts pattern derived from Phase 05-02 "two-query findOne" decision
// Import addition required: inArray from 'drizzle-orm'

async findAll(query: OrderQueryDto): Promise<PaginatedResponseDto<...>> {
  // ... existing pagination/filter logic unchanged ...

  // Data query (existing)
  const data = await this.drizzle.db
    .select()
    .from(orders)
    .where(where)
    .orderBy(orderBy)
    .limit(limit)
    .offset(offset)

  // NEW: Batch load items for all orders on this page
  const orderIds = data.map(o => o.id)
  const allItems = orderIds.length > 0
    ? await this.drizzle.db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds))
    : []

  // Build lookup map
  const itemsByOrderId = new Map<number, (typeof allItems[number])[]>()
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

  const totalPages = Math.ceil(total / limit)
  return new PaginatedResponseDto(dataWithItems, { total, page, limit, totalPages })
}
```

### Schema Migration (New Columns)

```typescript
// Source: apps/backend/src/db/schema.ts — append to existing tables

// orders table addition:
shippingAddress: text('shipping_address'),

// purchases table additions:
supplierContact: text('supplier_contact'),
shipping: doublePrecision('shipping').notNull().default(0),
notes: text('notes'),
receivedAt: timestamp('received_at'),

// inventory table additions:
reservedQuantity: integer('reserved_quantity').notNull().default(0),
availableQuantity: integer('available_quantity').notNull().default(0),
reorderPoint: integer('reorder_point').notNull().default(10),
```

After editing schema.ts:

```bash
cd apps/backend
pnpm db:generate  # produces new migration SQL in drizzle/
pnpm db:migrate   # applies migration to DB
pnpm db:seed      # repopulates with realistic data including new fields
```

### Generator Update Pattern (Purchase)

```typescript
// Source: apps/backend/src/db/generators/purchase.generator.ts

export interface GeneratedPurchase {
  // ... existing fields ...
  supplierContact: string // new
  shipping: number // new
  notes: string // new
  receivedAt: string | null // new
}

export function generatePurchase(id: number, products: GeneratedProduct[]): GeneratedPurchase {
  faker.seed(id + 40000)

  // ... all existing field generation unchanged ...

  // NEW fields appended after existing logic:
  const receivedStatus = ['received'] // status is already computed above
  const wasReceived = purchase.status === 'received'

  return {
    // ... existing fields ...
    supplierContact: faker.internet.email(),
    shipping: parseFloat(faker.commerce.price({ min: 10, max: 200 }).replace(/[^0-9.]/g, '')),
    notes: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) ?? '',
    receivedAt: wasReceived
      ? faker.date.between({ from: new Date(createdAt), to: new Date() }).toISOString()
      : null,
  }
}
```

Note: `createdAt` is already computed in the generator. `receivedAt` is non-null only when status is 'received'.

### Middleware Deny-by-Default

```typescript
// Source: apps/web/src/middleware.ts — full replacement of redirect logic block

const { pathname } = request.nextUrl

const isPublicRoute =
  pathname.startsWith('/login') ||
  pathname.startsWith('/signup') ||
  pathname.startsWith('/auth/callback')

// Authenticated user hitting an auth page → go to dashboard
if (user && isPublicRoute && !pathname.startsWith('/auth/callback')) {
  return NextResponse.redirect(new URL('/dashboard', request.url))
}

// Unauthenticated user hitting any non-public route → go to login with returnTo
if (!user && !isPublicRoute) {
  const loginUrl = new URL('/login', request.url)
  loginUrl.searchParams.set('returnTo', pathname)
  return NextResponse.redirect(loginUrl)
}

return supabaseResponse
```

The login page must also read `returnTo` from searchParams and redirect after successful login:

```typescript
// In login page action/handler — after supabase.auth.signInWithPassword succeeds:
const returnTo = searchParams.get('returnTo') ?? '/dashboard'
router.push(returnTo)
```

Check `apps/web/src/app/(auth)/login/page.tsx` to see the current redirect behavior and update it.

### DashboardResponse Type Fix

```typescript
// Source: apps/web/src/types/dashboard.ts
// and: apps/mobile/src/types/index.ts

export interface DashboardResponse {
  stats: DashboardStats
  purchases: {
    // ADD: matches backend DashboardService return
    pendingOrders: number
    pendingValue: number
  }
  lowStockItems: LowStockItem[]
  recentOrders: RecentOrder[]
}
```

Then in web `DashboardPage` (`apps/web/src/app/(dashboard)/dashboard/page.tsx`):

```typescript
// data.purchases is now available — pass to new PurchasesKpi component
<StatsCards stats={data.stats} purchases={data.purchases} />
// OR add a separate KPI card component
<PurchasesKpi purchases={data.purchases} />
```

In mobile `Dashboard.tsx` (`apps/mobile/src/pages/Dashboard.tsx`):

```typescript
// Destructure purchases from data (currently destructures only stats, lowStockItems, recentOrders)
const { stats, purchases, lowStockItems, recentOrders } = data
// Add a KPI card for purchases.pendingOrders and purchases.pendingValue
```

### .env.example Update

```bash
# apps/backend/.env.example — add DATABASE_URL entry
DATABASE_URL=postgresql://user:password@localhost:5432/objetiva_comercios

# Supabase Auth
SUPABASE_PROJECT_ID=your-project-id

# Server
PORT=3001
NODE_ENV=development
```

---

## State of the Art

| Old Approach                                           | Current Approach                       | When Changed | Impact                                                            |
| ------------------------------------------------------ | -------------------------------------- | ------------ | ----------------------------------------------------------------- |
| `isProtectedRoute = pathname.startsWith('/dashboard')` | `!isPublicRoute` deny-by-default       | This phase   | All routes now protected; only explicit public routes bypass auth |
| findAll returns rows without items (crash)             | findAll includes batch items query     | This phase   | OrderSheet and PurchaseSheet open without TypeError               |
| DashboardResponse missing `purchases` field            | DashboardResponse includes `purchases` | This phase   | Dashboard displays all backend KPIs                               |
| Phantom fields: shippingAddress etc. not in DB         | New DB migration adds 8 columns        | This phase   | UI displays real data instead of blank fields                     |

**Deprecated/outdated:**

- The `isProtectedRoute` variable and check: removed entirely in this phase

---

## Open Questions

1. **Frontend Orders table displays `shippingAddress` column?**
   - What we know: `OrderSheet` renders `order.shippingAddress` in a "Shipping Address" section. The orders table page likely does not show it as a column.
   - What's unclear: Whether `orders/page.tsx` column definitions include `shippingAddress` or just the sheet component uses it.
   - Recommendation: Column inspection at plan time — if it's only in the Sheet, the fix is DB + backend service only. No column definition change needed.

2. **Login page `returnTo` handler**
   - What we know: `apps/web/src/app/(auth)/login/page.tsx` exists but hasn't been read during this research.
   - What's unclear: Whether the login success handler already reads from URL params or hardcodes `/dashboard`.
   - Recommendation: Read the login page during planning. If it hardcodes `/dashboard`, add `searchParams.get('returnTo')` fallback.

3. **`availableQuantity` computation semantics**
   - What we know: Decision is `availableQuantity = quantity - reservedQuantity`. But the DB stores both as separate integers.
   - What's unclear: Should `availableQuantity` be a computed/generated column in Postgres, or just a regular column seeded with `quantity - reservedQuantity`?
   - Recommendation: Regular column (not computed) — simpler to implement, consistent with existing schema style. Seed it as `quantity - reservedQuantity`.

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `apps/backend/src/db/schema.ts` — confirmed missing columns
- Direct code inspection of `apps/backend/src/modules/orders/orders.service.ts` — confirmed `findAll()` has no items join
- Direct code inspection of `apps/backend/src/modules/purchases/purchases.service.ts` — confirmed `findAll()` has no items join
- Direct code inspection of `apps/backend/src/modules/dashboard/dashboard.service.ts` — confirmed backend returns `purchases` field
- Direct code inspection of `apps/web/src/types/dashboard.ts` — confirmed `DashboardResponse` missing `purchases` field
- Direct code inspection of `apps/mobile/src/types/index.ts` — confirmed same type gap in mobile
- Direct code inspection of `apps/web/src/middleware.ts` — confirmed `isProtectedRoute = pathname.startsWith('/dashboard')` bug
- Direct code inspection of `apps/backend/.env.example` — confirmed `DATABASE_URL` missing
- Direct code inspection of `.planning/v1.0-MILESTONE-AUDIT.md` — root cause analysis for all 6 bugs
- Direct code inspection of `apps/backend/drizzle.config.ts` — confirmed migration workflow
- Direct code inspection of `apps/backend/src/db/seed.ts` — confirmed seed pattern for new column additions

### Secondary (MEDIUM confidence)

- `drizzle-orm` v0.45.1 `inArray` behavior with empty arrays — standard known limitation, guard with length check recommended
- Drizzle-kit migration workflow for addColumn — standard pattern, consistent with existing `drizzle/0000_*.sql` evidence

### Tertiary (LOW confidence)

- `faker.js` determinism guarantee when adding new field calls after existing ones — assumed safe based on seed-reset-then-sequence pattern, but not formally verified

---

## Metadata

**Confidence breakdown:**

- Root cause analysis: HIGH — direct code inspection of all affected files
- Fix patterns: HIGH — based on existing project conventions confirmed by code reading
- Migration workflow: HIGH — `drizzle.config.ts` and existing migration SQL confirmed the workflow
- Seed update pattern: MEDIUM — confirmed structure, specific faker calls are implementation detail
- Auth middleware fix: HIGH — middleware code read directly, fix is straightforward inversion

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable tech — drizzle, Next.js middleware, NestJS patterns don't change rapidly)
