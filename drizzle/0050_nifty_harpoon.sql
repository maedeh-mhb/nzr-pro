ALTER TABLE "orders"
ADD COLUMN IF NOT EXISTS "paid_amount" numeric(10, 2);
