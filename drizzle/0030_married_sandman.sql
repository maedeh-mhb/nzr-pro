ALTER TABLE "orders" ADD COLUMN "shipping_province_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_city_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_address" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_postal_code" text;