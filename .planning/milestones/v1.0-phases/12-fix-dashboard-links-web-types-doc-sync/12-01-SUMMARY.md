---
phase: 12-fix-dashboard-links-web-types-doc-sync
plan: '01'
subsystem: web-dashboard-types-mobile
tags: [dashboard, types, mobile, documentation, gap-closure]
dependency_graph:
  requires: [11-01]
  provides: [dashboard-sheet-panels, web-number-ids, mobile-mxn-currency, doc-sync]
  affects:
    [
      apps/web/src/components/dashboard,
      apps/web/src/types,
      apps/web/src/lib/api.ts,
      apps/mobile/src/pages/Dashboard.tsx,
      .planning/REQUIREMENTS.md,
      .planning/ROADMAP.md,
    ]
tech_stack:
  added: []
  patterns:
    - Client Component + useState + Sheet side panel (established in orders-client.tsx, now applied to dashboard widgets)
    - Browser Supabase client (createBrowserSupabaseClient alias) for client-side authenticated fetch helpers
    - React fragment wrapper (<>...</>) to co-locate Sheet with its trigger Card
key_files:
  created: []
  modified:
    - apps/mobile/src/pages/Dashboard.tsx
    - apps/web/src/types/order.ts
    - apps/web/src/types/product.ts
    - apps/web/src/types/sale.ts
    - apps/web/src/types/purchase.ts
    - apps/web/src/types/inventory.ts
    - apps/web/src/components/dashboard/recent-orders.tsx
    - apps/web/src/components/dashboard/low-stock-alerts.tsx
    - apps/web/src/lib/api.ts
    - .planning/REQUIREMENTS.md
    - .planning/ROADMAP.md
decisions:
  - Mobile Dashboard uses formatCurrency from @objetiva/utils replacing local Intl.NumberFormat — all 4 currency occurrences (todayRevenue, pendingValue, weekRevenue, order.total) now MXN/es-MX
  - Dashboard components converted from Server to Client Components to support onClick sheet panels — Server Component parent (page.tsx) can import Client Components in Next.js 14 App Router
  - fetchOrderById/fetchProductById use browser Supabase client with createBrowserSupabaseClient alias to avoid name collision with existing server createClient import in api.ts
  - LowStockAlerts uses item.productId (not item.id) for product fetch — item.id is inventory row ID, item.productId is the actual product ID needed for GET /api/products/:id
metrics:
  duration: 3 min
  completed: 2026-03-03
  tasks_completed: 3
  files_modified: 11
---

# Phase 12 Plan 01: Fix Dashboard Links, Web Types & Doc Sync Summary

**One-liner:** Dashboard dead links replaced with OrderSheet/ProductSheet side panels, web entity IDs migrated from string to number, mobile currency fixed to MXN/es-MX, and documentation checkboxes synced.

## Tasks Completed

| #   | Task                                                | Commit  | Key Files                                                                                       |
| --- | --------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------- |
| 1   | Mobile currency fix and documentation checkbox sync | 6956546 | apps/mobile/src/pages/Dashboard.tsx, .planning/REQUIREMENTS.md, .planning/ROADMAP.md            |
| 2   | Web entity ID type migration (string to number)     | 75701b5 | apps/web/src/types/{order,product,sale,purchase,inventory}.ts                                   |
| 3   | Convert dashboard dead links to sheet panels        | 187620e | apps/web/src/components/dashboard/{recent-orders,low-stock-alerts}.tsx, apps/web/src/lib/api.ts |

## Verification Results

- `pnpm --filter=@objetiva/web exec tsc --noEmit` — zero errors after both type migration and dashboard component changes
- `grep -r "id: string" apps/web/src/types/{order,product,sale,purchase,inventory}.ts` — 0 matches
- `grep -c "currency.format" apps/mobile/src/pages/Dashboard.tsx` — 0 matches
- `grep "'use client'" apps/web/src/components/dashboard/recent-orders.tsx` — match found
- `grep "'use client'" apps/web/src/components/dashboard/low-stock-alerts.tsx` — match found
- No `import Link` in either dashboard component
- REQUIREMENTS.md: MONO-01, MONO-02, MONO-03, DOC-01, DOC-02, DOC-04 changed to [x]
- ROADMAP.md: 06-01/02/03/04, 07-01/02, 10-04, 11-01 plan checkboxes changed to [x]

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing functionality] Fixed 4th currency.format occurrence in mobile Dashboard**

- **Found during:** Task 1
- **Issue:** Plan mentioned replacing "3 occurrences" but Dashboard.tsx had a 4th `currency.format(order.total)` call in the Recent Orders section
- **Fix:** Replaced `currency.format(order.total)` with `formatCurrency(order.total)` in the recent orders list
- **Files modified:** apps/mobile/src/pages/Dashboard.tsx
- **Commit:** 6956546

None of the other tasks had deviations — plan executed exactly as written for Tasks 2 and 3.

## Decisions Made

1. Mobile Dashboard uses `formatCurrency` from `@objetiva/utils` replacing local `Intl.NumberFormat` — all currency values now consistently MXN/es-MX
2. Dashboard components converted from Server to Client Components — Next.js 14 App Router supports Server Component parent importing Client Components with serializable props
3. `fetchOrderById`/`fetchProductById` use browser Supabase client with `createBrowserSupabaseClient` alias to avoid name collision with existing server `createClient` import in api.ts
4. `LowStockAlerts` uses `item.productId` (not `item.id`) for product fetch — `item.id` is the inventory row ID

## Self-Check: PASSED

All created/modified files verified present on disk. All 3 task commits (6956546, 75701b5, 187620e) confirmed in git log.
