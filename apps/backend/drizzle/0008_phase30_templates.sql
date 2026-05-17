-- Migration 0008: Phase 30 — Templates de composicion SKU/Nombre + taxonomia 3er nivel
-- Origen: Phase 30 (templates-composici-n-sku-nombre), Plan 02 (Wave 1 — schema migration)
--
-- Alcance:
--   1) Crear 4 tablas nuevas:
--      - prop_familia        (3er nivel taxonomia, FK a prop_subcategoria, D-08)
--      - prop_aplicacion     (catalogo plano, factory definePropTable)
--      - articulos_templates (catalogo de templates de composicion)
--      - template_atributos  (recetas de SKU/Nombre por atributo, PK compuesta)
--   2) Agregar 5 columnas a articulos:
--      - familia, template_id, custom_1, custom_2, custom_3
--   3) Drop 8 columnas legacy de articulos (D-03: 0 filas non-null, verificado):
--      - rubro, subrubro, adjetivo, prop_aux_1..5
--   4) Seed: template "default" (D-13/D-14/D-15) con receta automotor
--      [objeto, marca, modelo, medida, custom_1] sin receta SKU (orden_sku=NULL).
--
-- Pre-flight realizado por operador (unattended 2026-05-17):
--   - Backup server-side: backups.articulos_pre_phase30 (101.021 filas / 41 MB)
--   - Verificacion COUNT(*) WHERE rubro IS NOT NULL OR ... = 0
--   - Journal current entries length: 8 (idx 0..7)
--
-- Aplicar con:
--   psql --single-transaction --set ON_ERROR_STOP=1 "$DATABASE_URL" -f 0008_phase30_templates.sql
--
-- Refs: TPL-01, TPL-05. Threats mitigados: T-30-01, T-30-04.

CREATE TABLE "prop_familia" (
	"id" serial PRIMARY KEY NOT NULL,
	"subcategoria_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_familia_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$'),
	CONSTRAINT "prop_familia_subcategoria_id_fk" FOREIGN KEY ("subcategoria_id") REFERENCES "prop_subcategoria"("id") ON DELETE RESTRICT
);--> statement-breakpoint
CREATE TABLE "prop_aplicacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_aplicacion_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);--> statement-breakpoint
CREATE TABLE "articulos_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "articulos_templates_nombre_unique" UNIQUE ("nombre")
);--> statement-breakpoint
CREATE TABLE "template_atributos" (
	"template_id" integer NOT NULL,
	"atributo_tipo" text NOT NULL,
	"orden_nombre" integer,
	"orden_sku" integer,
	"es_variante" boolean DEFAULT false NOT NULL,
	"custom_slot" integer,
	CONSTRAINT "template_atributos_pkey" PRIMARY KEY ("template_id", "atributo_tipo"),
	CONSTRAINT "template_atributos_template_id_fk" FOREIGN KEY ("template_id") REFERENCES "articulos_templates"("id") ON DELETE CASCADE
);--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "familia" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "template_id" integer REFERENCES "articulos_templates"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_1" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_2" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "custom_3" text;--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "rubro";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "subrubro";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "adjetivo";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_1";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_2";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_3";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_4";--> statement-breakpoint
ALTER TABLE "articulos" DROP COLUMN IF EXISTS "prop_aux_5";--> statement-breakpoint
CREATE UNIQUE INDEX "prop_familia_nombre_lower_uniq" ON "prop_familia" USING btree ("subcategoria_id", lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_familia_abrev_uniq" ON "prop_familia" USING btree ("subcategoria_id", "abrev");--> statement-breakpoint
CREATE INDEX "prop_familia_subcategoria_id_idx" ON "prop_familia" USING btree ("subcategoria_id");--> statement-breakpoint
CREATE INDEX "prop_familia_activo_idx" ON "prop_familia" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_aplicacion_nombre_lower_uniq" ON "prop_aplicacion" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_aplicacion_abrev_uniq" ON "prop_aplicacion" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_aplicacion_activo_idx" ON "prop_aplicacion" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "articulos_templates_activo_idx" ON "articulos_templates" USING btree ("activo");--> statement-breakpoint
CREATE INDEX "template_atributos_template_id_idx" ON "template_atributos" USING btree ("template_id");--> statement-breakpoint
INSERT INTO "articulos_templates" ("nombre", "descripcion", "activo")
VALUES ('default', 'Template automotor por defecto (Phase 30)', true)
ON CONFLICT ("nombre") DO NOTHING;--> statement-breakpoint
INSERT INTO "template_atributos" ("template_id", "atributo_tipo", "orden_nombre", "orden_sku", "es_variante", "custom_slot")
SELECT id, 'objeto', 1, NULL, false, NULL FROM "articulos_templates" WHERE "nombre" = 'default'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "template_atributos" ("template_id", "atributo_tipo", "orden_nombre", "orden_sku", "es_variante", "custom_slot")
SELECT id, 'marca', 2, NULL, false, NULL FROM "articulos_templates" WHERE "nombre" = 'default'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "template_atributos" ("template_id", "atributo_tipo", "orden_nombre", "orden_sku", "es_variante", "custom_slot")
SELECT id, 'modelo', 3, NULL, false, NULL FROM "articulos_templates" WHERE "nombre" = 'default'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "template_atributos" ("template_id", "atributo_tipo", "orden_nombre", "orden_sku", "es_variante", "custom_slot")
SELECT id, 'medida', 4, NULL, false, NULL FROM "articulos_templates" WHERE "nombre" = 'default'
ON CONFLICT DO NOTHING;--> statement-breakpoint
INSERT INTO "template_atributos" ("template_id", "atributo_tipo", "orden_nombre", "orden_sku", "es_variante", "custom_slot")
SELECT id, 'custom_1', 5, NULL, false, 1 FROM "articulos_templates" WHERE "nombre" = 'default'
ON CONFLICT DO NOTHING;
