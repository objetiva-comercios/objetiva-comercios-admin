# Phase 10: Code Quality & Type Safety Cleanup - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Remove dead code (AuthMiddleware), consolidate duplicated utilities (formatCurrency/formatDate from @objetiva/utils), share validation schemas (signupSchema from @objetiva/types in mobile), and fix type mismatches (Order/Purchase id typed as number matching backend). No new features — cleanup and consistency only.

</domain>

<decisions>
## Implementation Decisions

### Locale strategy for formatters

- Update @objetiva/utils to accept locale/currency params: `formatCurrency(amount, currency?, locale?)` and `formatDate(date, locale?)`
- Default to `es-MX` / `MXN` since this is a Mexican business app
- Web app should also use es-MX/MXN formatting for consistency across platforms
- Date formatting in Spanish (es-MX locale) to match the Mexican audience
- Web's date-fns usage stays separate — only consolidate formatCurrency in web, not dates. Web uses `format`/`formatDistanceToNow` from date-fns which is a different pattern

### Scope of type fixes in mobile

- Fix ALL entity id types from `string` to `number`: Order, OrderItem, Purchase, PurchaseItem, Sale, SaleItem, Product, Inventory
- Fix ripple effects: change types and fix all TypeScript build errors that surface
- Keep types local in mobile for now — moving to @objetiva/types is a bigger refactor for a future phase
- Claude investigates API call patterns during implementation to ensure number ids work at the boundaries

### Mobile signup validation approach

- Mirror Login.tsx's existing pattern — Signup should follow the same approach Login already uses for shared schema validation
- Import `signupSchema` from `@objetiva/types` and replace manual if-checks (lines 20-37 in Signup.tsx)
- Keep English error messages for now — localization is a separate concern
- Keep password strength indicator (getPasswordStrength) separate from schema validation — different purposes

### Dead code removal

- Delete `auth.middleware.ts` file — confirmed 100% dead code, nothing references it
- Stick to the 4 specified success criteria — no broad dead code sweep
- Claude verifies JwtAuthGuard coverage as a safety check before deleting
- Claude verifies @objetiva/utils and @objetiva/types package health during implementation

### Claude's Discretion

- Exact implementation of locale parameter signatures in @objetiva/utils
- How to handle edge cases in type migration (string-to-number coercion at API boundaries)
- Whether to clean up any comments/docs mentioning AuthMiddleware if found
- Package build verification approach

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `@objetiva/utils` package: `formatCurrency(amount, currency)` and `formatDate(date)` in `packages/utils/src/formatters.ts` — needs locale params added
- `@objetiva/types` package: `signupSchema`, `loginSchema`, `emailSchema`, `passwordSchema` in `packages/types/src/index.ts`
- `JwtAuthGuard` in `apps/backend/src/common/guards/jwt-auth.guard.ts` — globally registered, handles all auth
- Mobile `Login.tsx` already imports `loginSchema` from `@objetiva/types` — pattern to follow for Signup

### Established Patterns

- Web uses `zodResolver` + `react-hook-form` for form validation with shared schemas
- Mobile Login imports shared schema from `@objetiva/types` — Signup should follow same pattern
- Backend uses Drizzle ORM with `serial('id').primaryKey()` → all ids are numbers
- Web formatCurrency uses inline closures or module-scope functions — all match en-US/USD pattern

### Integration Points

- 12 files with local formatCurrency/formatDate duplicates (6 mobile, 6 web) need import changes
- `apps/mobile/src/types/index.ts` — central type definitions, 8 entity types need id: string → number
- `apps/mobile/src/pages/Signup.tsx` — manual validation (lines 20-37) replaced with schema import
- `apps/backend/src/auth/auth.middleware.ts` — file to delete

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. This is a cleanup phase focused on consistency and correctness.

</specifics>

<deferred>
## Deferred Ideas

- Full i18n/localization system for error messages and UI text — future phase
- Moving mobile entity types to @objetiva/types shared package — future refactor phase
- Broader dead code sweep across the monorepo — could be a maintenance task
- Web date formatting consolidation into @objetiva/utils — web's date-fns usage is fine as-is

</deferred>

---

_Phase: 10-code-quality-type-safety-cleanup_
_Context gathered: 2026-03-02_
