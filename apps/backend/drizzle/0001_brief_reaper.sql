ALTER TABLE "inventory" ADD COLUMN "reserved_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "available_quantity" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "inventory" ADD COLUMN "reorder_point" integer DEFAULT 10 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "supplier_contact" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "shipping" double precision DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "purchases" ADD COLUMN "received_at" timestamp;