-- =============================================================================
-- migrate-unidades.sql
-- Migra articulos.unidades -> existencias para deposito principal (id=1)
-- Crea trigger PG para mantener articulos.unidades como campo calculado
--
-- Ejecutar con:
--   docker exec -i postgres psql -U usuario -d database < migrate-unidades.sql
--
-- Idempotente: seguro de re-ejecutar multiples veces
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. PRE-CHECK: Verificar que el deposito principal (id=1) existe
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM depositos WHERE id = 1) THEN
    RAISE EXCEPTION 'Deposito principal (id=1) no encontrado. Abortando migracion.';
  END IF;
  RAISE NOTICE 'OK: Deposito principal (id=1) encontrado.';
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. MIGRAR DATOS: articulos.unidades -> existencias para deposito_id=1
--    Solo articulos con unidades > 0
--    ON CONFLICT hace idempotente (seguro de re-ejecutar)
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO existencias (articulo_codigo, deposito_id, cantidad, stock_minimo, stock_maximo, updated_at)
SELECT
  a.codigo,
  1,                -- deposito principal hardcoded
  a.unidades,
  0,                -- stock_minimo: sin dato a migrar
  0,                -- stock_maximo: sin dato a migrar
  NOW()
FROM articulos a
WHERE a.unidades > 0
ON CONFLICT (articulo_codigo, deposito_id)
DO UPDATE SET
  cantidad = EXCLUDED.cantidad,
  updated_at = NOW();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. CREAR TRIGGER FUNCTION: update_articulo_unidades()
--    Recalcula articulos.unidades = SUM(existencias.cantidad) cada vez que
--    cambia la tabla existencias
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_articulo_unidades()
RETURNS TRIGGER AS $$
DECLARE
  target_codigo TEXT;
BEGIN
  -- Determinar cual articulo_codigo fue afectado
  IF TG_OP = 'DELETE' THEN
    target_codigo := OLD.articulo_codigo;
  ELSE
    target_codigo := NEW.articulo_codigo;
  END IF;

  -- Actualizar la suma denormalizada
  UPDATE articulos
  SET unidades = COALESCE((
    SELECT SUM(cantidad) FROM existencias
    WHERE articulo_codigo = target_codigo
  ), 0)
  WHERE codigo = target_codigo;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. CREAR TRIGGER en tabla existencias
--    DROP IF EXISTS para idempotencia
-- ─────────────────────────────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_update_articulo_unidades ON existencias;

CREATE TRIGGER trg_update_articulo_unidades
AFTER INSERT OR UPDATE OF cantidad OR DELETE ON existencias
FOR EACH ROW
EXECUTE FUNCTION update_articulo_unidades();

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RECALCULAR TODOS los articulos.unidades
--    Sincroniza TODOS los articulos (no solo los migrados)
--    Articulos sin existencias quedan en 0
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE articulos
SET unidades = COALESCE((
  SELECT SUM(cantidad) FROM existencias
  WHERE articulo_codigo = articulos.codigo
), 0);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. VERIFICACIONES FINALES
-- ─────────────────────────────────────────────────────────────────────────────

-- 6a. Cantidad de registros en existencias para deposito principal
SELECT COUNT(*) AS existencias_deposito_principal
FROM existencias
WHERE deposito_id = 1;

-- 6b. Cantidad de articulos con unidades > 0
SELECT COUNT(*) AS articulos_con_unidades
FROM articulos
WHERE unidades > 0;

-- 6c. Verificar consistencia: articulos donde unidades != SUM(existencias)
-- El resultado debe ser 0 filas
SELECT
  a.codigo,
  a.unidades AS unidades_articulo,
  COALESCE(e.total, 0) AS suma_existencias
FROM articulos a
LEFT JOIN (
  SELECT articulo_codigo, SUM(cantidad) AS total
  FROM existencias
  GROUP BY articulo_codigo
) e ON e.articulo_codigo = a.codigo
WHERE a.unidades != COALESCE(e.total, 0);
