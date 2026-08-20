ALTER TABLE "orders" ADD COLUMN "payment_verified" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_method" text DEFAULT 'iranian_post';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "shipping_status" text;--> statement-breakpoint
ALTER TABLE "shipping_settings" ADD COLUMN "admin_city" integer;