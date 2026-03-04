CREATE TABLE "business_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"company_name" varchar(100) DEFAULT 'Comercio Ejemplo' NOT NULL,
	"address" varchar(200),
	"tax_id" varchar(30),
	"logo_square" text,
	"logo_rectangular" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
