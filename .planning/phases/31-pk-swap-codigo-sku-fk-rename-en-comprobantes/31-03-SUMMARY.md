---
phase: 31
plan: 03
subsystem: database-schema / backend-api / frontend
tags:
  - pk-swap
  - migration
  - sku
  - rekey
  - deploy2
dependency_graph:
  requires:
    - 31-02
  provides:
    - articulos.sku como PRIMARY KEY estable
    - 5 FKs hijas apuntando a articulos.sku
    - Backend API rekey-eado a :sku
    - Frontend rekey-eado a [sku]
    - Notice webhooks payload v2
  affects:
    - 31-04 (Deploy 3 — puede quitar columnas articulo_codigo de hijas)
tech_stack:
  added: []
  patterns:
    - 9-step ordered transaction con LOCK ACCESS EXCLUSIVE
    - DISABLE/recompute/ENABLE trigger pattern (P-02)
    - CREATE OR REPLACE FUNCTION (D-14, same trigger name)
key_files:
  created:
    - apps/backend/drizzle/0010_phase31_switch.sql
  modified:
    - apps/backend/drizzle/meta/_journal.json
    - apps/backend/src/db/schema.ts
    - apps/backend/src/db/seed.ts
    - apps/backend/src/modules/articulos/articulos.controller.ts
    - apps/backend/src/modules/articulos/articulos.service.ts
    - apps/backend/src/modules/articulos/articulos-imagenes.controller.ts
    - apps/backend/src/modules/articulos/articulos-imagenes.service.ts
    - apps/backend/src/modules/existencias/existencias.service.ts
    - apps/backend/src/modules/inventarios/inventarios.service.ts
    - apps/backend/src/modules/dashboard/dashboard.service.ts
    - apps/backend/test/articulos-phase31.e2e-spec.ts
    - apps/web/src/app/(dashboard)/articulos/[sku]/editar/page.tsx
    - apps/web/src/app/(dashboard)/articulos/articulos-client.tsx
    - apps/web/src/components/articulos/articulo-sheet.tsx
    - apps/web/src/components/articulos/imagen-slot.tsx
    - apps/web/src/components/articulos/imagen-slot-grid.tsx
    - apps/web/src/lib/api.client.ts
    - apps/web/src/types/order.ts
    - apps/web/src/types/sale.ts
    - apps/web/src/types/purchase.ts
    - apps/web/src/types/existencia.ts
    - apps/web/src/types/inventario.ts
    - apps/web/src/types/dashboard.ts
    - apps/web/src/components/settings/webhooks/webhooks-client.tsx
    - scripts/phase31-validation.sh
decisions:
  - 'D-14: CREATE OR REPLACE FUNCTION mantiene mismo nombre trg — no DROP TRIGGER'
  - 'D-15: WHEN clause del trigger sin cambios (AFTER INSERT OR UPDATE OF cantidad OR DELETE)'
  - 'Existencias path /api/existencias/articulo/:articuloCodigo se mantiene como agrupador'
  - 'articuloCodigo coexiste en hijas hasta Deploy 3 (no DROP columna en esta wave)'
metrics:
  duration: '78 minutes'
  completed_date: '2026-05-19'
  tasks_completed: 4
  files_changed: 25
---

# Phase 31 Plan 03: Deploy 2 (switch) — PK swap codigo→sku + rekey API + rekey frontend

## One-liner

PK swap atomico de `articulos.codigo` a `articulos.sku` via 9-step LOCK EXCLUSIVE transaction, rebuild 5 FKs hijas, reescritura del trigger, rekey completo del backend (`/api/articulos/:sku`) y frontend (`/articulos/[sku]/editar`), con notice de payload v2 en webhooks.

## What was built

### Migration 0010 (9-step ordered transaction)

Archivo: `apps/backend/drizzle/0010_phase31_switch.sql`

Siguiendo PITFALLS P-01 literalmente:

1. **STEP 1**: LOCK TABLE en 6 tablas (articulos + 5 hijas) IN ACCESS EXCLUSIVE MODE
2. **STEP 2**: DO block pre-check — 6 sub-checks (sku NOT NULL, no dupes, 5 hijas backfilled)
3. **STEP 3**: DISABLE TRIGGER trg_update_articulo_unidades
4. **STEP 4**: DROP articulos_pkey CASCADE → SET sku NOT NULL → ADD PRIMARY KEY(sku) → DROP NOT NULL codigo → DROP INDEX articulos_sku_idx → CREATE INDEX articulos_codigo_idx
5. **STEP 5.1-5.4**: Rebuild 5 FKs hijas: existencias PK nueva (articuloSku, depositoId), inv_articulos unique idx sobre (inventarioId, articuloSku), NOT NULL en order/sale/purchase_items, ADD CONSTRAINT ×5 REFERENCES articulos(sku)
6. **STEP 6**: CREATE OR REPLACE FUNCTION update_articulo_unidades() con cuerpo nuevo keyeando por articulo_sku/sku (D-14: mismo nombre)
7. **STEP 7**: UPDATE articulos SET unidades = SUM(existencias WHERE articulo_sku=sku) — recompute O(n) (101.021 filas)
8. **STEP 8**: ENABLE TRIGGER
9. **STEP 9**: DO block validacion final — assert PK=1, FKs=5, trigger enabled=O. RAISE NOTICE 'Deploy 2 (switch) OK'

**Resultado de aplicacion:**

```
NOTICE:  drop cascades to 5 other objects
...
UPDATE 101021
...
NOTICE:  Deploy 2 (switch) OK: PK=sku, 5 FKs activas, trigger ENABLED, articulos.unidades recomputed
```

### Schema.ts (atomic con migration)

- `articulos`: `codigo` sin `.primaryKey()` (nullable), `sku` con `.notNull()`, `primaryKey({ columns: [table.sku] })`, `articulos_codigo_idx` (no unique), `articulos_sku_idx` eliminado
- 5 hijas: `articuloSku.notNull().references(() => articulos.sku, { onDelete: 'restrict', onUpdate: 'cascade' })`. `articuloCodigo` se mantiene sin FK (fue dropped por CASCADE)
- `existencias`: PK compuesta `[articuloSku, depositoId]`
- `inventariosArticulos`: `uniqueIndex('inv_articulos_unique_idx').on(inventarioId, articuloSku)`

### Backend rekey

- `articulos.controller.ts`: `@Get('by-codigo/:codigo')` declarado ANTES de `@Get(':sku')` (T-31-15). 5 rutas rekey-eadas. Guards preservados (T-31-14).
- `articulos.service.ts`: `findOne(sku)`, `findByCodigo(codigo)` (nuevo), `update/toggleActive/softDelete` por sku.
- `articulos-imagenes.controller.ts` + `service.ts`: 3 rutas y lógica rekey a `:sku`.
- `existencias.service.ts`: JOINs via `articuloSku→articulos.sku`. upsert target `[articuloSku, depositoId]`. `findByArticulo` hace JOIN a través de `articulos.codigo` (agrupador). `update` resuelve sku via lookup.
- `inventarios.service.ts`: `getArticulosWithDiscrepancy` JOIN por `articuloSku`.
- `dashboard.service.ts`: `LowStockItem` agrega `articuloSku` al lado de `articuloCodigo`.

### Frontend rekey

- Directorio renombrado: `articulos/[codigo]/editar/` → `articulos/[sku]/editar/`
- `page.tsx`: `useParams<{sku}>`, `fetchArticuloBySkuClient(sku)`, `deleteArticulo/toggleArticuloActivo` por sku, `ImagenSlotGrid` prop `articuloSku`
- `articulos-client.tsx`: `handleEdit` navega a `/articulos/${sku}/editar`
- `articulo-sheet.tsx`: link Editar usa `encodeURIComponent(articulo.sku!)`. `fetchExistenciasByArticuloClient(articulo.codigo)` se mantiene (by-codigo agrupador)
- `imagen-slot.tsx` + `imagen-slot-grid.tsx`: prop `articuloCodigo` → `articuloSku`
- `api.client.ts`: `fetchArticuloByCodigoClient` → `fetchArticuloBySkuClient`. 5 funciones rekey-eadas. Nueva `fetchArticulosByCodigoClient(codigo)` → `/api/articulos/by-codigo/:codigo`
- Types `order/sale/purchase/existencia/inventario/dashboard`: `articuloSku: string` agregado al lado de `articuloCodigo` (coexistencia hasta Deploy 3)

### Notice Webhooks

`webhooks-client.tsx`: `<Alert>` con texto literal es-AR visible antes del listado:

> "Los eventos articulo.created, articulo.updated y articulo.deleted ahora incluyen el campo sku..."

### E2E Tests

`apps/backend/test/articulos-phase31.e2e-spec.ts`: 3 tests `it()` (sin `.skip`):

- SC#3a: GET /api/articulos/:sku → 200, body.sku === 'TEST31_001'
- SC#3b: GET /api/articulos/by-codigo/TEST31-001 → 200, Array con body[0].sku === 'TEST31_001'
- SC#4: POST + wait 2s → webhook_deliveries payload.articulo.sku no-null

## Validation output

```
Phase 31 — Validacion completa (all checks)
============================================================
--- integrity: FK orphan checks ---
  ✓ order_items orphans: 0
  ✓ sale_items orphans: 0
  ✓ purchase_items orphans: 0
  ✓ existencias orphans: 0
  ✓ inventarios_articulos orphans: 0
  ✓ integrity: PASSED (0 orphans en 5 tablas)

--- pk-swap: PK column de articulos ---
  ✓ pk-swap: sku (PK correcto post-Deploy-2)

--- triggers: trg_update_articulo_unidades ---
  ✓ triggers: O (habilitado)

--- unidades-sync: articulos.unidades vs existencias ---
  ✓ unidades-sync: 0 desincronizados

============================================================
✓ ALL CHECKS PASSED — Phase 31 gate OK
============================================================
```

## Commits atómicos

| Hash     | Mensaje                                                             |
| -------- | ------------------------------------------------------------------- |
| 24a4b47d | feat(31-03): migration 0010 + schema sku PK + E2E tests unskipped   |
| 2dec11a8 | fix(31-03): corregir query pk-swap en phase31-validation.sh         |
| 2c299177 | feat(31-03): backend rekey controllers + services a :sku (Deploy 2) |
| b6d22e12 | feat(31-03): frontend rekey codigo→sku + types + Alert webhooks v2  |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix query pk-swap en phase31-validation.sh**

- **Found during:** Task 2 (post-migration validation)
- **Issue:** La query en `check_pk_swap()` hacía un cross-join entre `pg_attribute` y `pg_constraint` sin la condición `AND a.attrelid = c.conrelid`, retornando miles de filas concatenadas en lugar de 'sku'.
- **Fix:** Agregada la condición faltante al JOIN.
- **Files modified:** `scripts/phase31-validation.sh`
- **Commit:** 2dec11a8

**2. [Rule 1 - Bug] seed.ts: articuloSku/sku null incompatible con schema NOT NULL**

- **Found during:** Task 1 typecheck del backend
- **Issue:** El seed generaba `articuloSku: null` y `sku: null` que eran aceptados por el schema anterior pero ahora son incompatibles con las columnas NOT NULL declaradas en schema.ts post-Deploy 2.
- **Fix:** Importado `codigoToSku` en seed.ts; todos los `?? null` reemplazados por `?? codigoToSku(codigo)`.
- **Files modified:** `apps/backend/src/db/seed.ts`
- **Commit:** 24a4b47d (incluido en el commit atómico de Task 1)

**3. [Rule 2 - Missing critical functionality] existencias.service.ts update() resuelve sku via lookup**

- **Found during:** Task 2a implementación
- **Issue:** El método `update(articuloCodigo, depositoId, dto)` hacía WHERE por `articuloCodigo` pero la PK ahora es `(articuloSku, depositoId)`. El WHERE hubiese silenciosamente fallado (0 rows updated).
- **Fix:** El método ahora hace lookup de `articulos.sku` via `WHERE articulos.codigo = articuloCodigo` antes de la UPDATE.
- **Files modified:** `apps/backend/src/modules/existencias/existencias.service.ts`
- **Commit:** 2c299177

**4. [Rule 3 - Blocking] artifacts .next/types/ de build anterior**

- **Found during:** Task 2b typecheck web
- **Issue:** `.next/types/app/(dashboard)/articulos/[codigo]/editar/page.ts` referencian la ruta eliminada causando error TS2307.
- **Fix:** `rm -rf apps/web/.next/types/app/(dashboard)/articulos/[codigo]/`
- **Commit:** No requirió commit (archivo generado).

## Pending Actions para el operador

Esta task incluye un `type="checkpoint:human-action"` (Task 4 del plan). El executor aplicó la migration y reconstruyó los containers. Las siguientes acciones HUMANAS quedan pendientes antes de ejecutar Plan 31-04:

1. **E2E tests contra prod:** `cd apps/backend && pnpm test -- articulos-phase31.e2e-spec.ts` — los 3 tests deben pasar (requieren `TEST_ADMIN_JWT` en env)
2. **Frontend smoke:** Visitar https://erp.sanchezrepuestos.com.ar/articulos → click artículo → verificar URL navega a `/articulos/{sku}/editar`
3. **Alert visible:** Visitar `/settings/webhooks` → verificar Alert con texto "Cambio en el payload de articulo.\* desde v1.3"
4. **Webhook payload v2:** Crear webhook test → POST articulo → verificar `payload.articulo.sku` no-null
5. **Registrar migration en drizzle.\_\_drizzle_migrations:** Ya ejecutado por el executor (INSERT confirmado)
6. **24-48h soak:** Monitorear SC#5 queries, error rate, 404s antes de gatear Plan 31-04

## Known Stubs

Ninguno — todos los datos relevantes están cableados.

## Threat Flags

Ninguno adicional a los documentados en el threat_model del plan.

## Self-Check: PASSED

- [x] `apps/backend/drizzle/0010_phase31_switch.sql` existe
- [x] `apps/backend/drizzle/meta/_journal.json` tiene entry idx=10 tag "0010_phase31_switch"
- [x] `apps/backend/src/db/schema.ts` tiene `primaryKey({ columns: [table.sku] })` en articulos
- [x] `grep -c '"articulos_sku_idx"' apps/backend/src/db/schema.ts == 0` (eliminado)
- [x] `grep -c '"articulos_codigo_idx"' apps/backend/src/db/schema.ts == 1` (agregado)
- [x] `apps/web/src/app/(dashboard)/articulos/[sku]/editar/page.tsx` existe
- [x] Directorio `[codigo]` eliminado
- [x] `apps/web/src/lib/api.client.ts` tiene `fetchArticulosByCodigoClient`
- [x] `apps/web/src/components/settings/webhooks/webhooks-client.tsx` tiene "Cambio en el payload de articulo"
- [x] Migration aplicada con RAISE NOTICE 'Deploy 2 (switch) OK'
- [x] `scripts/phase31-validation.sh all` exit 0 (4 checks)
- [x] `docker compose up -d erp-backend erp-web` running sin errores
- [x] Backend logs: rutas `/api/articulos/by-codigo/:codigo` y `/api/articulos/:sku` declaradas en orden correcto
- [x] `pnpm --filter backend type-check` exit 0
- [x] `pnpm --filter web type-check` exit 0
