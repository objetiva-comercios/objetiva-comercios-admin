CREATE TABLE "prop_color" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_color_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE TABLE "prop_marca" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_marca_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE TABLE "prop_material" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_material_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE TABLE "prop_objeto" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_objeto_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE TABLE "prop_presentacion" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_presentacion_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE TABLE "prop_talle" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"abrev" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "prop_talle_abrev_format_chk" CHECK (abrev ~ '^[A-Z0-9]{1,8}$')
);
--> statement-breakpoint
CREATE UNIQUE INDEX "prop_color_nombre_lower_uniq" ON "prop_color" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_color_abrev_uniq" ON "prop_color" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_color_activo_idx" ON "prop_color" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_marca_nombre_lower_uniq" ON "prop_marca" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_marca_abrev_uniq" ON "prop_marca" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_marca_activo_idx" ON "prop_marca" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_material_nombre_lower_uniq" ON "prop_material" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_material_abrev_uniq" ON "prop_material" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_material_activo_idx" ON "prop_material" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_objeto_nombre_lower_uniq" ON "prop_objeto" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_objeto_abrev_uniq" ON "prop_objeto" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_objeto_activo_idx" ON "prop_objeto" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_presentacion_nombre_lower_uniq" ON "prop_presentacion" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_presentacion_abrev_uniq" ON "prop_presentacion" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_presentacion_activo_idx" ON "prop_presentacion" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "prop_talle_nombre_lower_uniq" ON "prop_talle" USING btree (lower("nombre"));--> statement-breakpoint
CREATE UNIQUE INDEX "prop_talle_abrev_uniq" ON "prop_talle" USING btree ("abrev");--> statement-breakpoint
CREATE INDEX "prop_talle_activo_idx" ON "prop_talle" USING btree ("activo");