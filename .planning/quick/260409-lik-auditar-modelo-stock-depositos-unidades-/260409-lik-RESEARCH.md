# Quick Task 260409-lik: Auditar modelo stock/depositos/unidades - Research

**Researched:** 2026-04-09
**Domain:** Drizzle ORM + PostgreSQL data model unification
**Confidence:** HIGH

## Summary

El campo `articulos.unidades` (integer, default 0) es un vestigio del modelo pre-multi-deposito. Ya existe la tabla `existencias` con composite PK (articulo_codigo, deposito_id) que es la fuente de verdad para stock. El frontend solo muestra `erpUnidades` en la lista de articulos; `unidades` no se muestra en ningun lugar visible al usuario.

**Recomendacion principal:** Usar un trigger PostgreSQL para mantener `articulos.unidades` como columna denormalizada = SUM(existencias.cantidad). Esto es mas robusto que calcular en servicio y mas simple que una vista materializada.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- `unidades` sera un campo calculado = SUM(existencias.cantidad) consolidado
- No se almacena manualmente, se calcula desde existencias
- `erpUnidades` permanece como dato informativo del ERP (solo lectura)
- Migrar `articulos.unidades` → `existencias.cantidad` para deposito principal
- Solo migrar articulos donde unidades > 0
- Despues de migrar, `unidades` deja de ser un campo manual

### Claude's Discretion
- Estrategia tecnica para campo calculado (trigger, vista, query en servicio)
- Como manejar la transicion (mantener columna como cache vs eliminar)

### Deferred Ideas
(None)
</user_constraints>

## Current State Analysis

### articulos.unidades usage

| Location | Usage | Impact of Change |
|----------|-------|-----------------|
| `schema.ts` line 213 | `unidades: integer('unidades').default(0)` | Keep column, make it trigger-maintained |
| `update-articulo.dto.ts` line 110 | `unidades?: number` (writable) | **REMOVE** — no longer manually settable |
| `create-articulo.dto.ts` line 113 | `unidades?: number` (writable) | **REMOVE** — trigger handles it |
| `apps/web/src/types/articulo.ts` line 34 | `unidades: number \| null` (type) | Keep as read-only in type |
| Frontend list/detail | **NOT displayed** — only `erpUnidades` is shown | No frontend change needed |

### existencias model (already correct)

- Composite PK: `(articulo_codigo, deposito_id)` [VERIFIED: schema.ts]
- Fields: cantidad, stockMinimo, stockMaximo, updatedAt
- Service already has: `getLowStockAggregated()`, `getLowStockCount()`, `findMatrix()` with SUM logic [VERIFIED: existencias.service.ts]
- Dashboard KPIs already use existencias, not articulos.unidades [VERIFIED: dashboard.service.ts]

## Architecture Patterns

### Recommended: PostgreSQL Trigger (denormalized cache)

**Why trigger over alternatives:**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| **PG Trigger** | Automatic, zero app code for sync, works for all clients | Requires migration, invisible logic | **RECOMMENDED** |
| Service-layer compute | Visible in code, easy to debug | Every query needs JOIN+SUM, breaks existing API contract | Too invasive |
| Materialized view | Good for complex analytics | Overkill for single SUM, stale data between refreshes | Over-engineered |
| Remove column entirely | Cleanest model | Breaks API contract, frontend types, any consumer reading `unidades` | Too disruptive |

### Trigger Implementation Pattern

```sql
-- Function: recalculate articulos.unidades from existencias
CREATE OR REPLACE FUNCTION update_articulo_unidades()
RETURNS TRIGGER AS $$
DECLARE
  target_codigo TEXT;
BEGIN
  -- Determine which articulo_codigo was affected
  IF TG_OP = 'DELETE' THEN
    target_codigo := OLD.articulo_codigo;
  ELSE
    target_codigo := NEW.articulo_codigo;
  END IF;

  -- Update the denormalized sum
  UPDATE articulos
  SET unidades = COALESCE((
    SELECT SUM(cantidad) FROM existencias
    WHERE articulo_codigo = target_codigo
  ), 0)
  WHERE codigo = target_codigo;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger on existencias table
CREATE TRIGGER trg_update_articulo_unidades
AFTER INSERT OR UPDATE OF cantidad OR DELETE ON existencias
FOR EACH ROW
EXECUTE FUNCTION update_articulo_unidades();
```

[VERIFIED: standard PostgreSQL trigger pattern — PG docs] 

### Data Migration SQL

```sql
-- Step 1: Insert into existencias for deposito principal (id must be looked up)
INSERT INTO existencias (articulo_codigo, deposito_id, cantidad, stock_minimo, stock_maximo, updated_at)
SELECT
  a.codigo,
  (SELECT id FROM depositos WHERE nombre = 'Depósito principal' LIMIT 1),
  a.unidades,
  0,  -- stockMinimo: no data to migrate
  0,  -- stockMaximo: no data to migrate
  NOW()
FROM articulos a
WHERE a.unidades > 0
ON CONFLICT (articulo_codigo, deposito_id)
DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  updated_at = NOW();

-- Step 2: Verify migration
SELECT COUNT(*) as migrated FROM existencias
WHERE deposito_id = (SELECT id FROM depositos WHERE nombre = 'Depósito principal');
```

**Safety notes:**
- `ON CONFLICT DO UPDATE` is idempotent — safe to re-run [VERIFIED: PostgreSQL upsert]
- Only migrates `unidades > 0` per user decision
- Does NOT touch `erpUnidades` — that's informative only

## Drizzle ORM Patterns

### Generated Columns in Drizzle

Drizzle 0.45.x supports `.generatedAlwaysAs()` for PostgreSQL GENERATED ALWAYS AS columns, but these only work for expressions on the SAME ROW (e.g., `fullName = firstName || lastName`). Cross-table aggregations like `SUM(existencias.cantidad)` are **not possible** with generated columns. [ASSUMED — based on PostgreSQL spec: GENERATED columns cannot reference other tables]

**Therefore:** The trigger approach is the correct pattern. Drizzle doesn't need to know the column is trigger-maintained — it just sees a regular `integer` column.

### Migration via Drizzle

The trigger and data migration should be done as raw SQL in a Drizzle migration file:

```typescript
// In a custom migration file
import { sql } from 'drizzle-orm'

// Execute via drizzle-kit custom migration or direct SQL
```

Since the project uses `db:push` for schema sync (not incremental migrations), the trigger should be created via a standalone migration script, similar to how `migrate-images.ts` exists. [VERIFIED: package.json scripts + existing migrate-images.ts]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Cross-table computed column | Custom sync in every service method | PostgreSQL trigger |
| Idempotent data migration | Manual INSERT checks | `ON CONFLICT DO UPDATE` |
| Recalculating sums | Polling/cron jobs | Row-level trigger (real-time) |

## Common Pitfalls

### Pitfall 1: Forgetting to handle UPDATE of articulo_codigo in existencias
**What goes wrong:** If `articulo_codigo` changes in existencias (unlikely due to FK, but possible via cascade), the OLD articulo's sum doesn't get updated.
**How to avoid:** The trigger should also fire on UPDATE and handle both OLD and NEW articulo_codigo if they differ. In practice, the composite PK means the codigo can't change via UPDATE (it's part of the PK), so this is LOW risk.

### Pitfall 2: DTO still accepting `unidades` on create/update
**What goes wrong:** Client sends `unidades: 50`, it gets written to DB, then trigger overwrites it on next existencias change — confusing behavior.
**How to avoid:** Remove `unidades` from `CreateArticuloDto` and `UpdateArticuloDto`. Make it read-only.

### Pitfall 3: Migration without deposito check
**What goes wrong:** "Deposito principal" doesn't exist or has a different name.
**How to avoid:** The migration script should fail-fast if no deposito is found, not silently skip.

## Code Changes Required

### Backend Changes
1. **Remove `unidades` from DTOs** — `create-articulo.dto.ts`, `update-articulo.dto.ts`
2. **Create migration script** — `apps/backend/src/db/migrate-unidades.ts`
   - Creates trigger function + trigger
   - Migrates articulos.unidades → existencias for deposito principal
   - Recalculates all articulos.unidades via trigger
3. **Keep `unidades` in schema.ts** — column stays, just becomes read-only (trigger-maintained)
4. **No changes to existencias.service.ts** — already correct, dashboard already uses it

### Frontend Changes
- **None required** — frontend doesn't display `articulos.unidades` anywhere. It shows `erpUnidades` in the list and `existencias.cantidad` in stock views.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PostgreSQL GENERATED ALWAYS AS cannot reference other tables | Drizzle ORM Patterns | LOW — this is per SQL spec, but if wrong, could use generated column instead of trigger |
| A2 | "Deposito principal" is the exact name in production | Migration SQL | MEDIUM — script should query by pattern or accept ID as parameter |

## Open Questions

1. **Deposito principal ID** — What's the exact `id` and `nombre` of the deposito in production? Migration script should look it up by name, but confirming would be safer.

## Sources

### Primary (HIGH confidence)
- Codebase: `apps/backend/src/db/schema.ts` — full schema reviewed
- Codebase: `apps/backend/src/modules/existencias/existencias.service.ts` — all queries reviewed
- Codebase: `apps/backend/src/modules/dashboard/dashboard.service.ts` — KPI queries verified
- Codebase: `apps/web/src/components/articulos/` — frontend usage of unidades verified

### Secondary (MEDIUM confidence)
- npm registry: drizzle-orm 0.45.2 current [VERIFIED: npm view]
- PostgreSQL trigger syntax: standard pattern [CITED: PostgreSQL docs]
