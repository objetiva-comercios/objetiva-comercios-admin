# Phase 13: Tech Debt Cleanup - Context

**Gathered:** 2026-03-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Close 5 actionable tech debt items identified by the v1.0 milestone audit. Fix mobile TS compilation error, remove dead code and dead links, fix formatting inconsistency, remove unused token. The 6th audit item (empty AppService) is intentional and excluded.

</domain>

<decisions>
## Implementation Decisions

### Forgot-password link handling

- Remove the `/forgot-password` link entirely from `apps/web/src/app/(auth)/login/page.tsx` (lines 116-121)
- Do not replace with a disabled/grayed-out placeholder
- No forgot-password route exists and none is planned for v1.0

### Stats card subtitle format

- Replace manual `$${formatNumber(stats.todayRevenue)}` with `formatCurrency(stats.todayRevenue)` in `apps/web/src/components/dashboard/stats-cards.tsx` line 17
- Match the same MXN locale format used by the main KPI value above it
- Keep the "today" suffix text as-is

### Colors token cleanup scope

- Delete `packages/ui/src/tokens/colors.ts` entirely
- Clean `packages/ui/src/tokens/index.ts`: remove `colors` import, re-export, and `colors` key from the `tokens` object
- Keep `spacing` and `typography` tokens intact

### SplashGate TypeScript fix

- Change `error: Error` to `error: unknown` in `apps/mobile/src/components/ui/SectionErrorFallback.tsx` line 4
- This resolves 8 TS errors caused by incompatibility with react-error-boundary's `FallbackProps.error: unknown`

### Dead code removal

- Delete `fetchLowStock()` export from `apps/web/src/lib/api.ts` (lines 146-148)
- Function is orphaned — low-stock data now arrives via the dashboard endpoint

### Verification approach

- Run `tsc --noEmit` across all three apps (mobile, web, backend) after all fixes
- Fixes touch 3 different apps — full monorepo type-check ensures no regressions

### Claude's Discretion

- Order of fixes within the implementation
- Whether to run additional lint checks beyond tsc
- Commit granularity (single commit or per-fix)

</decisions>

<specifics>
## Specific Ideas

No specific requirements — all 5 items are prescriptive from the v1.0 milestone audit with exact file locations and fix descriptions.

</specifics>

<code_context>

## Existing Code Insights

### Reusable Assets

- `formatCurrency` utility: Already used by the main KPI value in stats-cards.tsx — reuse for subtitle
- `formatNumber` utility: Currently used by subtitle — will be replaced but stays available for non-currency values

### Established Patterns

- Token exports via barrel `index.ts` in `packages/ui/src/tokens/` — follow same pattern when removing colors
- Error boundary pattern uses react-error-boundary's `FallbackProps` — fix aligns with library types

### Integration Points

- `SectionErrorFallback` is used by `SplashGate.tsx` error boundaries across all 8 mobile routes
- `stats-cards.tsx` renders on the web dashboard homepage
- `tokens/index.ts` is the public API of `@objetiva/ui` tokens — removing colors changes the package export surface

</code_context>

<deferred>
## Deferred Ideas

- Forgot-password feature using Supabase Auth `resetPasswordForEmail` — future phase if needed

</deferred>

---

_Phase: 13-tech-debt-cleanup_
_Context gathered: 2026-03-03_
