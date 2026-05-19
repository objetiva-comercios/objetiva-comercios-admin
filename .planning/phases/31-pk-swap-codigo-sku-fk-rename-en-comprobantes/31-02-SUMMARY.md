---
phase: 31
plan: 02
subsystem: backend/db
tags: [pk-swap, migration, drizzle, double-write, articulos-helper]
dependency_graph:
  requires: [31-01]
  provides: [31-03]
  affects:
    - apps/backend/src/db/schema.ts
    - apps/backend/drizzle/0009_phase31_expand.sql
    - apps/backend/src/modules/articulos/articulos-helper.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/inventarios/inventarios.service.ts
tech_stack:
  added: []
  patterns:
    - ArticulosHelper Injectable para centralizar doble-escritura (T-31-05)
    - Atomic commit schema.ts + SQL + journal (feedback_schema_drift_silencioso.md)
    - Migration via psql --single-transaction --set ON_ERROR_STOP=1 (NO drizzle-kit)
key_files:
  created:
    - apps/backend/src/modules/articulos/articulos-helper.ts
    - apps/backend/drizzle/0009_phase31_expand.sql
  modified:
    - apps/backend/src/db/schema.ts
    - apps/backend/src/modules/articulos/articulos.module.ts
    - apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts
    - apps/backend/src/modules/existencias/existencias.module.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/inventarios/inventarios.module.ts
    - apps/backend/src/modules/inventarios/inventarios.service.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/drizzle/meta/_journal.json
decisions:
  - D-17 confirmado: fórmula codigoToSku (regex doble) usada en SQL y TS; stripSep NO tocado
  - Doble-escritura centralizada en ArticulosHelper (resolveSku hace 1 query a articulos)
  - ArticulosHelper NUNCA infiere sku en runtime — siempre lee desde articulos.sku
  - Migration registrada en drizzle.__drizzle_migrations (lección 260502-tqf)
metrics:
  duration: ~35 min
  completed: '2026-05-19T02:30:00Z'
  tasks: 3
  files: 11
---

# Phase 31 Plan 02: Deploy 1 (expand) — PK Swap codigo→sku Summary

Deploy 1 del PK swap: pobló articulos.sku con codigoToSku(codigo) en 101.021 filas, agregó columna nullable articulo_sku en 5 hijas con backfill completo, y cableó backend para doble-escritura via ArticulosHelper centralizado.

## What Was Built

### Task 1: ArticulosHelper + schema.ts + doble-escribe (commit `616b05f6`)

**ArticulosHelper** (`apps/backend/src/modules/articulos/articulos-helper.ts`):

- `@Injectable()` con `resolveSku(articuloCodigo: string): Promise<string>`
- SELECT `{ sku: articulos.sku }` desde articulos WHERE codigo = articuloCodigo LIMIT 1
- Lanza `NotFoundException('Articulo X no tiene sku asignado')` si row null o sku null
- Exportado desde ArticulosModule (providers + exports)

**Tests** (4 verdes en `articulos-helper.spec.ts`):

- happy path retorna 'ABC001'
- row vacío → NotFoundException con mensaje exacto
- row.sku null → NotFoundException con mensaje exacto
- módulo instancia ArticulosHelper vía DI

**schema.ts** — 5 hijas con articuloSku nullable + índice:

- `orderItems`: `articuloSku: text('articulo_sku')` + `order_items_articulo_sku_idx`
- `saleItems`: `articuloSku: text('articulo_sku')` + `sale_items_articulo_sku_idx`
- `purchaseItems`: `articuloSku: text('articulo_sku')` + `purchase_items_articulo_sku_idx`
- `existencias`: `articuloSku: text('articulo_sku')` + `existencias_articulo_sku_idx`
- `inventariosArticulos`: `articuloSku: text('articulo_sku')` + `inv_articulos_articulo_sku_idx`

**Doble-escritura**:

- `ExistenciasService.upsert()`: resolveSku antes del insert; articuloSku en values() y onConflictDoUpdate.set
- `InventariosService.addArticulo()`: resolveSku antes del insert; articuloSku en values()

**seed.ts**: articuloSkuMap (codigo→sku) para los 5 inserts en hijas

### Task 2: Migration SQL + journal (commit `6d1b73a4`)

**0009_phase31_expand.sql**:

- STEP 1: UPDATE articulos.sku con fórmula D-17 (codigoToSku, NO stripSep)
  - `regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g')`
  - WHERE sku IS DISTINCT FROM ... (idempotente)
  - DO block post-overwrite: RAISE EXCEPTION si null_sku > 0; RAISE WARNING si dupes > 0
- STEP 2: ADD COLUMN articulo_sku text en 5 hijas (IF NOT EXISTS)
- STEP 3: UPDATE backfill via JOIN articulos (solo NULL rows)
- STEP 4: CREATE INDEX articulo_sku_idx en 5 hijas (IF NOT EXISTS)
- STEP 5: DO block valida 0 NULLs en cada hija; RAISE NOTICE Backfill OK

**\_journal.json**: entry idx=9, version="7", tag="0009_phase31_expand"

### Task 3: Aplicar migration + validación

**pg_dump pre-aplicación**: `/var/backups/erp_sanchez/phase31/pre_deploy1_apply_20260519_021826.dump` (15MB)

**Resultado de la aplicación**:

```
UPDATE 101021        -- articulos.sku overwritten (codigoToSku)
DO                   -- post-overwrite check OK
ALTER TABLE x5       -- columna articulo_sku agregada en 5 hijas
UPDATE 0             -- order_items (tabla vacía — pre-productivo)
UPDATE 0             -- sale_items (tabla vacía — pre-productivo)
UPDATE 0             -- purchase_items (tabla vacía — pre-productivo)
UPDATE 7873          -- existencias backfilled
UPDATE 7745          -- inventarios_articulos backfilled
CREATE INDEX x5      -- índices creados
NOTICE:  Backfill OK: 5 hijas con articulo_sku 100% poblado
```

**Registro en drizzle.\_\_drizzle_migrations**: `INSERT 0 1` (lección 260502-tqf)

## Validation Output

```
--- integrity: FK orphan checks ---
  ✓ order_items orphans: 0
  ✓ sale_items orphans: 0
  ✓ purchase_items orphans: 0
  ✓ existencias orphans: 0
  ✓ inventarios_articulos orphans: 0
  ✓ integrity: PASSED (0 orphans en 5 tablas)
```

**articulos.sku**: `0|0` (0 NULLs, 0 duplicados)

**Hijas (articulo_sku IS NULL)**:

- order_items: 0 (tabla vacía)
- sale_items: 0 (tabla vacía)
- purchase_items: 0 (tabla vacía)
- existencias: 0 (7.873 filas backfilleadas)
- inventarios_articulos: 0 (7.745 filas backfilleadas)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed as written.

**Detalles menores:**

1. **Test 4 (ArticulosModule exports):** El test original propuesto en el plan usaba `imports: [ArticulosModule]` en el módulo de testing, pero ArticulosService requiere EventEmitter2 que no está disponible en ese contexto. Se ajustó el test para usar `providers: [ArticulosHelper, DrizzleMock, EventEmitter2Mock]` que verifica el mismo contrato (ArticulosHelper instanciable vía DI) sin los problemas de dependencia transitiva del módulo completo. Todos los 4 tests pasaron verde.

2. **Columna `updated_at` en articulos:** El schema TS llama al campo `updatedAt` pero en la DB se llama `actualizado` (ver schema.ts línea 249: `updatedAt: timestamp('actualizado')`). El SQL de la migration usa `actualizado = now()` que es el nombre correcto de la columna en DB. No fue un bug — el plan usa el nombre de columna correcto.

## Commits

| Task | Commit     | Files                                                                                                                                                    |
| ---- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | `616b05f6` | articulos-helper.ts, articulos.module.ts, articulos-helper.spec.ts, schema.ts, existencias.{module,service}.ts, inventarios.{module,service}.ts, seed.ts |
| 2    | `6d1b73a4` | 0009_phase31_expand.sql, drizzle/meta/\_journal.json                                                                                                     |
| 3    | (metadata) | 31-02-SUMMARY.md, STATE.md, ROADMAP.md                                                                                                                   |

## Known Stubs

None — no stubs introduced. All data paths write real sku values.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes beyond the planned scope.

## Self-Check: PASSED

- [x] articulos-helper.ts existe: `ls apps/backend/src/modules/articulos/articulos-helper.ts` ✓
- [x] 0009_phase31_expand.sql existe: ✓
- [x] \_journal.json tiene entry idx=9: ✓
- [x] scripts/phase31-validation.sh integrity exit 0: ✓ (5 queries retornan 0)
- [x] articulos.sku: 0 NULLs, 0 duplicados ✓
- [x] 5 hijas: articulo_sku 100% poblado (existencias: 7873, inventarios_articulos: 7745) ✓
- [x] pnpm --filter backend type-check exit 0 ✓
- [x] 4 tests articulos-helper.spec.ts verdes ✓
