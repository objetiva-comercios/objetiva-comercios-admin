# Phase 11: Fix Sales Detail View Crash - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix critical runtime crash in sales detail views caused by missing saleItems batch-loading in `sales.findAll()` and misaligned field names between DB schema and frontend types. Both web SaleSheet and mobile Sales BottomSheet crash when accessing `sale.items` (undefined) and reference non-existent fields (`customerEmail`, `unitPrice`).

</domain>

<decisions>
## Implementation Decisions

### Missing sale fields

- **Drop `customerEmail`** from both web SaleSheet and mobile Sales BottomSheet — field doesn't exist in DB `sales` table, success criteria confirms removal
- **Drop web Sale type string IDs** — deferred to Phase 12 (web entity ID type alignment is Phase 12 scope)
- **Discount stays at sale level only** — current DB structure is correct (discount on parent `sales` record, not per-item)

### Detail data source

- **Batch-load saleItems in `findAll()`** mirroring the existing orders pattern — use `inArray(saleItems.saleId, saleIds)` with lookup map, zip items into sale rows
- **Implicit response type** like orders — just add items to data, no explicit SaleWithItems DTO needed. Frontend Sale types already expect `items` array
- **No item count column** in web sales table list view — items only visible in detail sheet/bottom sheet
- Keep current list views unchanged (sale number, customer, total, status, payment method, date)

### Item display format

- **Same format on both web and mobile** — product name, quantity x price, subtotal on the right
- Consistent layout pattern across platforms (no platform-specific variations for this fix)

### Claude's Discretion

- **`notes` field** — decide whether to add `notes` text column to DB sales table (purchases have notes, orders don't) or remove notes references from frontend views
- **SKU display** — decide whether to show saleItem SKU in detail views based on density and what other entity details show
- **Field naming alignment** — decide whether frontend types adopt DB names (`price`, `subtotal`) or map them to display names (`unitPrice`, `total`). Success criteria says use `item.price` not `unitPrice`
- **Customer section after dropping email** — decide what to show (name only, or name + customerId)
- **Empty items state** — handle gracefully if a sale has zero items in DB

</decisions>

<specifics>
## Specific Ideas

- Mirror the exact orders.service.ts batch-loading pattern (lines 92-118) — `inArray`, `Map<number, items[]>`, zip into response
- Success criteria explicitly states: `item.price` (not `unitPrice`), no `sale.customerEmail` references
- The `findOne()` method already correctly loads items — only `findAll()` is broken

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `orders.service.ts` batch-loading pattern (lines 92-118): `inArray()` query, `Map` lookup, zip into rows — copy this for sales
- `saleItems` schema already imported in `sales.service.ts`
- `inArray` from drizzle-orm (already imported in orders.service.ts, needs import in sales.service.ts)
- `formatCurrency` from `@objetiva/utils` already used in both web and mobile sale views

### Established Patterns

- Orders/purchases batch-load items in `findAll()` using `inArray` + Map lookup
- Frontend types define `items: SaleItem[]` on `Sale` interface (both platforms)
- Web uses Sheet component for detail views, mobile uses BottomSheet component
- Both platforms show: customer info section, items list, totals breakdown, payment method, date

### Integration Points

- `apps/backend/src/modules/sales/sales.service.ts` — `findAll()` method needs batch-loading (lines 83-93)
- `apps/web/src/types/sale.ts` — SaleItem type: `unitPrice` → `price`, `total` → align with DB
- `apps/mobile/src/types/index.ts` — SaleItem type (lines 81-88): same field alignment
- `apps/web/src/components/tables/sales/sale-sheet.tsx` — references `customerEmail` (line 59), `unitPrice` (line 74)
- `apps/mobile/src/pages/Sales.tsx` — references `customerEmail` (line 120), `unitPrice` (line 133)
- DB schema: `sale_items` table has `price` and `subtotal` columns (not `unitPrice`/`total`)
- DB schema: `sales` table has NO `customerEmail` or `notes` columns

</code_context>

<deferred>
## Deferred Ideas

- Web Sale type `id: string` → `id: number` alignment — Phase 12 scope
- Adding `customerEmail` to sales DB table for parity with orders — decided against, dropping instead

</deferred>

---

_Phase: 11-fix-sales-detail-crash_
_Context gathered: 2026-03-03_
