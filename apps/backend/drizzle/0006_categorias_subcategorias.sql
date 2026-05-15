-- Migration 0006: agregar categoria/subcategoria a articulos + crear catalogos prop_categoria/prop_subcategoria
-- Origen: bug detectado 2026-05-15. Schema TS tenia categoria/subcategoria en articulos desde quick task 260319-od3
-- pero las columnas nunca se agregaron a DB. Endpoint /articulos devolvia 500 ("column categoria does not exist").
--
-- Alineado con Phase 29 (catalogos-de-atributos): mismo schema minimo, mismos nombres de constraints/indexes.
-- Nuevo: subcategoria depende de categoria (FK categoria_id ON DELETE RESTRICT).
--
-- Aplicar con: psql --single-transaction --set ON_ERROR_STOP=1 -f 0006_categorias_subcategorias.sql

ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "categoria" text;--> statement-breakpoint
ALTER TABLE "articulos" ADD COLUMN IF NOT EXISTS "subcategoria" text;--> statement-breakpoint
CREATE TABLE "prop_categoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_categoria_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);--> statement-breakpoint
CREATE TABLE "prop_subcategoria" (
	"id" serial PRIMARY KEY NOT NULL,
	"categoria_id" integer NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_subcategoria_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$'),
	CONSTRAINT "prop_subcategoria_categoria_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "prop_categoria"("id") ON DELETE RESTRICT
);--> statement-breakpoint
CREATE UNIQUE INDEX "prop_categoria_nombre_lower_uniq" ON "prop_categoria" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_categoria_abrev_uniq" ON "prop_categoria" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_categoria_activo_idx" ON "prop_categoria" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_subcategoria_nombre_lower_uniq" ON "prop_subcategoria" USING btree ("categoria_id", lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_subcategoria_abrev_uniq" ON "prop_subcategoria" USING btree ("categoria_id", "abrev");--> statement-breakpoint
CREATE INDEX "prop_subcategoria_categoria_id_idx" ON "prop_subcategoria" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "prop_subcategoria_activo_idx" ON "prop_subcategoria" USING btree ("activo");
