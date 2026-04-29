-- Manual migration applied 2026-04-29 to align production DB with schema.ts after refactor c735e9c1
-- (replace sectorId with columna). Was missing from the regenerated migration-prod.sql.
-- Idempotent: safe to re-run.
ALTER TABLE "inventarios_articulos" ADD COLUMN IF NOT EXISTS "columna" integer;
