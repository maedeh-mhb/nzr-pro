ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_province_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_city_id" integer;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_address" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "shipping_postal_code" text;
