# Phase 18: Fix Inventarios Article Count Display - Research

**Researched:** 2026-03-06
**Domain:** Drizzle ORM aggregation queries / NestJS service layer bug fix
**Confidence:** HIGH

## Summary

This phase addresses two backend-only bugs in `InventariosService` that cause article counts to display as 0 on both the inventario detail and list pages. Both issues are well-understood with clear fixes identified from code inspection.

**INT-01** is a field name mismatch: `findOne()` computes the count correctly but returns it as `totalArticulosContados` (line 113), while the frontend `Inventario` type reads `totalArticulos`. The fix is a single-line rename in the backend return object.

**INT-02** is a missing aggregation: `findAll()` does not include any article count data in its response. The fix is to add a COUNT subquery on `inventarios_articulos` grouped by `inventarioId`, following the exact pattern already used by `DepostitosService.findAll()` for stock summaries.

**Primary recommendation:** Fix both issues in `inventarios.service.ts` only. No frontend changes needed -- the type interface and rendering code already expect `totalArticulos` with `?? 0` fallback.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

- INT-01: Rename backend return field from `totalArticulosContados` to `totalArticulos` at `inventarios.service.ts:113`
- INT-02: Add COUNT subquery on `inventarios_articulos` table grouped by inventarioId to findAll() results
- INT-02: Follow existing pattern from depositos service which does similar stock summary aggregation
- Frontend type and rendering already correct -- no frontend changes needed for INT-01

### Claude's Discretion

- Subquery vs JOIN approach for findAll aggregation (whichever is cleaner with Drizzle)
- Whether to extract count query as reusable helper or inline it

### Deferred Ideas (OUT OF SCOPE)

None.
</user_constraints>

<phase_requirements>

## Phase Requirements

| ID     | Description                                                                     | Research Support                                                                                                               |
| ------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| INV-01 | User can create an inventory count event (nombre, fecha, deposito, description) | INT-01 fix ensures detail page shows correct count; INT-02 fix ensures list page shows correct count per inventario            |
| INV-04 | User can view discrepancies between counted quantities and system stock         | INT-01 fix ensures the detail page summary card shows correct total articles counted, providing context for discrepancy review |

</phase_requirements>

## Standard Stack

### Core

| Library        | Version           | Purpose           | Why Standard                         |
| -------------- | ----------------- | ----------------- | ------------------------------------ |
| drizzle-orm    | (project version) | SQL query builder | Already used throughout all services |
| @nestjs/common | (project version) | Service layer     | Standard project framework           |

No new libraries needed. This is a pure bug fix in existing service code.

## Architecture Patterns

### Pattern 1: Separate Aggregation Query (Depositos Pattern)

**What:** Run a second query to aggregate counts, then merge results via Map lookup.
**When to use:** When aggregation is across a related table and you want to avoid complex JOINs in the main query.
**Example (from `depositos.service.ts:18-43`):**

```typescript
// 1. Fetch main list
const data = await this.drizzle.db.select().from(depositos).orderBy(asc(depositos.nombre))

// 2. Aggregate related data separately
const summaries = await this.drizzle.db
  .select({
    depositoId: existencias.depositoId,
    totalArticulos: count(),
  })
  .from(existencias)
  .groupBy(existencias.depositoId)

// 3. Merge via Map
const summaryMap = new Map(summaries.map(s => [s.depositoId, s.totalArticulos]))
return data.map(item => ({
  ...item,
  totalArticulos: summaryMap.get(item.id) ?? 0,
}))
```

### Pattern 2: Drizzle Subquery (Alternative)

**What:** Use Drizzle's `sql` tagged template to embed a correlated subquery directly in the select.
**When to use:** When you want a single query and the aggregation is simple (one COUNT).
**Example:**

```typescript
const data = await this.drizzle.db
  .select({
    id: inventarios.id,
    // ... other fields
    totalArticulos: sql<number>`(
      SELECT COUNT(*) FROM inventarios_articulos
      WHERE inventarios_articulos.inventario_id = ${inventarios.id}
    )`.mapWith(Number),
  })
  .from(inventarios)
  .innerJoin(depositos, eq(inventarios.depositoId, depositos.id))
  .where(where)
  .orderBy(desc(inventarios.fecha))
  .limit(limit)
  .offset(offset)
```

### Recommendation: Separate Query (Pattern 1)

The depositos pattern is already established in this codebase. It is simpler to read, easier to maintain, and consistent with existing conventions. The separate query approach also avoids N+1 concerns since it is a single aggregation query, not per-row.

However, for a paginated list, Pattern 1 has a subtle issue: the summaries query fetches ALL inventarios' counts, not just the current page. For a small dataset this is fine. If efficiency matters, Pattern 2 (subquery) embeds the count inline and only computes for returned rows.

**Final recommendation:** Use the separate query pattern (Pattern 1) for consistency with depositos service. The dataset is small enough that fetching all counts is negligible.

### Anti-Patterns to Avoid

- **Changing the frontend type to match backend:** The frontend type `totalArticulos` is the correct, clean name. The backend should align to it, not the other way around.
- **Adding a new endpoint for counts:** Overkill. The count belongs in the existing findAll/findOne responses.

## Don't Hand-Roll

| Problem           | Don't Build          | Use Instead                   | Why                       |
| ----------------- | -------------------- | ----------------------------- | ------------------------- |
| Count aggregation | Manual loop counting | Drizzle `count()` + `groupBy` | SQL does this in one pass |

## Common Pitfalls

### Pitfall 1: Forgetting the ?? 0 fallback in Map.get()

**What goes wrong:** Inventarios with zero articles get `undefined` instead of `0`.
**Why it happens:** `Map.get()` returns `undefined` for missing keys.
**How to avoid:** Always use `summaryMap.get(id) ?? 0` (the frontend already does this, backend merge must too).

### Pitfall 2: Column name vs JS property name confusion

**What goes wrong:** Using JS camelCase (`inventarioId`) in raw SQL strings where snake_case (`inventario_id`) is needed.
**Why it happens:** Drizzle schema uses camelCase properties that map to snake_case columns.
**How to avoid:** If using `sql` tagged template, use column references (`${inventariosArticulos.inventarioId}`) or literal snake_case strings.

### Pitfall 3: count() returns string in some Drizzle adapters

**What goes wrong:** `totalArticulos` is a string "5" instead of number 5.
**Why it happens:** PostgreSQL returns COUNT as bigint, which some drivers serialize as string.
**How to avoid:** The existing codebase already handles this (depositos service works), but if using raw `sql`, add `.mapWith(Number)`.

## Code Examples

### Fix INT-01: Rename field in findOne() (line 111-114)

Current (broken):

```typescript
return {
  ...rows[0],
  totalArticulosContados: summary?.totalArticulos ?? 0,
}
```

Fixed:

```typescript
return {
  ...rows[0],
  totalArticulos: summary?.totalArticulos ?? 0,
}
```

### Fix INT-02: Add aggregation to findAll()

After the main `data` query (line 61-78), before the return:

```typescript
// Count articles per inventario
const articleCounts = await this.drizzle.db
  .select({
    inventarioId: inventariosArticulos.inventarioId,
    totalArticulos: count(),
  })
  .from(inventariosArticulos)
  .groupBy(inventariosArticulos.inventarioId)

const countMap = new Map(articleCounts.map(c => [c.inventarioId, c.totalArticulos]))

const dataWithCounts = data.map(inv => ({
  ...inv,
  totalArticulos: countMap.get(inv.id) ?? 0,
}))

const totalPages = Math.ceil(total / limit)
return new PaginatedResponseDto(dataWithCounts, { total, page, limit, totalPages })
```

## State of the Art

No relevant changes -- this is a bug fix using existing patterns. Drizzle ORM `count()` and `groupBy` are stable APIs.

## Open Questions

None. Both fixes are straightforward with clear expected behavior verified by examining frontend rendering code.

## Sources

### Primary (HIGH confidence)

- Direct code inspection of `inventarios.service.ts` (lines 106-114 for INT-01, lines 35-82 for INT-02)
- Direct code inspection of `depositos.service.ts` (lines 14-44 for aggregation pattern)
- Direct code inspection of `inventario.ts` frontend type (line 9: `totalArticulos?: number`)
- Direct code inspection of `inventario-detail.tsx` (line 198: `inventario.totalArticulos ?? 0`)
- Direct code inspection of `inventario-list.tsx` (line 163: `inventario.totalArticulos ?? 0`)
- v1.1 Milestone Audit report (INT-01, INT-02 definitions)

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH - no new libraries, pure bug fix
- Architecture: HIGH - follows existing depositos aggregation pattern verbatim
- Pitfalls: HIGH - issues are trivial, pitfalls are minor

**Research date:** 2026-03-06
**Valid until:** indefinite (bug fix research, not library-dependent)
