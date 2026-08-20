-- Add product_name_fa column to order_items table
-- This migration is intentionally idempotent to avoid errors if the column was already added by a prior migration.
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS product_name_fa text;