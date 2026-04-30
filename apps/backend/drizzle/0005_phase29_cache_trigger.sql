-- 0005_phase29_cache_trigger.sql
-- Generado vía `drizzle-kit generate --custom --name=phase29_cache_trigger`
-- Phase 29 deja preparado el SQL del trigger de cache de nombre pero NO lo crea.
-- Phase 30/31 reactivará este bloque cuando articulos.<prop>_id exista como FK.
-- Si se prefiere aplicar el SQL como no-op desde ya, descomentar TODO el bloque.
--
-- Decisión: D-02 (CONTEXT.md) — trigger preparado pero NO conectado a articulos.
-- Pitfall mitigado: P-11 (PITFALLS.md milestone) — denorm trigger silent failure.
-- Si el trigger se activa antes de que articulos.<prop>_id exista, el UPDATE
-- en articulos fallará con `column "<prop>_id" does not exist`. Por eso queda
-- comentado hasta que Phase 30/31 cree las FK fuente.
--
-- Idempotencia: este archivo es un no-op SQL (solo comentarios) — safe to re-run.

-- -----------------------------------------------------------------------------
-- BLOQUE COMENTADO — activar en Phase 30/31
-- -----------------------------------------------------------------------------
/*
CREATE OR REPLACE FUNCTION cache_nombre_prop()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actuar si el nombre cambió.
  IF NEW.nombre IS DISTINCT FROM OLD.nombre THEN
    EXECUTE format(
      'UPDATE articulos SET %I = $1 WHERE %I = $2',
      TG_ARGV[0],          -- nombre de columna cache (ej: 'marca')
      TG_ARGV[1]           -- nombre de columna FK    (ej: 'marca_id')
    ) USING NEW.nombre, NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prop_marca_cache_nombre
  AFTER UPDATE OF nombre ON prop_marca
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('marca', 'marca_id');

CREATE TRIGGER trg_prop_color_cache_nombre
  AFTER UPDATE OF nombre ON prop_color
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('color', 'color_id');

CREATE TRIGGER trg_prop_talle_cache_nombre
  AFTER UPDATE OF nombre ON prop_talle
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('talle', 'talle_id');

CREATE TRIGGER trg_prop_material_cache_nombre
  AFTER UPDATE OF nombre ON prop_material
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('material', 'material_id');

CREATE TRIGGER trg_prop_presentacion_cache_nombre
  AFTER UPDATE OF nombre ON prop_presentacion
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('presentacion', 'presentacion_id');

CREATE TRIGGER trg_prop_objeto_cache_nombre
  AFTER UPDATE OF nombre ON prop_objeto
  FOR EACH ROW EXECUTE FUNCTION cache_nombre_prop('objeto', 'objeto_id');
*/
