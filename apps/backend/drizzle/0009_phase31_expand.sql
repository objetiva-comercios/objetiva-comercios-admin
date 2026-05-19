-- Migration 0009: Phase 31 Deploy 1 (expand)
-- Origen: Phase 31 (PK Swap codigo→sku + FK rename en comprobantes)
-- Decisiones cerradas aplicadas: D-01 (preflight informativo), D-02 (overwrite ciego),
--   D-05 (3 deploys expand→switch→contract), D-06 (backend doble-escribe durante coexistencia)
-- Fórmula codigoToSku (D-17, sobreescribe stripSep de Phase 29 D-12):
--   TypeScript: codigo.replace(/-/g, '_').replace(/\s+/g, '~')
--   SQL: regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g')
-- Apply: psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0009_phase31_expand.sql
-- Pre-flight: 31-PREFLIGHT-AUDIT.md generado (informativo, non-blocking)
-- Pre-flight: pg_dump full safety net en /var/backups/erp_sanchez/phase31/pre_deploy1_<TS>.dump
-- Backend MUST be deployed BEFORE this migration runs in prod (helper doble-escribe).
-- Threats mitigados: T-31-04 (FK orphan post-Deploy-1), T-31-05 (Backend olvida double-write)
-- Journal: _journal.json idx=9, tag="0009_phase31_expand"

-- ─── STEP 1: OVERWRITE articulos.sku := codigoToSku(codigo) ──────────────────
-- D-17: nueva fórmula reemplaza '-' por '_' y whitespace por '~'.
-- Produce 0 colisiones sobre la base actual (verificado en 31-SKU-COLLISIONS.md).
-- WHERE clause: solo actualiza filas donde sku es distinto del valor calculado (idempotente).
UPDATE articulos
SET sku = regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g'),
    actualizado = now()
WHERE sku IS DISTINCT FROM regexp_replace(regexp_replace(codigo, '-', '_', 'g'), '[[:space:]]+', '~', 'g');--> statement-breakpoint

DO $$
DECLARE v_null int; v_dupes int;
BEGIN
  SELECT count(*) INTO v_null FROM articulos WHERE sku IS NULL;
  IF v_null > 0 THEN
    RAISE EXCEPTION 'Post-overwrite: % filas con sku NULL — abortar', v_null;
  END IF;
  SELECT count(*) - count(DISTINCT sku) INTO v_dupes FROM articulos;
  IF v_dupes > 0 THEN
    RAISE WARNING 'Post-overwrite: % duplicados en articulos.sku — el PK swap de Deploy 2 va a fallar; escalar antes de continuar', v_dupes;
  END IF;
END $$;--> statement-breakpoint

-- ─── STEP 2: AGREGAR articulo_sku TEXT nullable en las 5 hijas ───────────────
ALTER TABLE order_items           ADD COLUMN IF NOT EXISTS articulo_sku text;--> statement-breakpoint
ALTER TABLE sale_items            ADD COLUMN IF NOT EXISTS articulo_sku text;--> statement-breakpoint
ALTER TABLE purchase_items        ADD COLUMN IF NOT EXISTS articulo_sku text;--> statement-breakpoint
ALTER TABLE existencias           ADD COLUMN IF NOT EXISTS articulo_sku text;--> statement-breakpoint
ALTER TABLE inventarios_articulos ADD COLUMN IF NOT EXISTS articulo_sku text;--> statement-breakpoint

-- ─── STEP 3: BACKFILL <hija>.articulo_sku := articulos.sku via JOIN ──────────
-- Orden: overwrite primero (STEP 1), luego backfill — garantiza que las hijas
-- copian el sku ya canónico y no valores stale o NULL.
UPDATE order_items           oi  SET articulo_sku = a.sku FROM articulos a WHERE oi.articulo_codigo  = a.codigo AND oi.articulo_sku  IS NULL;--> statement-breakpoint
UPDATE sale_items            si  SET articulo_sku = a.sku FROM articulos a WHERE si.articulo_codigo  = a.codigo AND si.articulo_sku  IS NULL;--> statement-breakpoint
UPDATE purchase_items        pi  SET articulo_sku = a.sku FROM articulos a WHERE pi.articulo_codigo  = a.codigo AND pi.articulo_sku  IS NULL;--> statement-breakpoint
UPDATE existencias           e   SET articulo_sku = a.sku FROM articulos a WHERE e.articulo_codigo   = a.codigo AND e.articulo_sku   IS NULL;--> statement-breakpoint
UPDATE inventarios_articulos ia  SET articulo_sku = a.sku FROM articulos a WHERE ia.articulo_codigo  = a.codigo AND ia.articulo_sku  IS NULL;--> statement-breakpoint

-- ─── STEP 4: ÍNDICES en articulo_sku ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS order_items_articulo_sku_idx          ON order_items(articulo_sku);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS sale_items_articulo_sku_idx           ON sale_items(articulo_sku);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS purchase_items_articulo_sku_idx       ON purchase_items(articulo_sku);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS existencias_articulo_sku_idx          ON existencias(articulo_sku);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS inv_articulos_articulo_sku_idx        ON inventarios_articulos(articulo_sku);--> statement-breakpoint

-- ─── STEP 5: VALIDACIONES POST-BACKFILL ──────────────────────────────────────
-- Verifica que las 5 hijas tienen articulo_sku 100% poblado.
-- RAISE EXCEPTION aborta la transacción si alguna hija tiene NULLs (T-31-04).
DO $$
DECLARE v_count int; v_table text;
BEGIN
  FOR v_table IN SELECT unnest(ARRAY['order_items','sale_items','purchase_items','existencias','inventarios_articulos']) LOOP
    EXECUTE format('SELECT count(*) FROM %I WHERE articulo_sku IS NULL', v_table) INTO v_count;
    IF v_count > 0 THEN
      RAISE EXCEPTION 'Backfill incompleto en %: % filas con articulo_sku NULL', v_table, v_count;
    END IF;
  END LOOP;
  RAISE NOTICE 'Backfill OK: 5 hijas con articulo_sku 100%% poblado';
END $$;
