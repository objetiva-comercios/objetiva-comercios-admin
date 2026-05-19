-- Migration 0010: Phase 31 Deploy 2 (switch) — PK swap + FK rebuild + trigger rewrite
-- 9-step ordered transaction con LOCK ACCESS EXCLUSIVE (PITFALLS P-01, lineas 28-67)
--
-- Pre-flight (obligatorio antes de aplicar):
--   1. pg_dump full en /var/backups/erp_sanchez/phase31/pre_deploy2_<TS>.dump (D-04)
--      Dump disponible: /var/backups/erp_sanchez/phase31/pre_deploy2_20260519_025855.dump
--   2. Las 5 queries SC#5 deben retornar 0 (gate D-07): bash scripts/phase31-validation.sh integrity
--   3. 24-48h de soak desde Deploy 1 sin regresiones
--
-- Apply command:
--   cat apps/backend/drizzle/0010_phase31_switch.sql | \
--     docker exec -i postgres psql --single-transaction --set ON_ERROR_STOP=1 -U sanchez -d erp_sanchez
--
-- Referencias: D-08 (atomic commit schema+sql+journal), D-13 (recompute manual pre-ENABLE),
--              D-14 (CREATE OR REPLACE mantiene mismo nombre), D-15 (WHEN clause sin cambio),
--              P-01 (9-step ordered transaction), P-02 (DISABLE/recompute/ENABLE pattern)

-- ─── STEP 1 — Lock ACCESS EXCLUSIVE en las 6 tablas afectadas ────────────────
LOCK TABLE articulos, order_items, sale_items, purchase_items, existencias, inventarios_articulos
  IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint

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
--> statement-breakpoint

-- ─── STEP 3 — DISABLE TRIGGER trg_update_articulo_unidades (D-13, P-02 capa 1) ──
ALTER TABLE existencias DISABLE TRIGGER trg_update_articulo_unidades;
--> statement-breakpoint

-- ─── STEP 4 — DROP old PK + ADD new PK + alterar codigo a NOT NULL drop ──────
--     CASCADE elimina automaticamente las 5 FKs hijas hacia articulos.codigo.
ALTER TABLE articulos DROP CONSTRAINT articulos_pkey CASCADE;
--> statement-breakpoint
ALTER TABLE articulos ALTER COLUMN sku SET NOT NULL;
--> statement-breakpoint
ALTER TABLE articulos ADD CONSTRAINT articulos_pkey PRIMARY KEY (sku);
--> statement-breakpoint
ALTER TABLE articulos ALTER COLUMN codigo DROP NOT NULL;
--> statement-breakpoint

--   Cambiar el index existente articulos_sku_idx (no unique) → DROP (porque sku es PK ahora).
--   Crear index nuevo articulos_codigo_idx (no unique) para queries by-codigo (Phase 32).
DROP INDEX IF EXISTS articulos_sku_idx;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS articulos_codigo_idx ON articulos(codigo);
--> statement-breakpoint

-- ─── STEP 5 — Re-ADD FKs en las 5 hijas apuntando a articulos.sku ────────────
-- existencias ya tenia primary key compuesta (articulo_codigo, deposito_id) — la PK CASCADE
--   con DROP del PK de articulos NO eliminó la PK compuesta de existencias (solo eliminó la FK).
-- Hay que cambiar la PK compuesta de existencias a (articulo_sku, deposito_id).

-- 5.1 existencias: cambiar PK compuesta
ALTER TABLE existencias DROP CONSTRAINT existencias_pkey;
--> statement-breakpoint
ALTER TABLE existencias ALTER COLUMN articulo_sku SET NOT NULL;
--> statement-breakpoint
ALTER TABLE existencias ADD CONSTRAINT existencias_pkey PRIMARY KEY (articulo_sku, deposito_id);
--> statement-breakpoint

-- 5.2 inventarios_articulos: cambiar UNIQUE INDEX (inventario_id, articulo_codigo) → (inventario_id, articulo_sku)
DROP INDEX IF EXISTS inv_articulos_unique_idx;
--> statement-breakpoint
ALTER TABLE inventarios_articulos ALTER COLUMN articulo_sku SET NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX inv_articulos_unique_idx ON inventarios_articulos(inventario_id, articulo_sku);
--> statement-breakpoint

-- 5.3 Las otras 3 hijas: solo NOT NULL + FK
ALTER TABLE order_items     ALTER COLUMN articulo_sku SET NOT NULL;
--> statement-breakpoint
ALTER TABLE sale_items      ALTER COLUMN articulo_sku SET NOT NULL;
--> statement-breakpoint
ALTER TABLE purchase_items  ALTER COLUMN articulo_sku SET NOT NULL;
--> statement-breakpoint

-- 5.4 Re-ADD FK en las 5 hijas (CASCADE drop del PK ya eliminó las viejas)
ALTER TABLE order_items
  ADD CONSTRAINT order_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
--> statement-breakpoint

ALTER TABLE sale_items
  ADD CONSTRAINT sale_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
--> statement-breakpoint

ALTER TABLE purchase_items
  ADD CONSTRAINT purchase_items_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
--> statement-breakpoint

ALTER TABLE existencias
  ADD CONSTRAINT existencias_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
--> statement-breakpoint

ALTER TABLE inventarios_articulos
  ADD CONSTRAINT inventarios_articulos_articulo_sku_fkey
  FOREIGN KEY (articulo_sku) REFERENCES articulos(sku) ON UPDATE CASCADE ON DELETE RESTRICT;
--> statement-breakpoint

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
--> statement-breakpoint

-- ─── STEP 7 — Recompute manual articulos.unidades (P-02 capa 1) ──────────────
-- Con la función ya reemplazada y trigger todavía deshabilitado, recompute O(n).
UPDATE articulos a
SET unidades = COALESCE((
  SELECT SUM(e.cantidad) FROM existencias e WHERE e.articulo_sku = a.sku
), 0);
--> statement-breakpoint

-- ─── STEP 8 — ENABLE TRIGGER ─────────────────────────────────────────────────
-- WHEN clause se mantiene (D-15): AFTER INSERT OR UPDATE OF cantidad OR DELETE.
-- El trigger existente todavía apunta a la misma function update_articulo_unidades()
--   que ya reemplazamos en STEP 6 — no necesitamos DROP TRIGGER + CREATE TRIGGER.
ALTER TABLE existencias ENABLE TRIGGER trg_update_articulo_unidades;
--> statement-breakpoint

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
