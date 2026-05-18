# Phase 31: PK Swap codigo→sku + FK rename en comprobantes - Research

**Researched:** 2026-05-18
**Domain:** PostgreSQL primary key swap on live table (101.021 filas, 5 hijas con FK) + Drizzle migration custom + webhook payload v2 + NestJS/Next.js rekey
**Confidence:** HIGH (todas las decisiones críticas verificadas contra el código actual y PITFALLS.md)

---

## Summary

Phase 31 promueve `articulos.sku` a PK desde el día siguiente al cutover y renombra la FK `articulo_codigo` a `articulo_sku` en las 5 tablas hijas (`order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`). Adicionalmente reescribe el trigger `trg_update_articulo_unidades` para keyear por `articulo_sku`/`articulos.sku`, bumpea el webhook payload a v2 agregando el campo `sku` al objeto `articulo` y rekeyea API + frontend de `:codigo` a `:sku`. La cutover se hace en 3 migrations atómicas separadas por 24-48h (expand → switch → contract) con pg_dump full pre-cutover, audit informativo previo, gate de integridad referencial entre deploys y soak en producción.

**Primary recommendation (resuelve la duda abierta de CONTEXT.md):**

1. **Overwrite `articulos.sku := stripSep(codigo)` ocurre en Deploy 1 (expand), NO en Deploy 2.** Razón: desacopla el cambio de datos del cambio de schema (lección 260502-tqf), permite ejecutar las 5 queries SC#5 contra `articulos.sku` ya estable durante 24-48h antes del PK swap, y elimina el escenario `articulos.sku IS NULL` durante el backfill de las hijas.
2. **3 migrations Drizzle custom** numeradas `0009_phase31_expand.sql`, `0010_phase31_switch.sql`, `0011_phase31_contract.sql`. Cada una commitea schema.ts + migration.sql + `_journal.json` en un solo cambio atómico (lección `feedback_schema_drift_silencioso.md`).
3. **El 7-step ordered transaction de P-01** se ejecuta en Deploy 2 ya con `articulos.sku` y `<hija>.articulo_sku` completamente backfilled — esto vuelve el `LOCK ACCESS EXCLUSIVE` significativamente más corto.

---

## User Constraints (from CONTEXT.md)

### Locked Decisions

**Preflight & safety net:**

- **D-01:** Auditoría preflight informativa pero non-blocking. Script SQL con counts (`null_sku`, `sku_eq_codigo`, `sku_diff_codigo`, `sku_dupes`). Output en `31-PREFLIGHT-AUDIT.md`. NO bloquea cutover.
- **D-02:** Overwrite ciego de `articulos.sku := stripSep(codigo)` para las 101.021 filas. Cualquier valor preexistente se considera ruido sin valor de negocio.
- **D-03:** `codigo_barras UNIQUE WHERE NOT NULL` queda fuera de Phase 31 (es prerequisito de Phase 32).
- **D-04:** `pg_dump full` automatizado pre-cutover en Deploy 2 (y opcionalmente Deploy 3).

**Cutover orchestration:**

- **D-05:** 3 deploys expand → switch → contract.
- **D-06:** Backend doble-escribe en código aplicación (Deploy 1 → Deploy 2), centralizado en un helper.
- **D-07:** Gate entre deploys: 5 queries de integridad referencial SC#5 deben retornar 0, plus 24-48h soak.
- **D-08:** Rekey total de API + frontend a `:sku` en Deploy 2. Sin alias de compat. URLs viejas mueren.

**Webhook payload v2:**

- **D-09:** Payload v2 = mismo envelope + campo `sku` agregado a `articulo`. Sin header version, sin campo version.
- **D-10:** Notice doc-only en `/settings/webhooks` admin (no delivery, no email).
- **D-11:** Payload v2 sale junto al PK swap en Deploy 2.
- **D-12:** Deliveries pendientes en `webhook_deliveries.payload` NO se modifican retroactivamente.

**Trigger `trg_update_articulo_unidades`:**

- **D-13:** DISABLE TRIGGER + recompute manual + ENABLE dentro de la transacción de Deploy 2.
- **D-14:** Mismo nombre de trigger y función (`CREATE OR REPLACE FUNCTION`).
- **D-15:** WHEN clause se mantiene en `AFTER INSERT OR UPDATE OF cantidad OR DELETE`.
- **D-16:** Sin guard `pg_trigger_depth() > 1` ni session GUC. Solo capa 1 (DISABLE/ENABLE).

### Claude's Discretion

1. Naming exacto del script de auditoría preflight (path, lenguaje, integración).
2. Calendario concreto del 24-48h soak (qué horario, métricas, abort criteria).
3. Path exacto y formato del pg_dump full (gzip vs sin compresión, ubicación).
4. Si el overwrite `articulos.sku := stripSep(codigo)` va en Deploy 1 o Deploy 2.
5. Forma exacta del 7-step ordered transaction (SQL Drizzle custom).
6. Naming exacto y contrato JSON de `findByCodigo` (paginación, response shape).
7. Forma exacta del notice en `/settings/webhooks` (Alert, Banner, párrafo).

### Deferred Ideas (OUT OF SCOPE)

- `codigo_barras UNIQUE WHERE NOT NULL` → Phase 32.
- Guard `pg_trigger_depth() > 1` en trigger → Phase 33.
- Session GUC `gsd.skip_unidades_trigger` → Phase 33.
- Cascade engine + history append-only → Phase 33.
- WHEN clause con `UPDATE OF articulo_sku` → Phase 33.
- Drift TS↔DB de índices/precision → Phase 37.
- Alias temporal `/api/articulos/:codigo` → descartado en D-08.
- Notice automático a suscriptores → descartado en D-10.
- Sentinel `ubicacion=0` + migración histórica de existencias → Phase 36.

---

## Phase Requirements

| ID     | Description                                                                                                                | Research Support                                                                                                                                                                                                                                                                                           |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VAR-10 | Comprobantes (orders, sales, purchases, existencias, inventarios_articulos) referencian `sku` como identificador universal | Deploy 2 introduce columna `articulo_sku` como FK en las 5 hijas; Deploy 3 elimina `articulo_codigo` legacy. Helper backend doble-escribe ambas durante coexistencia. Plan complete entre Wave 0 (preflight + safety net), Wave 1 (Deploy 1 expand), Wave 2 (Deploy 2 switch), Wave 3 (Deploy 3 contract). |

---

## Architectural Responsibility Map

| Capability                                                         | Primary Tier                    | Secondary Tier | Rationale                                                                             |
| ------------------------------------------------------------------ | ------------------------------- | -------------- | ------------------------------------------------------------------------------------- |
| PK swap + FK rename en 5 hijas                                     | Database / Storage              | —              | DDL puro; no aplica a otros tiers                                                     |
| Backfill `articulo_sku` desde JOIN articulos                       | Database / Storage              | —              | SQL UPDATE FROM, no lógica de aplicación                                              |
| Backend doble-escribe ambos campos                                 | API / Backend                   | —              | Centralizado en `articulos.service` helper, inyectado en 5 servicios consumidores     |
| API rekey `/api/articulos/:codigo` → `:sku` + nuevo `findByCodigo` | API / Backend                   | —              | NestJS Controller + Service; afecta a frontend                                        |
| Frontend rekey `[codigo]` → `[sku]`                                | Frontend Server (SSR) + Browser | API / Backend  | Next.js dynamic route rename + client component updates                               |
| Webhook payload v2 enrichment                                      | API / Backend                   | —              | Enrichment en `articulos.service` antes del `emit()` (más cercano al origen del dato) |
| Notice en `/settings/webhooks`                                     | Browser / Client                | —              | Componente Alert estático; no requiere API call                                       |
| Trigger `update_articulo_unidades` rewrite                         | Database / Storage              | —              | PL/pgSQL function body change                                                         |
| Preflight audit                                                    | Database / Storage              | DevOps         | Script SQL ejecutado por humano operador antes del cutover                            |
| pg_dump full safety net                                            | DevOps / Database               | —              | Bash script invocando `pg_dump` contra producción                                     |

---

## Implementation Approach

### Deploy 1 (expand) — 0009_phase31_expand.sql

**Scope:**

- Overwrite `articulos.sku := stripSep(codigo)` para las 101.021 filas (decisión cerrada via Discretion #4 = Deploy 1, ver §"Open Decisions Closed By Research").
- Agregar columna `articulo_sku TEXT` nullable en las 5 hijas (`order_items`, `sale_items`, `purchase_items`, `existencias`, `inventarios_articulos`).
- Backfill `<hija>.articulo_sku := articulos.sku` vía JOIN.
- Validación post-backfill: 5 queries que retornen 0 huérfanos.
- **NO** crea FKs hacia `articulos.sku` (PK sigue siendo `codigo`).
- **NO** toca trigger ni payload de webhooks.
- Backend deploy: el helper `articulos.service.deriveSku()` empieza a doble-escribir en cada INSERT/UPDATE en las 5 tablas hijas.

**Razón del orden (overwrite antes del backfill):**
Si el backfill corriera primero, copiaría a las hijas un `articulos.sku` que en muchas filas es NULL o stale (P-05 dice que el current sku es ruido). Después el overwrite cambiaría `articulos.sku` y dejaría las hijas desincronizadas. Haciendo overwrite primero, el backfill copia el sku ya canónico.

**SQL completo:**

```sql
-- Migration 0009: Phase 31 Deploy 1 (expand) — overwrite sku + agregar articulo_sku en 5 hijas
-- Origen: Phase 31 (PK Swap codigo→sku), D-01..D-08 lockeadas en 31-CONTEXT.md
-- Apply: psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0009_phase31_expand.sql
-- Backend MUST be deployed BEFORE this migration runs in prod (helper doble-escribe).
-- Pre-flight: 31-PREFLIGHT-AUDIT.md generado (informativo, non-blocking).
-- Pre-flight: pg_dump full safety net en ubicación acordada.

-- ─── 1. OVERWRITE articulos.sku := stripSep(codigo) ──────────────────────────
-- stripSep regex es `[-_.\s]+` reemplazado por '' (Phase 29 D-12, mismo que packages/utils).
UPDATE articulos
SET sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g'),
    updated_at = now()
WHERE sku IS DISTINCT FROM regexp_replace(codigo, '[-_.[:space:]]+', '', 'g');

DO $$
DECLARE v_null int; v_dupes int;
BEGIN
  SELECT count(*) INTO v_null FROM articulos WHERE sku IS NULL;
  IF v_null > 0 THEN RAISE EXCEPTION 'Post-overwrite: % filas con sku NULL', v_null; END IF;
  SELECT count(*) - count(DISTINCT sku) INTO v_dupes FROM articulos;
  IF v_dupes > 0 THEN
    RAISE WARNING 'Post-overwrite: % duplicados en articulos.sku — el PK swap de Deploy 2 va a fallar', v_dupes;
  END IF;
END $$;

-- ─── 2. AGREGAR articulo_sku TEXT nullable en las 5 hijas ────────────────────
ALTER TABLE order_items            ADD COLUMN IF NOT EXISTS articulo_sku text;
ALTER TABLE sale_items             ADD COLUMN IF NOT EXISTS articulo_sku text;
ALTER TABLE purchase_items         ADD COLUMN IF NOT EXISTS articulo_sku text;
ALTER TABLE existencias            ADD COLUMN IF NOT EXISTS articulo_sku text;
ALTER TABLE inventarios_articulos  ADD COLUMN IF NOT EXISTS articulo_sku text;

-- ─── 3. BACKFILL <hija>.articulo_sku := articulos.sku via JOIN ───────────────
UPDATE order_items            oi  SET articulo_sku = a.sku FROM articulos a WHERE oi.articulo_codigo = a.codigo AND oi.articulo_sku IS NULL;
UPDATE sale_items             si  SET articulo_sku = a.sku FROM articulos a WHERE si.articulo_codigo = a.codigo AND si.articulo_sku IS NULL;
UPDATE purchase_items         pi  SET articulo_sku = a.sku FROM articulos a WHERE pi.articulo_codigo = a.codigo AND pi.articulo_sku IS NULL;
UPDATE existencias            e   SET articulo_sku = a.sku FROM articulos a WHERE e.articulo_codigo  = a.codigo AND e.articulo_sku  IS NULL;
UPDATE inventarios_articulos  ia  SET articulo_sku = a.sku FROM articulos a WHERE ia.articulo_codigo = a.codigo AND ia.articulo_sku IS NULL;

-- ─── 4. ÍNDICES en articulo_sku (mismo nombre que el _codigo_idx pero sufijo _sku) ──
CREATE INDEX IF NOT EXISTS order_items_articulo_sku_idx           ON order_items(articulo_sku);
CREATE INDEX IF NOT EXISTS sale_items_articulo_sku_idx            ON sale_items(articulo_sku);
CREATE INDEX IF NOT EXISTS purchase_items_articulo_sku_idx        ON purchase_items(articulo_sku);
CREATE INDEX IF NOT EXISTS existencias_articulo_sku_idx           ON existencias(articulo_sku);
CREATE INDEX IF NOT EXISTS inv_articulos_articulo_sku_idx         ON inventarios_articulos(articulo_sku);

-- ─── 5. VALIDACIONES POST-BACKFILL (estilo P-01 DO block) ────────────────────
DO $$
DECLARE v_count int; v_table text;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY['order_items','sale_items','purchase_items','existencias','inventarios_articulos']) LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE articulo_sku IS NULL', v_table) INTO v_count;
    IF v_count > 0 THEN RAISE EXCEPTION 'Backfill incompleto en %: % filas con articulo_sku NULL', v_table, v_count; END IF;
  END LOOP;
  RAISE NOTICE 'Backfill OK: 5 hijas con articulo_sku 100%% poblado';
END $$;
```

**Backend changes en Deploy 1 (debe deployearse ANTES de aplicar la migration):**

Nuevo helper en `apps/backend/src/modules/articulos/articulos-helper.ts`:

```typescript
// Centraliza la derivación sku desde codigo durante la coexistencia (Deploy 1 → Deploy 2).
// Una sola fuente de verdad para evitar drift entre rutas que escriben en las 5 hijas.
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db'
import { articulos } from '../../db/schema'

@Injectable()
export class ArticulosHelper {
  constructor(private readonly drizzle: DrizzleService) {}

  /**
   * Resuelve articulo_codigo → { articuloCodigo, articuloSku } para escritura doble.
   * Mientras la PK sea codigo, este helper hace 1 query a articulos para obtener sku.
   * Post-Deploy-2, este helper sigue funcionando (sku ya es PK), pero el caller
   * puede usar directamente articulo_sku como param.
   * NUNCA debe inferir sku como stripSep(codigo) en runtime — siempre leer de articulos
   *   porque post-Deploy-2 podrían crearse variantes donde sku != stripSep(codigo).
   */
  async resolveSku(articuloCodigo: string): Promise<string> {
    const [row] = await this.drizzle.db
      .select({ sku: articulos.sku })
      .from(articulos)
      .where(eq(articulos.codigo, articuloCodigo))
      .limit(1)
    if (!row?.sku) {
      throw new NotFoundException(`Articulo ${articuloCodigo} no tiene sku asignado`)
    }
    return row.sku
  }

  /** Conveniencia: devuelve par {articuloCodigo, articuloSku} para spread en .values() */
  async toRefPair(
    articuloCodigo: string
  ): Promise<{ articuloCodigo: string; articuloSku: string }> {
    const articuloSku = await this.resolveSku(articuloCodigo)
    return { articuloCodigo, articuloSku }
  }
}
```

**Sitios que el helper inyecta (5 servicios + 1 controller):**

- `apps/backend/src/modules/existencias/existencias.service.ts` — `upsert()` línea 209-228 y `update()` línea 233 (escriben directamente articulo_codigo; agregar articulo_sku).
- `apps/backend/src/modules/inventarios/inventarios.service.ts` — `addArticulo()` línea 244-258 (escribe articulo_codigo en inventarios_articulos).
- `apps/backend/src/db/seed.ts` línea 102/169/205/243/284 — seed dev escribe en todas las hijas (no aplica a prod pero igual debe actualizarse).
- `apps/backend/src/db/generators/{order,sale,purchase,existencia,inventario}.generator.ts` — generan datos faker; agregar campo `articuloSku` que copia `articulo.sku`.

**Module wiring:** Agregar `ArticulosHelper` a `apps/backend/src/modules/articulos/articulos.module.ts` como provider y `exports: [ArticulosHelper]`. Servicios que lo consumen importan `ArticulosModule`.

**No-op para Drizzle schema.ts en Deploy 1:** Las 5 hijas mantienen el schema TS con `articuloCodigo` declarado; agregar `articuloSku: text('articulo_sku')` nullable en cada una. La FK existente (`.references(() => articulos.codigo, ...)`) NO se toca todavía. Esto sincroniza schema.ts con la realidad de la DB post-migration. **CRÍTICO** según `feedback_schema_drift_silencioso.md`.

**Validación Deploy 1 → Deploy 2 (gate):**

```sql
-- Las 5 queries SC#5 — todas deben retornar 0 antes de proceder a Deploy 2
SELECT count(*) FROM order_items           LEFT JOIN articulos a ON order_items.articulo_sku = a.sku           WHERE a.sku IS NULL;
SELECT count(*) FROM sale_items            LEFT JOIN articulos a ON sale_items.articulo_sku = a.sku            WHERE a.sku IS NULL;
SELECT count(*) FROM purchase_items        LEFT JOIN articulos a ON purchase_items.articulo_sku = a.sku        WHERE a.sku IS NULL;
SELECT count(*) FROM existencias           LEFT JOIN articulos a ON existencias.articulo_sku = a.sku           WHERE a.sku IS NULL;
SELECT count(*) FROM inventarios_articulos LEFT JOIN articulos a ON inventarios_articulos.articulo_sku = a.sku WHERE a.sku IS NULL;

-- Plus: 24-48h soak verificando que el helper doble-escribe correctamente en cada nueva fila.
SELECT count(*) FROM existencias WHERE articulo_sku IS NULL;     -- debe seguir en 0 tras N inserts nuevos
SELECT count(*) FROM inventarios_articulos WHERE articulo_sku IS NULL;  -- idem
```

---

### Deploy 2 (switch) — 0010_phase31_switch.sql

**Scope:** EL 7-STEP ORDERED TRANSACTION DE P-01 — PK swap, FK rename, trigger rewrite, payload v2, API + frontend rekey.

**Pre-flight obligatorio (manual, ejecutado por el operador antes de aplicar la migration):**

```bash
# 1. pg_dump FULL como safety net (D-04)
mkdir -p /var/backups/erp_sanchez/phase31
TS=$(date -u +%Y%m%d_%H%M%S)
docker exec postgres pg_dump -U sanchez -d erp_sanchez -Fc \
  -f /var/backups/erp_sanchez/phase31/pre_deploy2_${TS}.dump
# Verificar tamaño ~ esperado (>40 MB):
docker exec postgres ls -lh /var/backups/erp_sanchez/phase31/pre_deploy2_${TS}.dump
```

**Path acordado para pg_dump full:** `/var/backups/erp_sanchez/phase31/pre_deploy2_<UTC_TIMESTAMP>.dump` (formato custom `-Fc`, sin gzip externo porque `-Fc` ya comprime — alineado con backups daily de `/opt/backup/postgres/erp_sanchez/`).

**Backend deploy (antes de la migration):** Despliega el código con rutas `/api/articulos/:sku`, helper que ahora puede usar `articulo_sku` directo, y enrichment del payload webhook en `articulos.service.ts` (línea 105/121/139/157).

**Frontend deploy (después del backend, antes de la migration):** Despliega rutas `/articulos/[sku]/editar/page.tsx` y todos los links rekey. El frontend nuevo llama a `/api/articulos/:sku` desde el primer minuto.

**SQL completo del 7-step (siguiendo P-01 literalmente, adaptado a este esquema):**

```sql
-- Migration 0010: Phase 31 Deploy 2 (switch) — PK swap + FK rename + trigger rewrite
-- 7-step ordered transaction con LOCK ACCESS EXCLUSIVE (PITFALLS P-01, lineas 28-67)
-- Pre-flight: pg_dump full en /var/backups/erp_sanchez/phase31/pre_deploy2_<TS>.dump
-- Pre-flight: las 5 queries SC#5 deben retornar 0 (gate D-07)
-- Pre-flight: 24-48h de soak desde Deploy 1 sin regresiones
--
-- Apply: psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0010_phase31_switch.sql

-- ─── STEP 1 — Lock ACCESS EXCLUSIVE en las 6 tablas afectadas ────────────────
LOCK TABLE articulos, order_items, sale_items, purchase_items, existencias, inventarios_articulos
  IN ACCESS EXCLUSIVE MODE;

-- ─── STEP 2 — Pre-check: sku 100% poblado, no dupes, hijas 100% backfilled ───
DO $$
DECLARE v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM articulos WHERE sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas articulos.sku IS NULL', v_count; END IF;

  SELECT count(*) - count(DISTINCT sku) INTO v_count FROM articulos;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % duplicados en articulos.sku', v_count; END IF;

  SELECT count(*) INTO v_count FROM order_items           WHERE articulo_sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas order_items.articulo_sku NULL', v_count; END IF;
  SELECT count(*) INTO v_count FROM sale_items            WHERE articulo_sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas sale_items.articulo_sku NULL', v_count; END IF;
  SELECT count(*) INTO v_count FROM purchase_items        WHERE articulo_sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas purchase_items.articulo_sku NULL', v_count; END IF;
  SELECT count(*) INTO v_count FROM existencias           WHERE articulo_sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas existencias.articulo_sku NULL', v_count; END IF;
  SELECT count(*) INTO v_count FROM inventarios_articulos WHERE articulo_sku IS NULL;
  IF v_count > 0 THEN RAISE EXCEPTION 'PK swap blocked: % filas inventarios_articulos.articulo_sku NULL', v_count; END IF;
END $$;

-- ─── STEP 3 — DISABLE TRIGGER trg_update_articulo_unidades (D-13, P-02 capa 1) ──
ALTER TABLE existencias DISABLE TRIGGER trg_update_articulo_unidades;

-- ─── STEP 4 — DROP old PK + ADD new PK + alterar codigo a NOT NULL drop ──────
--     CASCADE elimina automaticamente las 5 FKs hijas hacia articulos.codigo.
ALTER TABLE articulos DROP CONSTRAINT articulos_pkey CASCADE;
ALTER TABLE articulos ALTER COLUMN sku SET NOT NULL;
ALTER TABLE articulos ADD CONSTRAINT articulos_pkey PRIMARY KEY (sku);
ALTER TABLE articulos ALTER COLUMN codigo DROP NOT NULL;

--   Cambiar el index existente articulos_sku_idx (no unique) → DROP (porque sku es PK ahora).
--   Crear index nuevo articulos_codigo_idx (no unique) para queries by-codigo (Phase 32).
DROP INDEX IF EXISTS articulos_sku_idx;
CREATE INDEX IF NOT EXISTS articulos_codigo_idx ON articulos(codigo);

-- ─── STEP 5 — Re-ADD FKs en las 5 hijas apuntando a articulos.sku ────────────
-- existencias ya tenia primary key compuesta (articulo_codigo, deposito_id) — la PK CASCADE
--   con DROP del PK de articulos NO eliminó la PK compuesta de existencias (solo eliminó la FK).
-- Pero igual: hay que cambiar la PK compuesta de existencias a (articulo_sku, deposito_id).

-- 5.1 existencias: cambiar PK compuesta
ALTER TABLE existencias DROP CONSTRAINT existencias_pkey;
ALTER TABLE existencias ALTER COLUMN articulo_sku SET NOT NULL;
ALTER TABLE existencias ADD CONSTRAINT existencias_pkey PRIMARY KEY (articulo_sku, deposito_id);

-- 5.2 inventarios_articulos: cambiar UNIQUE INDEX (inventario_id, articulo_codigo) → (inventario_id, articulo_sku)
DROP INDEX IF EXISTS inv_articulos_unique_idx;
ALTER TABLE inventarios_articulos ALTER COLUMN articulo_sku SET NOT NULL;
CREATE UNIQUE INDEX inv_articulos_unique_idx ON inventarios_articulos(inventario_id, articulo_sku);

-- 5.3 Las otras 3 hijas: solo NOT NULL + FK
ALTER TABLE order_items     ALTER COLUMN articulo_sku SET NOT NULL;
ALTER TABLE sale_items      ALTER COLUMN articulo_sku SET NOT NULL;
ALTER TABLE purchase_items  ALTER COLUMN articulo_sku SET NOT NULL;

-- 5.4 Re-ADD FK en las 5 hijas (CASCADE drop del PK ya eliminó las viejas)
ALTER TABLE order_items
  ADD CONSTRAINT order_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE purchase_items
  ADD CONSTRAINT purchase_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE existencias
  ADD CONSTRAINT existencias_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE inventarios_articulos
  ADD CONSTRAINT inventarios_articulos_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;

-- ─── STEP 6 — CREATE OR REPLACE FUNCTION update_articulo_unidades() ──────────
-- Nuevo cuerpo: keyea por articulo_sku y articulos.sku. Mismo nombre (D-14).
CREATE OR REPLACE FUNCTION update_articulo_unidades()
RETURNS TRIGGER AS $$
DECLARE
  target_sku TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_sku := OLD.articulo_sku;
  ELSE
    target_sku := NEW.articulo_sku;
  END IF;

  UPDATE articulos
  SET unidades = COALESCE((
    SELECT SUM(cantidad) FROM existencias
    WHERE articulo_sku = target_sku
  ), 0)
  WHERE sku = target_sku;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ─── STEP 7 — Recompute manual articulos.unidades (P-02 capa 1) ──────────────
-- Con la función ya reemplazada y trigger todavía deshabilitado, recompute O(n).
UPDATE articulos a
SET unidades = COALESCE((
  SELECT SUM(e.cantidad) FROM existencias e WHERE e.articulo_sku = a.sku
), 0);

-- ─── STEP 8 — ENABLE TRIGGER ─────────────────────────────────────────────────
-- WHEN clause se mantiene (D-15): AFTER INSERT OR UPDATE OF cantidad OR DELETE.
-- El trigger existente todavía apunta a la misma function update_articulo_unidades()
--   que ya reemplazamos en STEP 6 — no necesitamos DROP TRIGGER + CREATE TRIGGER.
ALTER TABLE existencias ENABLE TRIGGER trg_update_articulo_unidades;

-- ─── STEP 9 — Validación final post-cutover (DO block) ───────────────────────
DO $$
DECLARE v_count int;
BEGIN
  -- Verificar PK swap exitoso
  SELECT count(*) INTO v_count
  FROM information_schema.table_constraints
  WHERE table_name = 'articulos' AND constraint_type = 'PRIMARY KEY';
  IF v_count != 1 THEN RAISE EXCEPTION 'articulos no tiene exactamente 1 PK post-swap'; END IF;

  -- Verificar 5 FKs nuevas existen
  SELECT count(*) INTO v_count
  FROM pg_constraint
  WHERE conname IN (
    'order_items_articulo_sku_fkey','sale_items_articulo_sku_fkey',
    'purchase_items_articulo_sku_fkey','existencias_articulo_sku_fkey',
    'inventarios_articulos_articulo_sku_fkey'
  );
  IF v_count != 5 THEN RAISE EXCEPTION 'Esperaba 5 FKs nuevas, encontré %', v_count; END IF;

  -- Verificar trigger habilitado
  SELECT count(*) INTO v_count
  FROM pg_trigger
  WHERE tgname = 'trg_update_articulo_unidades' AND tgenabled = 'O';
  IF v_count != 1 THEN RAISE EXCEPTION 'Trigger trg_update_articulo_unidades no está habilitado'; END IF;

  RAISE NOTICE 'Deploy 2 (switch) OK: PK=sku, 5 FKs activas, trigger ENABLED, articulos.unidades recomputed';
END $$;
```

**Backend rekey changes en Deploy 2:**

1. `articulos.controller.ts` — rekey rutas:

```typescript
// Antes:
@Get(':codigo')
async findOne(@Param('codigo') codigo: string) { ... }

// Después:
@Get(':sku')
async findOne(@Param('sku') sku: string) {
  const articulo = await this.articulosService.findOne(sku)
  if (!articulo) throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
  return articulo
}

@Get('by-codigo/:codigo')
async findByCodigo(@Param('codigo') codigo: string) {
  return this.articulosService.findByCodigo(codigo)  // retorna array
}

@Patch(':sku')
update(@Param('sku') sku: string, @Body() dto: UpdateArticuloDto) { ... }

@Patch(':sku/toggle')
toggleActive(@Param('sku') sku: string) { ... }

@Delete(':sku')
@HttpCode(HttpStatus.OK)
softDelete(@Param('sku') sku: string) { ... }
```

Mismo cambio en `articulos-imagenes.controller.ts` (`:codigo` → `:sku`).

2. `articulos.service.ts` cambios:

```typescript
// findOne ahora keyea por sku (era por codigo)
async findOne(sku: string) {
  const rows = await this.drizzle.db.select().from(articulos).where(eq(articulos.sku, sku))
  return rows[0] ?? null
}

// findByCodigo nuevo: retorna N filas (todas hermanas con mismo codigo). En Phase 31
// el dataset existente garantiza 1 fila por codigo, pero la signature ya es array.
async findByCodigo(codigo: string) {
  return this.drizzle.db
    .select()
    .from(articulos)
    .where(eq(articulos.codigo, codigo))
    .orderBy(asc(articulos.sku))  // determinismo: ordenado por sku
}

// update/toggleActive/softDelete: cambiar eq(articulos.codigo, codigo) → eq(articulos.sku, sku)
async update(sku: string, dto: UpdateArticuloDto) {
  const rows = await this.drizzle.db
    .update(articulos)
    .set({ ...dto, updatedAt: new Date() })
    .where(eq(articulos.sku, sku))
    .returning()
  if (!rows[0]) throw new NotFoundException(`Articulo con sku ${sku} no encontrado`)
  this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_UPDATED, { articulo: rows[0] })
  return rows[0]
}
```

3. **Webhook payload v2 enrichment** — el `articulo` que se emite YA contiene `sku` y `codigo` (es la fila completa de la DB post-Deploy-2). El bump v2 es **implícito**: el campo `sku` aparece automáticamente en el payload porque ahora la columna sku está poblada al 100%. No requiere lógica nueva de enrichment.

   Confirmar en `articulos.service.ts:105`: `this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_CREATED, { articulo })` — `articulo` es `rows[0]` que ya tiene `sku` desde Deploy 1. **NO CAMBIA EL CÓDIGO.** El cambio es semántico: pre-Deploy-2 el `sku` podía ser null o stale; post-Deploy-2 es el PK canónico.

4. `findByArticulo` en existencias y otros endpoints: el path es `/api/existencias/articulo/:articuloCodigo`. **NO cambia** — mantiene compat con frontend (existencias.controller.ts:42-44 sigue siendo by-codigo porque busca por agrupador). Frontend tampoco cambia este endpoint.

**Frontend rekey changes en Deploy 2:**

1. Rename directorio: `apps/web/src/app/(dashboard)/articulos/[codigo]/` → `[sku]/`. El archivo `editar/page.tsx` adentro:
   - `useParams<{ codigo: string }>()` → `useParams<{ sku: string }>()`.
   - `fetchArticuloByCodigoClient(codigo)` → nuevo `fetchArticuloBySkuClient(sku)`.
   - `deleteArticulo(articulo.codigo)` → `deleteArticulo(articulo.sku)`.
   - `toggleArticuloActivo(articulo.codigo)` → `toggleArticuloActivo(articulo.sku)`.
   - `<ImagenSlotGrid articuloCodigo={articulo.codigo}>` → mantener prop name `articuloCodigo` o renombrar a `articuloSku` (ver Open Decisions §3 abajo).

2. `articulos-client.tsx:154` rekey:

   ```typescript
   router.push(`/articulos/${encodeURIComponent(articulo.sku)}/editar`)
   ```

3. `articulo-sheet.tsx:199` rekey:

   ```typescript
   <Link href={`/articulos/${encodeURIComponent(articulo.sku)}/editar`}>
   ```

4. `api.client.ts` rekey (línea 128-183):
   - `fetchArticuloByCodigoClient(codigo)` → `fetchArticuloBySkuClient(sku)`. **NOTA:** renombrar la función para evitar ambiguity; el nombre viejo seducía "fetch by codigo" pero el path era `/articulos/:codigo` (que ahora es `:sku`).
   - Adicionalmente, agregar `fetchArticulosByCodigoClient(codigo)` que llama a `/api/articulos/by-codigo/:codigo` y retorna `Articulo[]`.
   - `updateArticulo(codigo, data)` → `updateArticulo(sku, data)`.
   - `toggleArticuloActivo(codigo)` → `toggleArticuloActivo(sku)`.
   - `deleteArticulo(codigo)` → `deleteArticulo(sku)`.
   - `uploadArticuloImagen(codigo, …)` → `uploadArticuloImagen(sku, …)`.
   - `deleteArticuloImagen(codigo, …)` → `deleteArticuloImagen(sku, …)`.

5. Schema TS update en `apps/backend/src/db/schema.ts`:
   - `articulos.codigo` deja de ser `.primaryKey()`. Agregar `index('articulos_codigo_idx').on(table.codigo)`.
   - `articulos.sku` pasa a ser `.notNull()` (sin `.primaryKey()` modifier aún; preferir `primaryKey({ columns: [table.sku] })` en el array de constraints para uniformidad).
   - Eliminar `index('articulos_sku_idx')` (redundante con PK).
   - En las 5 hijas: `articuloSku` pasa a `.notNull()` + `.references(() => articulos.sku, { onDelete: 'restrict', onUpdate: 'cascade' })`. `articuloCodigo` se mantiene en el TS por ahora (Deploy 3 lo elimina) — pero **sin** `.references()` ni `.notNull()` (ya es nullable y sin FK post-CASCADE).
   - `existencias`: cambiar `primaryKey({ columns: [table.articuloCodigo, table.depositoId] })` → `primaryKey({ columns: [table.articuloSku, table.depositoId] })`.
   - `inventarios_articulos`: cambiar `uniqueIndex('inv_articulos_unique_idx').on(table.inventarioId, table.articuloCodigo)` → `.on(table.inventarioId, table.articuloSku)`.

6. Frontend types `apps/web/src/types/{order,sale,purchase,existencia,inventario,dashboard}.ts`:
   - **Estrategia:** agregar `articuloSku: string` en Deploy 2 (al lado de `articuloCodigo`), quitar `articuloCodigo` en Deploy 3 (rename TS).
   - Razón: durante Deploy 2 el backend ya retorna ambos campos en las queries (`existencias.service.ts` línea 138-143 hace `select` de varios campos — debe agregar `articuloSku: existencias.articuloSku`). Si el type quita `articuloCodigo` en Deploy 2, el código existente que lo lee rompe inmediatamente. Mejor coexistencia 1 deploy.

7. Notice en `/settings/webhooks` (D-10):

   Recomendación: **`Alert` de shadcn/ui** dentro de `webhooks-client.tsx`, en la parte superior antes de la tabla. Texto sugerido (Spanish argentino):

   ```tsx
   import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
   import { Info } from 'lucide-react'

   ;<Alert>
     <Info className="h-4 w-4" />
     <AlertTitle>Cambio en el payload de articulo.* desde v1.3</AlertTitle>
     <AlertDescription>
       Los eventos <code>articulo.created</code>, <code>articulo.updated</code> y{' '}
       <code>articulo.deleted</code> ahora incluyen el campo <code>sku</code> dentro del objeto{' '}
       <code>articulo</code>, además del <code>codigo</code> existente. <strong>sku</strong> es el
       identificador único de cada fila; <strong>codigo</strong> puede agrupar variantes cuando una
       misma referencia tiene atributos múltiples. Los suscriptores que solo leen
       <code>codigo</code> siguen funcionando sin cambios.
     </AlertDescription>
   </Alert>
   ```

---

### Deploy 3 (contract) — 0011_phase31_contract.sql

**Scope:** Cleanup final. Eliminar `articulo_codigo` de las 5 hijas + ajustar schema.ts + remover doble-escribe del backend helper.

**Pre-flight:** Las 5 queries SC#5 deben seguir retornando 0 (no debería haber cambiado nada desde Deploy 2 si todo está sano). Plus 24-48h de soak desde Deploy 2.

**SQL completo:**

```sql
-- Migration 0011: Phase 31 Deploy 3 (contract) — drop articulo_codigo de las 5 hijas
-- Pre-flight: 24-48h post-Deploy-2 sin regresiones
-- Pre-flight: backend deploy con helper ya simplificado (no doble-escribe)
-- Apply: psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0011_phase31_contract.sql

LOCK TABLE order_items, sale_items, purchase_items, existencias, inventarios_articulos
  IN ACCESS EXCLUSIVE MODE;

-- Drop indices viejos sobre articulo_codigo (los nuevos sobre articulo_sku ya existen desde Deploy 1)
DROP INDEX IF EXISTS order_items_articulo_codigo_idx;       -- (no estaba indexado explicitamente — order_items no tiene articulo_codigo_idx en schema.ts actual)
DROP INDEX IF EXISTS sale_items_articulo_codigo_idx;        -- idem
DROP INDEX IF EXISTS purchase_items_articulo_codigo_idx;    -- idem
DROP INDEX IF EXISTS existencias_articulo_codigo_idx;
DROP INDEX IF EXISTS inv_articulos_articulo_codigo_idx;

-- Drop columnas articulo_codigo de las 5 hijas
ALTER TABLE order_items            DROP COLUMN IF EXISTS articulo_codigo;
ALTER TABLE sale_items             DROP COLUMN IF EXISTS articulo_codigo;
ALTER TABLE purchase_items         DROP COLUMN IF EXISTS articulo_codigo;
ALTER TABLE existencias            DROP COLUMN IF EXISTS articulo_codigo;
ALTER TABLE inventarios_articulos  DROP COLUMN IF EXISTS articulo_codigo;

DO $$
DECLARE v_count int;
BEGIN
  -- Sanidad: las 5 hijas no deberian tener mas columna articulo_codigo
  SELECT count(*) INTO v_count
  FROM information_schema.columns
  WHERE table_name IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos')
    AND column_name = 'articulo_codigo';
  IF v_count != 0 THEN RAISE EXCEPTION 'Deploy 3 incompleto: % columnas articulo_codigo persisten', v_count; END IF;
  RAISE NOTICE 'Deploy 3 (contract) OK: articulo_codigo eliminado de las 5 hijas';
END $$;
```

**Backend Deploy 3 (debe deployarse ANTES de la migration):**

- Helper `articulosHelper.resolveSku()` deja de existir o se mantiene como pass-through (Phase 32 lo va a usar para variantes).
- Servicios que escribían doble: ahora escriben solo `articuloSku`. Sitios:
  - `existencias.service.ts:213` upsert
  - `inventarios.service.ts:252` addArticulo
  - `db/seed.ts` líneas 102/169/205/243/284
  - Todos los generators de `db/generators/`
- Schema TS: quitar `articuloCodigo: text('articulo_codigo')` de las 5 hijas. Tipos `apps/web/src/types/*.ts` quitan `articuloCodigo: string` (queda solo `articuloSku`).

---

## Open Decisions Closed By Research

### 1. Overwrite location (Discretion #4) → **Deploy 1**

**Razón:**

- **Riesgo de Deploy 2 más bajo:** el 7-step de P-01 hace `ALTER TABLE articulos ADD PRIMARY KEY (sku)`. Si `articulos.sku` tiene dupes (post-overwrite ciego D-02) o NULLs, el ADD PK falla con `could not create unique index ... duplicate key value` y aborta la transacción. Mejor descubrirlo en Deploy 1 (donde el rollback es trivial: `UPDATE articulos SET sku = null` y reintentar) que en Deploy 2 (donde la transacción ya tomó `ACCESS EXCLUSIVE` en 6 tablas y rolled-back habiendo bloqueado tráfico).
- **Backfill de hijas más simple:** con `articulos.sku` ya estable en Deploy 1, el UPDATE FROM JOIN copia el valor canónico. Si el overwrite fuera en Deploy 2, el backfill de Deploy 1 tendría que decidir qué hacer con filas donde `articulos.sku IS NULL` (caer a `articulo_codigo` literal? generar un sku temporal?). Mover overwrite a Deploy 1 elimina la rama.
- **Soak window válido:** el SC#5 queries durante 24-48h validan integridad referencial contra el sku canónico, no contra un sku que va a cambiar.
- **No hay desventaja material:** Deploy 1 ya cambia DB con UPDATE de 101.021 filas (backfill); agregar otro UPDATE de 101.021 filas (overwrite) no cambia perfil de riesgo.

### 2. Naming + path del script de auditoría preflight (Discretion #1)

**Decisión:** Bash script en `apps/backend/scripts/phase31-preflight-audit.sh` que invoca psql con un heredoc SQL y guarda output en el plan dir.

```bash
#!/usr/bin/env bash
# Phase 31 — Preflight audit informativo (non-blocking, D-01)
# Genera 31-PREFLIGHT-AUDIT.md con counts de articulos.sku ANTES del cutover.
set -euo pipefail
TS=$(date -u +%Y-%m-%dT%H:%M:%SZ)
OUT=".planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-PREFLIGHT-AUDIT.md"

cat > "$OUT" <<EOF
# Phase 31 — Preflight Audit

**Generado:** $TS
**Origen:** \`apps/backend/scripts/phase31-preflight-audit.sh\`
**Status:** Informativo (NO bloquea cutover por D-01)

## Counts pre-cutover

\`\`\`
EOF

docker exec postgres psql -U sanchez -d erp_sanchez -tA -F'|' <<'SQL' >> "$OUT"
SELECT
  count(*) FILTER (WHERE sku IS NULL)                                              AS null_sku,
  count(*) FILTER (WHERE sku = codigo)                                             AS sku_eq_codigo,
  count(*) FILTER (WHERE sku = regexp_replace(codigo, '[-_.[:space:]]+', '', 'g')) AS sku_eq_stripsep,
  count(*) FILTER (WHERE sku IS NOT NULL AND sku != codigo)                        AS sku_diff_codigo,
  count(*) FILTER (WHERE sku IS NOT NULL) - count(DISTINCT sku) FILTER (WHERE sku IS NOT NULL) AS sku_dupes,
  count(*)                                                                          AS total
FROM articulos;
SQL

cat >> "$OUT" <<EOF
\`\`\`

## Interpretación

- **null_sku:** cuántas filas serán pobladas por el overwrite (esperado: ~30-40 mil).
- **sku_eq_codigo:** cuántas filas tienen sku == codigo (sku ya con valor coherente).
- **sku_eq_stripsep:** cuántas filas tienen sku == stripSep(codigo) (sku ya canónico).
- **sku_diff_codigo:** cuántas filas tienen sku != codigo (potential data loss en overwrite ciego).
- **sku_dupes:** cuántos duplicados existen. Si > 0 post-overwrite, el PK swap de Deploy 2 va a FALLAR. **Si retorna > 0 acá, esperar diff y ver qué dupes habría POST-stripSep**.

## Decisión

Por D-02 (overwrite ciego), Deploy 1 va a ejecutar UPDATE sin importar estos counts.
Si sku_dupes > 0 después de simular stripSep, esto MUST ser resuelto antes del cutover
(ver query en \`apps/backend/scripts/phase31-preflight-audit.sh\` línea N).
EOF

echo "Preflight audit guardado en $OUT"
```

**Lenguaje:** bash + heredoc SQL (consistente con scripts existentes en el repo).
**Integración:** invocado por el operador manualmente como Wave 0 Step 1; NO se integra con drizzle-kit.

### 3. Contrato de `findByCodigo` (Discretion #6)

**Decisión:**

- **Path:** `GET /api/articulos/by-codigo/:codigo` (explícito; evita colisión semántica con `/api/articulos/:sku`).
- **Response shape:** `Articulo[]` (array directo, sin envelope `{ data, total }`).
- **Razón del array directo:** el endpoint no necesita paginación (en Phase 31 garantiza 1 fila; en Phase 32 podría retornar 2-10 variantes máx — nunca cientos). Sin paginación → sin envelope.
- **Ordenamiento:** `ORDER BY sku ASC` (determinístico, alfabético).
- **Status codes:** `200` siempre (array vacío `[]` si no hay match; **no** `404`). Razón: GET semántico — "buscar por codigo" puede tener 0 resultados, no es un error.
- **Auth:** mismo CompositeAuthGuard que las otras rutas read (sin `RolesGuard`).

```typescript
// Service method
async findByCodigo(codigo: string): Promise<typeof articulos.$inferSelect[]> {
  return this.drizzle.db
    .select()
    .from(articulos)
    .where(eq(articulos.codigo, codigo))
    .orderBy(asc(articulos.sku))
}
```

### 4. Tipos frontend renombrado en Deploy 2 vs Deploy 3 (no en CONTEXT.md pero implicado)

**Decisión:** En Deploy 2 los tipos `apps/web/src/types/*.ts` agregan `articuloSku: string` **manteniendo** `articuloCodigo: string`. En Deploy 3 quitan `articuloCodigo`. Razón: durante Deploy 2 el backend devuelve ambos campos (la columna `articulo_codigo` todavía existe en DB hasta Deploy 3); si en Deploy 2 quitamos `articuloCodigo` del type, cualquier componente que lo lee (existencias-columns.tsx, existencias-por-articulo.tsx, low-stock-alerts.tsx) rompe inmediatamente — el rekey del componente debe coexistir con el del backend.

### 5. Webhook payload v2 — dónde se enriquece (Discretion implícito)

**Decisión:** **No se enriquece explícitamente.** El `articulo` que ya emite `articulos.service.ts:105/121/139/157` ya contiene `sku` desde Deploy 1 (la columna está poblada con `stripSep(codigo)` en todas las 101.021 filas). El "bump v2" es semántico, no estructural: el campo `sku` simplemente deja de ser null/stale post-Deploy-2 y empieza a ser el PK canónico.

Verificar en Wave 2: agregar test E2E que dispare `POST /api/articulos`, capture el delivery en `webhook_deliveries.payload`, y asserts:

- `payload.articulo.sku` está presente y no-null.
- `payload.articulo.codigo` está presente.
- Event name sigue siendo `articulo.created` (D-09 dice no cambia).

### 6. Path y formato del pg_dump full (Discretion #3)

**Decisión:**

- **Path:** `/var/backups/erp_sanchez/phase31/pre_deploy2_<UTC_TIMESTAMP>.dump` (consistente con backups daily existentes en `/opt/backup/postgres/erp_sanchez/`).
- **Formato:** `-Fc` (custom, ya comprime gzip-9 internamente). Tamaño esperado <50 MB para 101.021 articulos (los daily están en ~7-10 MB según 260502-tqf SUMMARY).
- **Naming:** `pre_deploy2_20260520_180000.dump` para Deploy 2; `pre_deploy3_<TS>.dump` para Deploy 3.
- **Comando:** `docker exec postgres pg_dump -U sanchez -d erp_sanchez -Fc -f /var/backups/...` (corre desde dentro del container postgres; el path del lado del container es el mismo si `/var/backups` está montado, sino ajustar volumen).
- **Verificación post-dump:** `ls -lh` para confirmar tamaño no-cero antes de invocar la migration.

### 7. Naming/forma del notice en /settings/webhooks (Discretion #7)

**Decisión:** `Alert` de shadcn/ui (ver código completo en §"Deploy 2 → Frontend rekey punto 7"). Razón: shadcn/ui Alert es el componente "natural" para info contextual no-bloqueante, ya está usado en otros lados del admin, y respeta la estética Tabler vía `shadcn-tabler-mcp`. Posicionado arriba del listado de webhooks (antes del bloque de la tabla en `webhooks-client.tsx`).

---

## File Inventory

### Backend (`apps/backend/`)

**Deploy 1 (expand) — nuevos / modificados:**

| Archivo                                                                      | Cambio                                                                                                                   |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `drizzle/0009_phase31_expand.sql`                                            | NEW — overwrite + agregar articulo_sku + backfill + indices                                                              |
| `drizzle/meta/_journal.json`                                                 | UPDATE — agregar entry idx=9 con tag `0009_phase31_expand`                                                               |
| `src/db/schema.ts`                                                           | UPDATE — agregar `articuloSku: text('articulo_sku')` nullable en las 5 hijas; agregar index `*_articulo_sku_idx` en cada |
| `src/modules/articulos/articulos-helper.ts`                                  | NEW — clase `ArticulosHelper` con `resolveSku()` y `toRefPair()`                                                         |
| `src/modules/articulos/articulos.module.ts`                                  | UPDATE — agregar `ArticulosHelper` a providers y exports                                                                 |
| `src/modules/existencias/existencias.service.ts`                             | UPDATE — `upsert()` y `update()` doble-escriben `articulo_codigo` Y `articulo_sku` via helper                            |
| `src/modules/existencias/existencias.module.ts`                              | UPDATE — importar `ArticulosModule`                                                                                      |
| `src/modules/inventarios/inventarios.service.ts`                             | UPDATE — `addArticulo()` doble-escribe via helper                                                                        |
| `src/modules/inventarios/inventarios.module.ts`                              | UPDATE — importar `ArticulosModule`                                                                                      |
| `src/db/seed.ts`                                                             | UPDATE — todos los `.values()` de las 5 hijas incluyen `articuloSku: articulo.sku`                                       |
| `src/db/generators/{order,sale,purchase,existencia,inventario}.generator.ts` | UPDATE — agregan `articuloSku: articulo.sku`                                                                             |
| `scripts/phase31-preflight-audit.sh`                                         | NEW — Bash script de auditoría informativa                                                                               |

**Deploy 2 (switch) — modificados:**

| Archivo                                                  | Cambio                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drizzle/0010_phase31_switch.sql`                        | NEW — 7-step ordered transaction                                                                                                                                                                                                                                                                                                   |
| `drizzle/meta/_journal.json`                             | UPDATE — agregar entry idx=10                                                                                                                                                                                                                                                                                                      |
| `src/db/schema.ts`                                       | UPDATE — PK swap (`articulos.codigo` deja de ser PK, `articulos.sku` pasa a PK), drop `articulos_sku_idx`, add `articulos_codigo_idx`, las 5 hijas: `articuloSku.notNull().references(() => articulos.sku, ...)`, existencias PK compuesta = `[articuloSku, depositoId]`, inv_articulos_unique_idx = `[inventarioId, articuloSku]` |
| `src/modules/articulos/articulos.controller.ts`          | UPDATE — todas las rutas `:codigo` → `:sku`; agregar `@Get('by-codigo/:codigo') findByCodigo()`                                                                                                                                                                                                                                    |
| `src/modules/articulos/articulos.service.ts`             | UPDATE — `findOne` keyea por sku; agregar `findByCodigo` (returns array); update/toggleActive/softDelete keyean por sku                                                                                                                                                                                                            |
| `src/modules/articulos/articulos-imagenes.controller.ts` | UPDATE — todas las rutas `:codigo` → `:sku`                                                                                                                                                                                                                                                                                        |
| `src/modules/articulos/articulos-imagenes.service.ts`    | UPDATE — todos los `eq(articulos.codigo, ...)` → `eq(articulos.sku, ...)`                                                                                                                                                                                                                                                          |
| `src/modules/existencias/existencias.service.ts`         | UPDATE — todos los `eq(existencias.articuloCodigo, ...)` y `eq(existencias.articuloCodigo, articulos.codigo)` → `articuloSku` y `articulos.sku`. El path `/api/existencias/articulo/:articuloCodigo` se mantiene como agrupador (Phase 32 N>1) pero internamente puede usar `findByCodigo`                                         |
| `src/modules/inventarios/inventarios.service.ts`         | UPDATE — joins por articulo_sku                                                                                                                                                                                                                                                                                                    |
| `src/modules/dashboard/dashboard.service.ts`             | UPDATE — `articuloCodigo: existencias.articuloSku` (verificar línea 23-fwd)                                                                                                                                                                                                                                                        |

**Deploy 3 (contract) — modificados:**

| Archivo                                                         | Cambio                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `drizzle/0011_phase31_contract.sql`                             | NEW — drop articulo_codigo de las 5 hijas                               |
| `drizzle/meta/_journal.json`                                    | UPDATE — agregar entry idx=11                                           |
| `src/db/schema.ts`                                              | UPDATE — quitar `articuloCodigo` de las 5 hijas                         |
| `src/modules/articulos/articulos-helper.ts`                     | UPDATE — simplificar (puede mantenerse como pass-through para Phase 32) |
| `src/modules/existencias/existencias.service.ts`                | UPDATE — quitar escritura de `articuloCodigo`                           |
| `src/modules/inventarios/inventarios.service.ts`                | UPDATE — quitar escritura de `articuloCodigo`                           |
| `src/db/seed.ts` + generators                                   | UPDATE — quitar campo `articuloCodigo`                                  |
| `src/modules/existencias/dto/create-existencia.dto.ts`          | UPDATE — renombrar `articuloCodigo` → `articuloSku`                     |
| `src/modules/inventarios/dto/create-inventario-articulo.dto.ts` | UPDATE — renombrar `articuloCodigo` → `articuloSku`                     |

### Frontend (`apps/web/`)

**Deploy 1:** No cambia (frontend sigue llamando a las URLs viejas; el backend mantiene compat).

**Deploy 2 — renombrados / modificados:**

| Archivo                                                  | Cambio                                                                                                                                                                                                                        |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/articulos/[codigo]/editar/page.tsx` | RENAME a `[sku]/editar/page.tsx`; cambiar `useParams<{codigo:string}>` → `<{sku:string}>`; rekey de `articulo.codigo` → `articulo.sku` en handlers                                                                            |
| `src/app/(dashboard)/articulos/articulos-client.tsx`     | UPDATE — línea 154: `/articulos/${articulo.sku}/editar`                                                                                                                                                                       |
| `src/components/articulos/articulo-sheet.tsx`            | UPDATE — línea 199: link a `/articulos/${articulo.sku}/editar`                                                                                                                                                                |
| `src/components/articulos/imagen-slot.tsx`               | UPDATE — props/prop name pueden mantener `articuloCodigo` semánticamente o renombrar a `articuloSku` (escogido: renombrar a `articuloSku` para coherencia)                                                                    |
| `src/components/articulos/imagen-slot-grid.tsx`          | UPDATE — idem                                                                                                                                                                                                                 |
| `src/lib/api.client.ts`                                  | UPDATE — funciones articulo CRUD: param `codigo` → `sku`, URL `/api/articulos/{codigo}` → `/api/articulos/{sku}`; agregar `fetchArticulosByCodigoClient(codigo): Promise<Articulo[]>` para `/api/articulos/by-codigo/:codigo` |
| `src/types/order.ts`                                     | UPDATE — `OrderItem` agrega `articuloSku: string`                                                                                                                                                                             |
| `src/types/sale.ts`                                      | UPDATE — `SaleItem` agrega `articuloSku: string`                                                                                                                                                                              |
| `src/types/purchase.ts`                                  | UPDATE — `PurchaseItem` agrega `articuloSku: string`                                                                                                                                                                          |
| `src/types/existencia.ts`                                | UPDATE — `Existencia` ya tiene `articuloSku: string \| null` (existencia.ts línea 9) — cambiar a `articuloSku: string` notnull; `ExistenciaMatrixRow` agrega `articuloSku: string`                                            |
| `src/types/inventario.ts`                                | UPDATE — `InventarioArticulo` agrega `articuloSku: string`                                                                                                                                                                    |
| `src/types/dashboard.ts`                                 | UPDATE — `LowStockItem` agrega `articuloSku: string`                                                                                                                                                                          |
| `src/components/settings/webhooks/webhooks-client.tsx`   | UPDATE — agregar `<Alert>` con notice payload v2 antes de la tabla                                                                                                                                                            |

**Deploy 3:**

| Archivo                                                                                                                                                                           | Cambio                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tipos en `src/types/{order,sale,purchase,existencia,inventario,dashboard}.ts`                                                                                                     | UPDATE — quitar `articuloCodigo: string` (solo queda `articuloSku`)                                                                                                                                                                                                                                    |
| Componentes con `e.articuloCodigo` (existencias-columns, existencias-por-articulo, existencias-por-deposito, conteo-table, low-stock-alerts, articulo-search, existencias-client) | UPDATE — rekey a `articuloSku` donde aplique. **Nota:** `existencias-por-articulo` muestra el codigo de la fila — Phase 32 va a separar columnas "codigo" (agrupador) vs "sku" (variante) en el UI. Phase 31 puede mantener mostrar `articulo.sku` (mismo valor que el codigo en datos pre-variantes). |

### Migrations / DB

| Path                                              | Status                         |
| ------------------------------------------------- | ------------------------------ |
| `apps/backend/drizzle/0009_phase31_expand.sql`    | NEW Wave 1                     |
| `apps/backend/drizzle/0010_phase31_switch.sql`    | NEW Wave 2                     |
| `apps/backend/drizzle/0011_phase31_contract.sql`  | NEW Wave 3                     |
| `apps/backend/drizzle/meta/_journal.json`         | UPDATE 3 veces (idx 9, 10, 11) |
| `apps/backend/scripts/phase31-preflight-audit.sh` | NEW Wave 0                     |
| `.planning/phases/31-.../31-PREFLIGHT-AUDIT.md`   | NEW Wave 0 (output del script) |

---

## Code Excerpts

### Trigger function actual (a reescribir en Deploy 2)

De `apps/backend/src/db/migrate-unidades.sql` líneas 48-70:

```sql
CREATE OR REPLACE FUNCTION update_articulo_unidades()
RETURNS TRIGGER AS $$
DECLARE
  target_codigo TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_codigo := OLD.articulo_codigo;
  ELSE
    target_codigo := NEW.articulo_codigo;
  END IF;

  UPDATE articulos
  SET unidades = COALESCE((
    SELECT SUM(cantidad) FROM existencias
    WHERE articulo_codigo = target_codigo
  ), 0)
  WHERE codigo = target_codigo;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
```

Patrón de migration custom (de `apps/backend/drizzle/0008_phase30_templates.sql`):

```sql
-- Apply: psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0008_phase30_templates.sql
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "familia" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES "articulos_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
```

(El delimitador `--> statement-breakpoint` lo agrega drizzle-kit pero también funciona en custom `.sql` files al ser interpretado como comentario por psql.)

### Event emit actual (Deploy 2 lo aprovecha as-is)

De `apps/backend/src/modules/articulos/articulos.service.ts:103-106`:

```typescript
const articulo = rows[0]
// Fire and forget — non-blocking
this.eventEmitter.emit(WEBHOOK_EVENTS.ARTICULO_CREATED, { articulo })
return articulo
```

`rows[0]` es la fila completa de `articulos.$inferSelect`, que post-Deploy-2 incluye `sku` automáticamente. **No requiere cambio de código** para el payload v2 — el bump es semántico.

### Stub del helper a crear

```typescript
// apps/backend/src/modules/articulos/articulos-helper.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { DrizzleService } from '../../db'
import { articulos } from '../../db/schema'

@Injectable()
export class ArticulosHelper {
  constructor(private readonly drizzle: DrizzleService) {}

  async resolveSku(articuloCodigo: string): Promise<string> {
    const [row] = await this.drizzle.db
      .select({ sku: articulos.sku })
      .from(articulos)
      .where(eq(articulos.codigo, articuloCodigo))
      .limit(1)
    if (!row?.sku) {
      throw new NotFoundException(`Articulo ${articuloCodigo} no tiene sku asignado`)
    }
    return row.sku
  }
}
```

### Patrón de doble-escribe en consumidor

```typescript
// existencias.service.ts upsert() — Deploy 1
async upsert(dto: CreateExistenciaDto) {
  // Doble-escribe: resolver sku desde codigo y escribir AMBAS columnas.
  const articuloSku = await this.articulosHelper.resolveSku(dto.articuloCodigo)

  const rows = await this.drizzle.db
    .insert(existencias)
    .values({
      articuloCodigo: dto.articuloCodigo,
      articuloSku,                        // ← NUEVO en Deploy 1
      depositoId: dto.depositoId,
      cantidad: dto.cantidad ?? 0,
      stockMinimo: dto.stockMinimo ?? 0,
      stockMaximo: dto.stockMaximo ?? 0,
    })
    .onConflictDoUpdate({
      target: [existencias.articuloCodigo, existencias.depositoId],
      set: {
        cantidad: sql`EXCLUDED.cantidad`,
        stockMinimo: sql`EXCLUDED.stock_minimo`,
        stockMaximo: sql`EXCLUDED.stock_maximo`,
        articuloSku: sql`EXCLUDED.articulo_sku`,  // ← NUEVO
        updatedAt: new Date(),
      },
    })
    .returning()

  return rows[0]
}
```

En Deploy 3 este método queda simplificado a:

```typescript
async upsert(dto: CreateExistenciaDto) {
  // dto ahora tiene articuloSku directo (renombrado en DTO).
  const rows = await this.drizzle.db
    .insert(existencias)
    .values({
      articuloSku: dto.articuloSku,
      depositoId: dto.depositoId,
      // ...
    })
    .onConflictDoUpdate({ target: [existencias.articuloSku, existencias.depositoId], set: { /* ... */ } })
    .returning()
  return rows[0]
}
```

---

## Risks & Mitigations

| Riesgo                                                                                                                                                          | Probabilidad                                 | Impacto                                                                         | Mitigación                                                                                                                                                                                                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PK swap a mitad** (Deploy 2 abortado entre DROP PK y ADD PK nueva)                                                                                            | Baja (la transacción es atómica)             | Catastrófico                                                                    | `--single-transaction --set ON_ERROR_STOP=1` + `LOCK ACCESS EXCLUSIVE` previo. Rollback = restore desde pg_dump pre-Deploy-2 (D-04).                                                                                                                                                                                                                    |
| **FK orphaned** (post-Deploy-2 alguna hija tiene articulo_sku que no existe en articulos.sku)                                                                   | Muy baja (Step 2 pre-check valida)           | Alto                                                                            | Pre-check del STEP 2 aborta si hay NULLs o dupes. Plus las 5 queries SC#5 corren en gate Deploy 1 → Deploy 2 y deben retornar 0.                                                                                                                                                                                                                        |
| **Trigger broken** (update_articulo_unidades emite SQL inválido post-CREATE OR REPLACE)                                                                         | Baja                                         | Alto (existencias deja de mantener articulos.unidades)                          | Test E2E en Wave 2 que INSERT/UPDATE/DELETE en existencias y verifica articulos.unidades. Plus la transacción de Deploy 2 hace recompute manual antes de ENABLE TRIGGER — si la función está rota, el recompute manual también falla y la transacción aborta.                                                                                           |
| **Payload v2 sin sku** (suscriptores que esperan ver sku reciben null)                                                                                          | Muy baja (sku poblado desde Deploy 1)        | Medio                                                                           | El sku está NOT NULL al 100% desde Deploy 1 (overwrite). Test E2E en Wave 2 captura webhook delivery y verifica `payload.articulo.sku` no-null.                                                                                                                                                                                                         |
| **Backend olvida double-write una ruta** (alguna ruta backend escribe en hijas pero no llama a `articulosHelper.resolveSku()`)                                  | Media (5 servicios + seed + generators)      | Alto (data inconsistency silenciosa)                                            | Centralizar 100% en helper (D-06). Grep audit Wave 0: `grep -rn '.insert(existencias\|.insert(inventariosArticulos\|.insert(orderItems\|.insert(saleItems\|.insert(purchaseItems' apps/backend/src` → todos los hits deben pasar por helper. Plus test integración Wave 1 que para cada servicio: hace insert, lee row, asserts `articulo_sku != null`. |
| **Drift TS↔DB silencioso** (schema.ts no sincronizado con DB post-migration)                                                                                    | Media (lección 2026-05-15)                   | Alto (queries 500 con drizzle)                                                  | Cada Deploy commitea schema.ts + .sql + \_journal.json en un solo PR/commit (CLAUDE.md feedback_schema_drift_silencioso). Post-migration: `pnpm db:studio` o `psql \d articulos` y comparar contra `articulos.$inferSelect`.                                                                                                                            |
| **codigo_barras dupes accidentales descubiertos en preflight**                                                                                                  | Baja                                         | Bajo (deferred a Phase 32)                                                      | El preflight informativo NO bloquea. Phase 31 ignora. Reportar en `31-PREFLIGHT-AUDIT.md`.                                                                                                                                                                                                                                                              |
| **Tráfico real concurrente durante el LOCK ACCESS EXCLUSIVE**                                                                                                   | Alta (cada deploy bloquea writes ~10-30 seg) | Bajo (writes esperan; reads bloqueadas por ACCESS EXCLUSIVE)                    | Cutover en ventana de bajo tráfico (sugerido: 03:00-05:00 hora local). Backend feature flag opcional para retornar 503 durante la ventana. Frontend muestra toast "Migración en curso, reintentar en 1 min".                                                                                                                                            |
| **Phase 30 schema TS drift inadvertido**                                                                                                                        | Baja                                         | Bajo                                                                            | Schema.ts línea 215 `unidades: integer('unidades').default(0)` ya existe; Phase 31 no toca. Línea 212 `templateId` ya existe. La PK swap solo cambia el constraint, no las otras columnas.                                                                                                                                                              |
| **inv_articulos_unique_idx rota durante PK swap** (constraint compuesto sobre articulo_codigo se elimina via CASCADE pero hay que recrearlo sobre articulo_sku) | Media                                        | Alto (sin unique constraint, podrían duplicarse filas en inventarios_articulos) | STEP 5.2 explícito: `CREATE UNIQUE INDEX inv_articulos_unique_idx ON inventarios_articulos(inventario_id, articulo_sku)` dentro de la transacción.                                                                                                                                                                                                      |
| **existencias PK compuesta** se elimina con CASCADE del PK de articulos                                                                                         | Cuidado: NO se elimina                       | —                                                                               | El `DROP CONSTRAINT articulos_pkey CASCADE` solo elimina FKs que apuntan a articulos.codigo. La PK compuesta de existencias (sobre `articulo_codigo`, `deposito_id`) NO se elimina automáticamente. STEP 5.1 hace `DROP CONSTRAINT existencias_pkey` + `ADD PRIMARY KEY (articulo_sku, deposito_id)` manualmente.                                       |

---

## Validation Architecture (Nyquist Dimension 8)

### Test Framework

| Property           | Value                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------- |
| Framework          | Vitest (existente en monorepo via `packages/utils/vitest.config.ts`) + supertest para E2E backend               |
| Config file        | `apps/backend/jest.config.ts` (NestJS default — tests existentes); `packages/utils/vitest.config.ts` para puros |
| Quick run command  | `pnpm --filter @objetiva/utils test` (composer puro)                                                            |
| Full suite command | `pnpm --filter backend test && pnpm --filter web typecheck && pnpm --filter web build`                          |
| Phase gate         | Las 3 migrations aplicadas exitosamente + las 5 queries SC#5 retornan 0 + `pnpm typecheck` en backend y web     |

### Phase Requirements → Test Map (cobertura de los 5 SC del ROADMAP)

| SC#  | Behavior                                                                                         | Test Type   | Automated Command                                                                                                                                            | File Exists?                                                   |
| ---- | ------------------------------------------------------------------------------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| SC#1 | `\d articulos` muestra sku como PK; `count(*) WHERE sku IS NULL` = 0                             | smoke SQL   | `psql -tAc "SELECT a.attname FROM pg_attribute a JOIN pg_constraint c ON a.attnum = ANY(c.conkey) WHERE c.conrelid='articulos'::regclass AND c.contype='p'"` | ❌ Wave 0 — crear `apps/backend/scripts/phase31-validation.sh` |
| SC#2 | 5 hijas con `articulo_sku` FK; `articulo_codigo` eliminado post-Deploy-3                         | smoke SQL   | `psql -tAc "SELECT conname FROM pg_constraint WHERE conname LIKE '%_articulo_sku_fkey'"` (esperado: 5 filas)                                                 | ❌ Wave 0                                                      |
| SC#3 | `findOne(sku)` retorna 1, `findByCodigo(codigo)` retorna N, comportamiento preservado sku=codigo | integration | `pnpm --filter backend test -- articulos.controller.e2e-spec.ts`                                                                                             | ❌ Wave 0 — crear test E2E                                     |
| SC#4 | Webhook payload v2 incluye sku                                                                   | E2E         | Test: POST a `/api/articulos`, esperar delivery en webhook_deliveries, assert `payload.articulo.sku !== null`                                                | ❌ Wave 0                                                      |
| SC#5 | Integridad referencial post-cutover (5 queries)                                                  | smoke SQL   | `apps/backend/scripts/phase31-validation.sh integrity`                                                                                                       | ❌ Wave 0                                                      |

### Sampling Rate

- **Per task commit:** `pnpm --filter backend typecheck && pnpm --filter web typecheck`
- **Per wave merge:** correr el test E2E de articulos + las 5 queries SC#5 contra DB local
- **Phase gate (entre deploys):** `apps/backend/scripts/phase31-validation.sh` con `--check=integrity` debe retornar exit 0

### Wave 0 Gaps (a crear antes de implementación)

- [ ] `apps/backend/scripts/phase31-preflight-audit.sh` — Bash script de auditoría D-01
- [ ] `apps/backend/scripts/phase31-validation.sh` — Bash + psql con sub-comandos `integrity`, `pk-swap`, `triggers`
- [ ] `apps/backend/test/articulos-phase31.e2e-spec.ts` — Test E2E que cubre SC#3 y SC#4 (findByCodigo + webhook payload v2)
- [ ] `apps/backend/src/modules/articulos/__tests__/articulos-helper.spec.ts` — Unit test para `resolveSku()` (cubre happy path + sku-null)
- [ ] Reusar `packages/utils/__tests__/composer.spec.ts` para verificar `stripSep()` (ya existe desde Phase 30)

### Eval Suite — qué tests cada PLAN.md debe asignar

**Plan 31-01 (Wave 0 — Preflight & Safety Net):**

- Run `apps/backend/scripts/phase31-preflight-audit.sh` y commit del `31-PREFLIGHT-AUDIT.md` output.
- Run `pg_dump` y verificar tamaño no-cero del archivo.
- Smoke: dump restoreable a una DB temporal (`createdb erp_phase31_smoke && pg_restore -d erp_phase31_smoke /var/backups/.../pre_deploy2_X.dump && psql -d erp_phase31_smoke -tAc "SELECT count(*) FROM articulos"` → 101.021).

**Plan 31-02 (Wave 1 — Deploy 1 expand):**

- Backend deploy ANTES de migration (helper doble-escribe).
- Run migration `0009_phase31_expand.sql` con `--single-transaction --set ON_ERROR_STOP=1`.
- Validation step: las 5 queries SC#5 retornan 0.
- 24-48h soak antes de gatear a Wave 2.

**Plan 31-03 (Wave 2 — Deploy 2 switch):**

- Pre-flight: pg_dump full + validar las 5 queries SC#5 = 0.
- Backend deploy con rutas `:sku` antes de migration.
- Frontend deploy con `[sku]/editar` antes de migration.
- Run migration `0010_phase31_switch.sql`.
- Validation step: SC#1, SC#2, SC#3, SC#4, SC#5 (todos).
- E2E test: POST + capture webhook delivery + assert `sku` en payload.
- 24-48h soak.

**Plan 31-04 (Wave 3 — Deploy 3 contract):**

- Backend deploy con helper simplificado (no doble-escribe).
- Run migration `0011_phase31_contract.sql`.
- Final validation: SC#2 confirmado (articulo_codigo eliminado).
- Smoke: full stack rebuild + tests pasan.

### Sample inputs / outputs

**Pre-cutover (Deploy 1) — POST /api/articulos:**

```json
// Request
{ "codigo": "ABC-001", "nombre": "Producto X", "marca": "MarcaA" }

// Webhook delivery payload (delivery created, fire-and-forget)
{
  "event": "articulo.created",
  "articulo": {
    "codigo": "ABC-001",
    "sku": null,                    // ← antes del overwrite
    "nombre": "Producto X",
    "marca": "MarcaA",
    "unidades": 0,
    /* ... resto de campos */
  }
}
```

**Post-Deploy-1 — POST /api/articulos:**

```json
// Webhook delivery payload — sku ahora NOT NULL gracias al overwrite + helper en backend
{
  "event": "articulo.created",
  "articulo": {
    "codigo": "ABC-001",
    "sku": "ABC001", // ← stripSep('ABC-001') = 'ABC001'
    "nombre": "Producto X"
    /* ... */
  }
}
```

**Post-Deploy-2 — el payload tiene la misma forma, sku es ahora el PK canónico (D-09 = "v2 implícito").**

**Post-Deploy-2 — GET /api/articulos/by-codigo/ABC-001:**

```json
[
  {
    "codigo": "ABC-001",
    "sku": "ABC001",
    "nombre": "Producto X"
    /* ... */
  }
]
```

(En Phase 31 esto retorna 1 fila garantizado. En Phase 32 podría retornar N variantes.)

### Critical Failure Modes

| Modo de falla                                             | Cómo detectarlo                                                                                                                                                                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PK swap deja articulos sin PK**                         | `SELECT count(*) FROM information_schema.table_constraints WHERE table_name='articulos' AND constraint_type='PRIMARY KEY'` — debe ser 1                                                                                                                                  |
| **FK pointing a articulos.codigo persiste post-Deploy-2** | `SELECT conname FROM pg_constraint WHERE conrelid::regclass::text IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos') AND contype='f'` — todas las conames deben terminar en `_articulo_sku_fkey`, ninguna en `_articulo_codigo_fkey` |
| **Trigger queda DISABLED**                                | `SELECT tgenabled FROM pg_trigger WHERE tgname='trg_update_articulo_unidades'` — debe ser `'O'` (origin, enabled)                                                                                                                                                        |
| **articulos.unidades desincronizado**                     | `SELECT count(*) FROM articulos a LEFT JOIN (SELECT articulo_sku, SUM(cantidad) AS s FROM existencias GROUP BY articulo_sku) e ON e.articulo_sku=a.sku WHERE a.unidades != COALESCE(e.s, 0)` — debe ser 0                                                                |
| **Webhook payload v2 sin sku**                            | Insertar articulo via POST, esperar 5 seg, `SELECT payload->'articulo'->'sku' FROM webhook_deliveries ORDER BY created_at DESC LIMIT 1` — debe ser texto no-null                                                                                                         |
| **Drift schema.ts ↔ DB**                                  | `pnpm --filter backend typecheck` rompe O queries con drizzle retornan 500. Pre-detectar con `pnpm --filter backend db:studio` y comparar columnas                                                                                                                       |
| **Backend olvida double-write una ruta**                  | INSERT en cada hija via API + `SELECT count(*) FROM <hija> WHERE articulo_sku IS NULL ORDER BY id DESC LIMIT 10` post-insert — todos deben tener articulo_sku poblado                                                                                                    |

### Calendario de soak (proposed)

- **Día 1, 03:00 UTC-3:** Apply Deploy 1 (expand) — duración estimada <2 min (locks cortos, mayoría UPDATE).
- **Día 1 a Día 3 (24-48h):** Soak Deploy 1. Métricas a monitorear:
  - `count(*) WHERE articulo_sku IS NULL` en cada hija debe seguir en 0 tras N inserts.
  - Backend logs sin 500 nuevos asociados a writes en las 5 hijas.
  - `articulos.unidades` consistente con `SUM(existencias.cantidad)` (trigger sigue funcionando).
- **Día 3, 03:00 UTC-3:** Apply Deploy 2 (switch) — duración estimada 5-15 min (LOCK ACCESS EXCLUSIVE + recompute manual).
- **Día 3 a Día 5 (24-48h):** Soak Deploy 2. Métricas:
  - 5 queries SC#5 siguen retornando 0.
  - Frontend `/articulos/[sku]/editar` carga sin errores 404.
  - Webhook deliveries post-Deploy-2 tienen `payload.articulo.sku` no-null en 100% de los casos (sample auditando últimas N filas de `webhook_deliveries`).
- **Día 5, 03:00 UTC-3:** Apply Deploy 3 (contract) — duración estimada <1 min (DROP COLUMN x5).
- **Día 5 onward:** Phase 31 complete. Ready para Phase 32.

**Abort criteria entre deploys:**

- Cualquier SC# query retorna != 0 → halt, investigar, decidir rollback vs hotfix.
- Backend log error rate > baseline +20% → halt.
- Frontend 404 rate en `/articulos/*` aumenta significativamente → halt.

---

## Security Domain

| ASVS Category         | Applies           | Standard Control                                                                                                                |
| --------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| V2 Authentication     | yes (sin cambios) | Supabase JWT + CompositeAuthGuard heredado                                                                                      |
| V3 Session Management | no                | Phase 31 no toca auth                                                                                                           |
| V4 Access Control     | yes (heredado)    | RolesGuard `admin` para POST/PATCH/DELETE en `articulos.controller.ts` — se mantiene tras el rekey                              |
| V5 Input Validation   | yes               | DTOs (`UpdateArticuloDto`) ya validan; el nuevo `findByCodigo` no acepta body, solo `:codigo` path param — validación implícita |
| V6 Cryptography       | yes (heredado)    | Webhook HMAC sha256 mantiene la misma signature; secret no cambia                                                               |

**Threat patterns relevantes:**

| Pattern                                 | STRIDE                                      | Standard Mitigation                                                                                       |
| --------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| SQL injection en `:sku` path param      | Tampering                                   | Drizzle parameterized queries (eq() bindea automáticamente)                                               |
| Webhook payload tampering en tránsito   | Tampering                                   | HMAC sha256 con secret pre-shared (existente)                                                             |
| Bypass de RolesGuard al renombrar rutas | Elevation of Privilege                      | Los decorators `@UseGuards(RolesGuard) @Roles('admin')` migran inalterados al rekey de `:codigo` → `:sku` |
| FK orphan post-cutover                  | Information Disclosure (data inconsistency) | STEP 2 pre-check del 7-step transaction                                                                   |

---

## Sources

### Primary (HIGH confidence)

- `.planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-CONTEXT.md` — D-01..D-16 lockeadas
- `.planning/REQUIREMENTS.md` — VAR-10
- `.planning/research/PITFALLS.md` §P-01 lines 9-67 — 7-step ordered transaction (CANONICAL)
- `.planning/research/PITFALLS.md` §P-02 lines 69-115 — DISABLE TRIGGER + recompute pattern
- `.planning/research/PITFALLS.md` §P-05 lines 156-186 — preflight audit
- `.planning/research/PITFALLS.md` §P-19 lines 439-449 — webhook payload bump
- `apps/backend/src/db/schema.ts` lines 50-60, 96-106, 144-154, 179-259, 279-300, 361-386, 407-452 — esquema actual verificado
- `apps/backend/src/db/migrate-unidades.sql` lines 48-81 — trigger original (verificado)
- `apps/backend/drizzle/0008_phase30_templates.sql` — patrón de migration custom verificado
- `apps/backend/src/modules/articulos/articulos.controller.ts` y `articulos.service.ts` — rutas actuales verificadas
- `apps/backend/src/modules/webhooks/webhooks.service.ts:289-314` — `dispatchEvent` y `deliverWithRetry` verificados
- `packages/utils/src/composer.ts:35-37` — `stripSep` regex verificada (matches `[-_.\s]+`)
- `apps/backend/drizzle/meta/_journal.json` — journal con 9 entries (idx 0-8) confirmadas

### Secondary (MEDIUM confidence)

- `.planning/quick/260502-tqf-restore-selectivo-prod-erp-sanchez-16-ta/260502-tqf-SUMMARY.md` — pg_dump path patterns y restore patterns
- `.planning/quick/260428-mig-aplicar-migration-prod-pendiente/` — `--single-transaction --set ON_ERROR_STOP=1` pattern

### Tertiary (training data)

- Postgres semantics on `DROP CONSTRAINT ... CASCADE` + `ADD PRIMARY KEY` — comportamiento standard documentado en postgres docs
- `LOCK ACCESS EXCLUSIVE MODE` semantics — postgres docs

---

## Assumptions Log

| #   | Claim                                                                                                                                                                                        | Section                            | Risk if Wrong                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A1  | El path `/var/backups/erp_sanchez/phase31/` es escribible desde dentro del container postgres                                                                                                | §"Path y formato del pg_dump full" | Operador debe validar antes de Wave 0 y ajustar                                                                                                                                                                                                                                                                                                                                                                                                |
| A2  | El backend deploy puede coexistir con DB pre-migration (helper hace `articulosHelper.resolveSku()` que devuelve `articulos.sku` posiblemente null → el `NotFoundException` falla en runtime) | §"Backend changes Deploy 1"        | Verificar: en Deploy 1, el overwrite se aplica ANTES de que el backend nuevo procese tráfico. Order: (1) backend deploy old code; (2) migration corre; (3) backend deploy new code. PERO: la migration cambia el helper code que está en el binary del backend. Solución: el helper viejo (pre-Deploy-1) no existe; nuevo helper solo se invoca después del deploy. Asegurar que migration corre primero, después rolling restart del backend. |
| A3  | Drizzle `CREATE OR REPLACE FUNCTION` dentro de un `BEGIN..COMMIT` con `LOCK ACCESS EXCLUSIVE` no causa deadlock                                                                              | §"Deploy 2 STEP 6"                 | Validar en staging primero                                                                                                                                                                                                                                                                                                                                                                                                                     |
| A4  | `tgenabled = 'O'` es el estado correcto post-ENABLE (vs `'A'` always)                                                                                                                        | §"Validation post-cutover"         | Documentación postgres oficial: `'O'` = origin/enabled, `'D'` = disabled, `'R'` = replica, `'A'` = always                                                                                                                                                                                                                                                                                                                                      |
| A5  | El frontend prop `articuloCodigo` en imagen-slot.tsx/imagen-slot-grid.tsx se renombra a `articuloSku` en Deploy 2 sin romper otros callers                                                   | §"Frontend rekey punto 1"          | Grep verifies callers: solo `editar/page.tsx` lo usa (líneas 196, 203).                                                                                                                                                                                                                                                                                                                                                                        |
| A6  | El path `/api/articulos/by-codigo/:codigo` no entra en conflicto con `/api/articulos/:sku` por orden de match en NestJS                                                                      | §"Backend rekey changes Deploy 2"  | NestJS resuelve por path-specificity: rutas literales (`by-codigo`) ganan sobre parametrizadas (`:sku`). Pero si el orden de decorators importa, declararlas en orden literal → parametrizado para seguridad.                                                                                                                                                                                                                                  |
| A7  | Ningún suscriptor existente de webhooks lee `payload.articulo.sku` esperando que sea NULL (lo trataría como bug pre-v2)                                                                      | §"Webhook payload v2"              | Suscriptores actuales: hay 0 webhooks activos en prod (verificable via `SELECT count(*) FROM webhooks WHERE revoked_at IS NULL`). Si emergen suscriptores antes del cutover, comunicar D-10 notice.                                                                                                                                                                                                                                            |

---

## Environment Availability

| Dependency                    | Required By                                            | Available         | Version        | Fallback |
| ----------------------------- | ------------------------------------------------------ | ----------------- | -------------- | -------- |
| Docker + container `postgres` | pg_dump, psql commands                                 | ✓ (asumido)       | —              | —        |
| PostgreSQL ≥ 13               | `regexp_replace`, `DO $$ ... $$`, `pg_trigger_depth()` | ✓ (prod corre PG) | —              | —        |
| psql client                   | apply migrations                                       | ✓                 | —              | —        |
| pg_dump                       | safety net                                             | ✓                 | —              | —        |
| Drizzle ORM ≥ 0.30            | migration files con `--> statement-breakpoint`         | ✓                 | desde Phase 29 | —        |
| Node.js ≥ 18                  | backend NestJS                                         | ✓                 | —              | —        |
| pnpm + turborepo              | monorepo build                                         | ✓                 | —              | —        |

**Missing dependencies with no fallback:** Ninguno identificado.

**Missing dependencies with fallback:** Ninguno identificado.

---

## State of the Art

| Old Approach                                | Current Approach                                                                     | When Changed                                  | Impact                                   |
| ------------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------- |
| `db:push --force` para sync schema con prod | `drizzle-kit migrate` con .sql custom y `--single-transaction --set ON_ERROR_STOP=1` | 2026-05-01 (incidente 260502-tqf)             | NUNCA usar `db:push --force` contra prod |
| Trigger function rewrite via DROP + CREATE  | `CREATE OR REPLACE FUNCTION` con mismo nombre                                        | 2026-04-29 (quick 260429-rec)                 | Sin necesidad de re-attach trigger       |
| Schema TS desync con DB                     | Schema TS + migration .sql + journal commit atómico                                  | 2026-05-15 (feedback_schema_drift_silencioso) | Cada migration commit obligatorio sync   |

---

## Open Questions

Ninguna abierta a nivel research. Las 7 áreas de Claude's Discretion están cerradas con propuesta concreta en §"Open Decisions Closed By Research" — el planner las traduce a plan checkpoints sin necesidad de re-research.

---

## Metadata

**Confidence breakdown:**

- Standard stack (Drizzle, NestJS, postgres): HIGH — todo verificado contra código existente
- 7-step ordered transaction adaptado: HIGH — sigue P-01 literalmente con nombres de columnas verificados
- File inventory (frontend rekey): HIGH — grep audit completo de `articulo.codigo` y `articuloCodigo` ejecutado
- Trigger rewrite SQL: HIGH — basado en migrate-unidades.sql actual + P-02 pattern
- pg_dump path: MEDIUM — `/var/backups/erp_sanchez/phase31/` propuesto consistente con `/opt/backup/postgres/erp_sanchez/` existente, pero requiere validación de operador
- Calendario 24-48h soak: MEDIUM — propuesto pero requiere aprobación del usuario antes del cutover real (Claude's Discretion #2)

**Research date:** 2026-05-18
**Valid until:** 2026-06-17 (30 días — esquema y patrones estables)

---

## RESEARCH COMPLETE

**Phase:** 31 — PK Swap codigo→sku + FK rename en comprobantes
**Confidence:** HIGH

### Key Findings

1. **Overwrite `articulos.sku := stripSep(codigo)` va en Deploy 1** (no Deploy 2). Desacopla el cambio de datos del PK swap, simplifica el backfill de hijas, y permite que las 5 queries SC#5 validen el sku canónico durante los 24-48h de soak.
2. **El 7-step ordered transaction de P-01 se traduce literalmente** al esquema actual: 6 tablas con LOCK ACCESS EXCLUSIVE, DROP CONSTRAINT articulos_pkey CASCADE elimina las 5 FKs viejas en un shot, re-ADD FKs sobre `articulos.sku`, DISABLE/REPLACE FUNCTION/recompute/ENABLE para el trigger. La PK compuesta de existencias y el unique index de inventarios_articulos requieren DROP + CREATE explícitos dentro de la misma transacción.
3. **El webhook payload v2 es bump semántico, no estructural** — `articulos.service.ts:105/121/139/157` ya emite el `articulo` completo desde Drizzle; el campo `sku` aparece automáticamente cuando se popula la columna en Deploy 1.
4. **Backend doble-escribe centralizado en `ArticulosHelper.resolveSku()`** — un solo punto de derivación sku desde codigo, inyectado en existencias.service, inventarios.service, seed y los 5 generators. Elimina el riesgo de drift entre rutas.
5. **3 migrations Drizzle custom (0009/0010/0011) + 3 journal entries + 3 schema.ts commits atómicos** — patrón establecido desde quick 260428-mig + lección feedback_schema_drift_silencioso.

### File Created

`.planning/phases/31-pk-swap-codigo-sku-fk-rename-en-comprobantes/31-RESEARCH.md`

### Confidence Assessment

| Area                                       | Level  | Reason                                                                                    |
| ------------------------------------------ | ------ | ----------------------------------------------------------------------------------------- |
| 7-step SQL (Deploy 2)                      | HIGH   | Adaptado de P-01 con nombres exactos del schema actual                                    |
| Backend changes (helper, controller rekey) | HIGH   | Grep audit completo + paths verificados                                                   |
| Frontend rekey inventory                   | HIGH   | Grep audit `articulo.codigo` + `articuloCodigo` arrojó 53 hits, todos clasificados        |
| Trigger rewrite                            | HIGH   | Basado en migrate-unidades.sql actual con cambio mecánico de columna                      |
| Webhook payload v2                         | HIGH   | Verificado que `articulo` ya es la fila completa de Drizzle (sku aparece automáticamente) |
| pg_dump path                               | MEDIUM | Operador valida el mount path antes de Wave 0                                             |
| Calendario soak                            | MEDIUM | Propuesto; usuario aprueba antes del cutover real                                         |

### Open Questions

Ninguna abierta. Las 7 áreas de Claude's Discretion están cerradas con propuesta concreta en §"Open Decisions Closed By Research".

### Ready for Planning

Research complete. El planner puede crear `31-PLAN.md` con 4 Waves:

- Wave 0: Preflight + Safety Net (audit script + pg_dump + validation script + tests skeleton)
- Wave 1: Deploy 1 expand (backend helper + doble-escribe + migration 0009)
- Wave 2: Deploy 2 switch (7-step transaction + backend rekey + frontend rekey + notice webhooks)
- Wave 3: Deploy 3 contract (drop articulo_codigo + cleanup helper + types)
