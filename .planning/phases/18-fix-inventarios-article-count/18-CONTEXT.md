# Phase 18: Fix Inventarios Article Count Display - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix two integration issues where inventario article counts display as 0: a field name mismatch in findOne() and missing aggregation in findAll(). Closes INT-01 and INT-02 from the v1.1 milestone audit.

</domain>

<decisions>
## Implementation Decisions

### INT-01: Field name mismatch (detail page)

- Backend `findOne()` returns `totalArticulosContados` but frontend Inventario type expects `totalArticulos`
- Fix: Rename backend return field from `totalArticulosContados` to `totalArticulos` at `inventarios.service.ts:113`
- Frontend type and rendering already correct — no frontend changes needed for this fix

### INT-02: Missing list aggregation (list page)

- `findAll()` does not include article count per inventario — list page always shows 0
- Fix: Add COUNT subquery on `inventarios_articulos` table grouped by inventarioId to findAll() results
- Follow existing pattern from depositos service which does similar stock summary aggregation

### Claude's Discretion

- Subquery vs JOIN approach for findAll aggregation (whichever is cleaner with Drizzle)
- Whether to extract count query as reusable helper or inline it

</decisions>

<code_context>

## Existing Code Insights

### Reusable Assets

- `inventarios.service.ts:107`: findOne already has the count query (`select({ totalArticulos: count() })`) — just needs field rename
- `depositos.service.ts:21`: Pattern for aggregation subquery in list endpoints (totalArticulos count per deposito)
- `inventarios_articulos` table with `inventarioId` FK — join target for aggregation

### Established Patterns

- Drizzle `count()` import from `drizzle-orm` used throughout services
- `PaginatedResponseDto` wraps findAll results — aggregated field goes in data items
- Frontend uses `?? 0` fallback for optional numeric fields

### Integration Points

- `apps/web/src/types/inventario.ts:9` — `totalArticulos?: number` already defined
- `apps/web/src/components/inventarios/inventario-detail.tsx:198` — renders `inventario.totalArticulos ?? 0`
- `apps/web/src/components/inventarios/inventario-list.tsx:163` — renders `inventario.totalArticulos ?? 0`

</code_context>

<specifics>
## Specific Ideas

No specific requirements — straightforward bug fix with clear expected behavior (show actual article count instead of 0).

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

_Phase: 18-fix-inventarios-article-count_
_Context gathered: 2026-03-06_
