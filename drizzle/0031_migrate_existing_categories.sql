-- Migrate existing products to use categoryIds array
-- This will populate the categoryIds field with the current category for existing products

UPDATE "products" 
SET "category_ids" = CASE 
  WHEN "category_id" IS NOT NULL THEN 
    '["' || "category_id" || '"]'
  ELSE 
    NULL
END
WHERE "category_ids" IS NULL AND "category_id" IS NOT NULL;