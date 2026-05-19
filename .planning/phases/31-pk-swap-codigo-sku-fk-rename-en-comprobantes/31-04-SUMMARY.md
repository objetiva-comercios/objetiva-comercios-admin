---
phase: 31
plan: 04
subsystem: db-migration, backend-cleanup, frontend-cleanup
tags: [phase31, deploy3, contract, drop-column, articulo-codigo, sku, migration]
dependency_graph:
  requires: [31-03]
  provides: [phase-31-complete]
  affects: [existencias, inventarios, order_items, sale_items, purchase_items]
tech_stack:
  added: []
  patterns:
    - OR query pattern (articulos.codigo OR articulos.sku) en endpoints de path param
    - DTO directo sin resolveSku en services (T-31-20 mitigado)
key_files:
  created:
    - apps/backend/drizzle/0011_phase31_contract.sql
    - .planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-04-SUMMARY.md
  modified:
    - apps/backend/drizzle/meta/_journal.json
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts
    - apps/backend/src/modules/existencias/dto/create-existencia.dto.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/inventarios/dto/create-inventario-articulo.dto.ts
    - apps/backend/src/modules/inventarios/inventarios.service.ts
    - apps/web/src/app/(dashboard)/articulos/existencias/existencias-client.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx
    - apps/web/src/components/dashboard/low-stock-alerts.tsx
    - apps/web/src/components/existencias/existencias-columns.tsx
    - apps/web/src/components/existencias/existencias-por-articulo.tsx
    - apps/web/src/components/existencias/existencias-por-deposito.tsx
    - apps/web/src/components/inventarios/articulo-search.tsx
    - apps/web/src/components/inventarios/conteo-table.tsx
    - apps/web/src/lib/api.client.ts
    - apps/web/src/types/dashboard.ts
    - apps/web/src/types/existencia.ts
    - apps/web/src/types/inventario.ts
    - apps/web/src/types/order.ts
    - apps/web/src/types/purchase.ts
    - apps/web/src/types/sale.ts
decisions:
  - ArticulosHelper se mantiene inyectado en existencias.service y inventarios.service como pass-through para Phase 32 (variantes)
  - Endpoints PATCH y GET by-articulo del controller mantienen :articuloCodigo como path param (agrupador por codigo), backend resuelve via OR (articulos.codigo OR articulos.sku) para backward compat
  - Generators de seed conservan articuloCodigo como clave interna de lookup (no se insertan en DB) — typecheck pasa
  - ExistenciaMatrixRow agrupadora cambia de articuloCodigo a articuloSku (Phase 32 separara codigo vs sku)
metrics:
  duration_seconds: 1033
  completed_date: '2026-05-19'
  tasks_completed: 2
  tasks_total: 3
  files_modified: 24
---

# Phase 31 Plan 04: Deploy 3 (contract) — DROP COLUMN articulo_codigo + backend simplificado + frontend cleanup Summary

**One-liner:** Migration 0011 aplicada OK (5 DROP COLUMN articulo_codigo + DO block validacion), backend simplifica services a DTO directo (sin resolveSku), frontend types y componentes 100% articuloSku, pnpm typechecks verdes.

## Lo que se hizo

### Task 1: Migration 0011 + schema.ts + backend simplificado

**Migration 0011 (apps/backend/drizzle/0011_phase31_contract.sql):**

- LOCK TABLE en las 5 hijas
- 5 x DROP INDEX IF EXISTS (existencias_articulo_codigo_idx y inv_articulos_articulo_codigo_idx existían; los de order/sale/purchase_items no existían pero IF EXISTS los cubre sin error)
- 5 x ALTER TABLE DROP COLUMN IF EXISTS articulo_codigo
- DO block final: valida count = 0, emite RAISE NOTICE 'Deploy 3 (contract) OK'

**\_journal.json:** Entry idx=11 tag "0011_phase31_contract" agregada.

**schema.ts:** Las 5 hijas (order_items, sale_items, purchase_items, existencias, inventarios_articulos) ya no declaran articuloCodigo. existencias.articuloCodigo_idx eliminado. existencias PK = [articuloSku, depositoId]. inventariosArticulos uniqueIndex = [inventarioId, articuloSku].

**Backend simplificado:**

- `existencias.service.ts`: upsert usa dto.articuloSku directo (sin resolveSku). findMatrix, getLowStockAggregated, getLowStockCount, findByDeposito limpios de articuloCodigo.
- `inventarios.service.ts`: addArticulo usa dto.articuloSku directo (sin resolveSku). getArticulosWithDiscrepancy limpiado.
- `CreateExistenciaDto`: campo articuloCodigo → articuloSku.
- `CreateInventarioArticuloDto`: campo articuloCodigo → articuloSku.
- `dashboard.service.ts`: interface local LowStockItem quita articuloCodigo.
- `seed.ts`: 5 inserts en hijas solo pasan articuloSku.
- `ArticulosHelper` sigue inyectado en constructores (pass-through Phase 32).

**Tests:** articulos-helper.spec.ts 5 tests verdes (4 originales + 1 smoke post-Deploy-3 que verifica que upsert NO invoca resolveSku).

### Task 2: Frontend types + componentes

**6 tipos actualizados:**

- types/order.ts `OrderItem`: quita articuloCodigo
- types/sale.ts `SaleItem`: quita articuloCodigo
- types/purchase.ts `PurchaseItem`: quita articuloCodigo
- types/existencia.ts `Existencia`: quita articuloCodigo; `ExistenciaMatrixRow`: articuloCodigo → articuloSku
- types/inventario.ts `InventarioArticulo`: quita articuloCodigo
- types/dashboard.ts `LowStockItem`: quita articuloCodigo

**Componentes actualizados:**

- `existencias-columns.tsx`: accessorKey articuloCodigo → articuloSku, header "SKU", `OnStockUpdate` firma: articuloSku
- `existencias-por-articulo.tsx`: key/render/onStockUpdate usan articuloSku, header "SKU"
- `existencias-por-deposito.tsx`: onStockUpdate pasa articuloSku
- `existencias-client.tsx`: handleMatrixStockUpdate y handleStockUpdate usan articuloSku
- `conteo-table.tsx`: existingCodigos usa articuloSku, display articuloSku, alert dialog
- `low-stock-alerts.tsx`: key y display usan articuloSku
- `articulo-search.tsx` (inventarios): addInventarioArticulo payload articuloSku + null guard en handleSelect
- `articulo-sheet.tsx`: key de existencias usa articuloSku
- `api.client.ts`: addInventarioArticulo payload articuloCodigo → articuloSku

### Task 3: Migration aplicada + rebuild Docker

**Migration aplicada:**

```
cat apps/backend/drizzle/0011_phase31_contract.sql | docker exec -i postgres psql --single-transaction --set ON_ERROR_STOP=1 -U sanchez -d erp_sanchez
```

Output: NOTICE: Deploy 3 (contract) OK: articulo_codigo eliminado de las 5 hijas

**Drizzle migrations table registrada:** INSERT 0 1, verificado con count=1.

**Validation gate:**

```
docker exec postgres psql -tAc "SELECT count(*) FROM information_schema.columns WHERE column_name='articulo_codigo' AND table_name IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos')"
→ 0
```

**scripts/phase31-validation.sh all:**

```
✓ integrity: PASSED (0 orphans en 5 tablas)
✓ pk-swap: sku (PK correcto post-Deploy-2)
✓ triggers: O (habilitado)
✓ unidades-sync: 0 desincronizados
✓ ALL CHECKS PASSED — Phase 31 gate OK
```

**Docker rebuilt:** erp-backend y erp-web rebuildados y up sin errores.

## Commits

| Hash     | Mensaje                                                                         |
| -------- | ------------------------------------------------------------------------------- |
| 85d40934 | feat(31-04): migration 0011 + schema.ts contract cleanup + backend simplificado |
| dd080272 | feat(31-04): frontend types cleanup + componentes refactorizados a articuloSku  |

## Breaking changes para clientes externos (T-31-21 mitigation)

| DTO                           | Path                                  | Campo cambiado | Antes                    | Despues               |
| ----------------------------- | ------------------------------------- | -------------- | ------------------------ | --------------------- |
| `CreateExistenciaDto`         | POST `/api/existencias`               | body field     | `articuloCodigo: string` | `articuloSku: string` |
| `CreateInventarioArticuloDto` | POST `/api/inventarios/:id/articulos` | body field     | `articuloCodigo: string` | `articuloSku: string` |

Los clientes externos que posteen a estos endpoints deben actualizar el field del body. El window de notificacion fue el deploy del backend nuevo (step 3 del operador) antes de aplicar la migration.

Los endpoints GET y PATCH que toman `:articuloCodigo` como path param (por ejemplo `PATCH /api/existencias/:articuloCodigo/:depositoId`) se mantienen y ahora aceptan tanto `articulos.codigo` como `articulos.sku` (OR query — backward compat).

## Deviaciones del plan

### Auto-fixed Issues

**1. [Regla 1 - Bug] findByArticulo y update del backend aceptan codigo OR sku**

- **Encontrado durante:** Task 2 — al actualizar existencias-client.tsx a articuloSku
- **Problema:** El handler de stock update (handleStockUpdate) recibe articuloSku desde los componentes actualizados, pero el endpoint PATCH usaba `WHERE articulos.codigo = articuloCodigo` exclusivamente. Con el cambio del frontend, pasaba articuloSku como path param, rompiendo la resolución.
- **Fix:** `existencias.service.ts` métodos `findByArticulo` y `update` cambiados a `OR(eq(articulos.codigo, param), eq(articulos.sku, param))` para aceptar ambos. Typecheck pasa.
- **Archivos:** apps/backend/src/modules/existencias/existencias.service.ts
- **Commit:** dd080272 (incluido en Task 2 commit)

**2. [Regla 2 - Missing] Null guard en articulo-search.tsx handleSelect**

- **Encontrado durante:** Task 2 typecheck
- **Problema:** `articulo.sku` es `string | null` en el tipo `Articulo`. Al cambiar de `articuloCodigo: articulo.codigo` a `articuloSku: articulo.sku`, TypeScript reportó error TS2322.
- **Fix:** Guard `if (!articulo.sku) return` antes de llamar addInventarioArticulo.
- **Archivos:** apps/web/src/components/inventarios/articulo-search.tsx
- **Commit:** dd080272

**3. [Regla 1 - Limpieza] dashboard.service.ts interface LowStockItem desactualizada**

- **Encontrado durante:** Task 1 — getLowStockAggregated ya no retorna articuloCodigo
- **Fix:** interface local LowStockItem en dashboard.service.ts actualizada para quitar articuloCodigo
- **Archivos:** apps/backend/src/modules/dashboard/dashboard.service.ts
- **Commit:** 85d40934

## pg_dump paths

| Descripcion  | Path                                                                     |
| ------------ | ------------------------------------------------------------------------ |
| Pre-Deploy-1 | /var/backups/erp*sanchez/phase31/pre_deploy1*\*.dump                     |
| Pre-Deploy-2 | /var/backups/erp_sanchez/phase31/pre_deploy2_20260519_025855.dump        |
| Pre-Deploy-3 | /var/backups/erp_sanchez/phase31/pre_deploy3_20260519_032728.dump (15MB) |

## Criterios de exito verificados

- [x] Migration 0011 aplicada exit 0 (NOTICE final confirmado)
- [x] Las 5 hijas NO tienen columna articulo_codigo (count = 0)
- [x] existencias PK = [articulo_sku, deposito_id]
- [x] inventarios_articulos UNIQUE = [inventario_id, articulo_sku]
- [x] Backend: DTOs renombrados, services usan articuloSku (sin resolveSku en upsert/addArticulo)
- [x] Frontend: types actualizados, componentes consumen articuloSku
- [x] scripts/phase31-validation.sh all exit 0 (4 checks OK)
- [x] Backend + web docker rebuilt OK
- [x] pnpm --filter backend type-check exit 0
- [x] pnpm --filter web type-check exit 0
- [x] pnpm --filter web build exit 0
- [x] articulos-helper.spec.ts 5 tests verdes

## Self-Check: PASSED

- [x] apps/backend/drizzle/0011_phase31_contract.sql existe
- [x] \_journal.json tiene idx=11 tag 0011_phase31_contract
- [x] schema.ts sin articuloCodigo en las 5 hijas
- [x] Commits 85d40934 y dd080272 existen en git log
- [x] count articulo_codigo en 5 hijas = 0 (verificado via psql)
- [x] phase31-validation.sh all exit 0
