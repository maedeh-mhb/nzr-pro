-- Add og_image column to products table
-- This migration is intentionally idempotent to avoid errors if the column already exists.
ALTER TABLE products ADD COLUMN IF NOT EXISTS og_image text;
