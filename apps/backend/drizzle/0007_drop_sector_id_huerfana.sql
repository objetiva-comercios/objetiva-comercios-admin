-- Migration 0007: drop inventarios_articulos.sector_id (columna huerfana legacy)
-- Origen: residual de quick task 260429-rec donde sector_id fue reemplazada por columna.
-- La columna nunca se uso en codigo y tiene 0 filas con valor no-null.
-- Documentada en .planning/2026-05-15-REPORTE-HECHO-VS-FALTANTE.md seccion 5.2.

ALTER TABLE "inventarios_articulos" DROP COLUMN IF EXISTS "sector_id";
