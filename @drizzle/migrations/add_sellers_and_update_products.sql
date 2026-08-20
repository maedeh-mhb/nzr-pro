-- drizzle/XXXX_add_sellers_and_update_products.sql

-- Create sellers table
CREATE TABLE IF NOT EXISTS "sellers" (
	"id" text PRIMARY KEY NOT NULL,
	"name_en" text NOT NULL,
	"name_fa" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Insert default seller (Nazanin)
INSERT INTO "sellers" ("id", "name_en", "name_fa", "status", "created_at", "updated_at") 
VALUES ('nazanin_seller_001', 'Nazanin', 'نازنین', 'active', now(), now());

-- Add seller_id column to products table (nullable first)
ALTER TABLE "products" ADD COLUMN "seller_id" text;

-- Update all existing products to use the default seller
UPDATE "products" SET "seller_id" = 'nazanin_seller_001' WHERE "seller_id" IS NULL;

-- Make seller_id NOT NULL and add foreign key constraint
ALTER TABLE "products" ALTER COLUMN "seller_id" SET NOT NULL;
ALTER TABLE "products" ADD CONSTRAINT "products_seller_id_sellers_id_fk" FOREIGN KEY ("seller_id") REFERENCES "sellers"("id") ON DELETE restrict ON UPDATE no action;
