# Phase 12: Fix Dashboard Links, Web Types & Doc Sync - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix dashboard dead links (Recent Orders, Low Stock Alerts), align web entity ID types with backend Drizzle serial, fix mobile currency formatter to use shared `formatCurrency`, and sync documentation checkboxes. No new features — this is cleanup and alignment.

</domain>

<decisions>
## Implementation Decisions

### Dead link handling

- Recent Orders items open the existing `order-sheet` component inline (side panel) instead of navigating to a non-existent `/orders/{id}` page
- Low Stock Alert items open the existing `product-sheet` component inline instead of navigating to a non-existent `/inventory/{id}` page
- Reuse existing sheet components (`order-sheet.tsx`, `product-sheet.tsx`) as-is — no new detail views
- Convert `<Link>` elements to clickable rows that trigger sheet open state

### Mobile currency display

- MXN with es-MX locale is the correct currency/locale for the business
- Replace local `new Intl.NumberFormat('en-US', { currency: 'USD' })` with shared `formatCurrency` from `@objetiva/utils`
- Only fix currency formatting — plain number formatting (product counts, order counts) stays as-is since integers look the same in both locales

### Web entity ID type migration

- All entity type `id` fields become `number` (matching Drizzle serial): product.ts, order.ts, sale.ts, purchase.ts, inventory.ts
- All nested item type `id` fields (SaleItem, PurchaseItem, OrderItem) also become `number`
- All foreign key fields (productId, orderId, etc.) also become `number`
- Dashboard types already correct (`id: number`) — no change needed there

### Documentation sync

- Sync REQUIREMENTS.md checkboxes for MONO-01/02/03, DOC-01/02/04
- Sync ROADMAP.md plan checkboxes for Phases 6, 7, 10

### Claude's Discretion

- URL parameter ID handling strategy (parseInt at boundary vs other approach)
- How to wire sheet state management in dashboard components (useState, URL state, etc.)
- Exact TypeScript refactoring approach for ripple effects from id type changes

</decisions>

<specifics>
## Specific Ideas

- Reuse existing sheet components for consistency — the orders and products tables already use these sheets, so the dashboard should feel the same
- Business operates in Mexican Pesos — currency display should be consistent across web and mobile

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `order-sheet.tsx` (`apps/web/src/components/tables/orders/`): Existing order detail sheet, reusable for dashboard Recent Orders
- `product-sheet.tsx` (`apps/web/src/components/tables/products/`): Existing product detail sheet, reusable for dashboard Low Stock Alerts
- `formatCurrency` (`packages/utils/src/formatters.ts`): Shared formatter using es-MX/MXN — drop-in replacement for mobile's local formatter

### Established Patterns

- Dashboard components use shadcn Card/CardHeader/CardContent pattern
- Web tables use sheet panels for detail views (order-sheet, product-sheet, purchase-sheet, sale-sheet)
- Mobile uses React Query with `fetchWithAuth` for data fetching

### Integration Points

- `recent-orders.tsx`: Replace `<Link href={/orders/${id}}>` with clickable row + sheet trigger
- `low-stock-alerts.tsx`: Replace `<Link href={/inventory/${id}}>` with clickable row + sheet trigger
- `apps/mobile/src/pages/Dashboard.tsx` line 7: Replace local `currency` formatter with `formatCurrency` import
- 5 web type files: Change `id: string` → `id: number` and propagate to all consuming components

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

_Phase: 12-fix-dashboard-links-web-types-doc-sync_
_Context gathered: 2026-03-03_
