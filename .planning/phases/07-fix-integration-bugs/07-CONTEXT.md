# Phase 7: Fix Integration Bugs & Deployment Blockers - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix 6 specific bugs identified by the milestone audit: 2 runtime crashes in web detail panels, 1 silently dropped dashboard KPI, phantom fields causing blank UI, auth middleware gap, and missing DATABASE_URL documentation. No new features — only fixes to make existing code work correctly.

</domain>

<decisions>
## Implementation Decisions

### Detail panel data loading (OrderSheet / PurchaseSheet crashes)

- Backend joins orderItems/purchaseItems in the list endpoint response — always included, no conditional param
- Frontend Sheet components continue to call `order.items.map()` / `purchase.items.map()` as-is — the data will now be present
- Fix applies to both web and mobile apps (backend fix benefits both)
- Edge case: if items array is empty, Claude decides whether to show empty state or hide section

### Phantom fields handling

- **Add all phantom fields to DB schema** via Drizzle migration:
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

### Auth middleware scope

- **Deny-by-default**: protect all routes, whitelist only public routes (/login, /signup, /auth/callback)
- Remove the `isProtectedRoute = pathname.startsWith('/dashboard')` check — replace with inverse logic
- Unauthenticated users hitting any non-public route get redirected to `/login?returnTo={original_path}`
- After login, user is redirected back to the returnTo path
- Root path (`/`) does smart redirect: `/dashboard` if logged in, `/login` if not

### Dashboard purchases KPI

- Update `DashboardResponse` type in web and mobile to include `purchases` field matching backend response
- Add purchases KPI card(s) to the existing KPI cards row on the dashboard
- Apply to both web and mobile dashboards for consistency

### Claude's Discretion

- Empty items edge case UI (show message vs hide section)
- Purchases KPI card layout (two cards vs single card with both metrics)
- Exact seed data values for new DB columns
- DATABASE_URL documentation format in .env.example

</decisions>

<specifics>
## Specific Ideas

- Login redirect should preserve the return URL so users land back where they were trying to go
- Root path should be smart — logged in users go to dashboard, others go to login

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `OrderSheet` (apps/web/src/components/tables/orders/order-sheet.tsx): Already renders items via `order.items.map()` — will work once backend includes items
- `PurchaseSheet` (apps/web/src/components/tables/purchases/purchase-sheet.tsx): Same pattern — `purchase.items.map()`
- Existing dashboard KPI cards pattern in web and mobile dashboard pages
- Drizzle ORM schema in apps/backend for migration generation

### Established Patterns

- Backend uses NestJS modules with service/controller pattern
- Frontend types in `apps/web/src/types/` mirror backend response shapes
- Mobile types in `apps/mobile/src/types/`
- Supabase middleware pattern already established in `apps/web/src/middleware.ts`

### Integration Points

- Backend order/purchase services: need to add relation joins in `findAll()` queries
- Backend Drizzle schema: needs new columns in orders, purchases, inventory tables
- Web middleware.ts: needs logic rewrite for deny-by-default
- Web + Mobile DashboardResponse types: need purchases field
- Web + Mobile dashboard pages: need new KPI card(s)
- Seed script: needs to populate new columns
- .env.example: needs DATABASE_URL entry

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 07-fix-integration-bugs_
_Context gathered: 2026-03-02_
