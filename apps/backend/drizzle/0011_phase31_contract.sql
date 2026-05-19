-- Migration 0011: Phase 31 Deploy 3 (contract) — drop articulo_codigo de las 5 hijas
-- Pre-flight: 24-48h post-Deploy-2 sin regresiones (gate cumplido: pre_deploy3 dump OK)
-- Pre-flight: backend deploy con DTOs renombrados (articuloSku) y consumidores simplificados
-- Apply: cat apps/backend/drizzle/0011_phase31_contract.sql | docker exec -i postgres psql --single-transaction --set ON_ERROR_STOP=1 -U sanchez -d erp_sanchez
-- Refs: D-08, D-13. Threats mitigated: T-31-20, T-31-21.

-- ─── Lock ACCESS EXCLUSIVE en las 5 hijas ────────────────────────────────────
LOCK TABLE order_items, sale_items, purchase_items, existencias, inventarios_articulos
  IN ACCESS EXCLUSIVE MODE;
--> statement-breakpoint

-- ─── DROP indices articulo_codigo (defensive — IF EXISTS cubre los que no existan) ─
DROP INDEX IF EXISTS order_items_articulo_codigo_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS sale_items_articulo_codigo_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS purchase_items_articulo_codigo_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS existencias_articulo_codigo_idx;
--> statement-breakpoint
DROP INDEX IF EXISTS inv_articulos_articulo_codigo_idx;
--> statement-breakpoint

-- ─── DROP COLUMN articulo_codigo en las 5 hijas ──────────────────────────────
ALTER TABLE order_items DROP COLUMN IF EXISTS articulo_codigo;
--> statement-breakpoint
ALTER TABLE sale_items DROP COLUMN IF EXISTS articulo_codigo;
--> statement-breakpoint
ALTER TABLE purchase_items DROP COLUMN IF EXISTS articulo_codigo;
--> statement-breakpoint
ALTER TABLE existencias DROP COLUMN IF EXISTS articulo_codigo;
--> statement-breakpoint
ALTER TABLE inventarios_articulos DROP COLUMN IF EXISTS articulo_codigo;
--> statement-breakpoint

-- ─── Validación final post-Deploy-3 ──────────────────────────────────────────
DO $$ DECLARE v_count int; BEGIN
  SELECT count(*) INTO v_count FROM information_schema.columns
  WHERE table_name IN ('order_items','sale_items','purchase_items','existencias','inventarios_articulos')
    AND column_name = 'articulo_codigo';
  IF v_count != 0 THEN RAISE EXCEPTION 'Deploy 3 incompleto: % columnas articulo_codigo persisten', v_count; END IF;
  RAISE NOTICE 'Deploy 3 (contract) OK: articulo_codigo eliminado de las 5 hijas';
END $$;
