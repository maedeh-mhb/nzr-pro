-- Reindex script to renumber `position` values per category using gaps of 100.
-- Run per-category to avoid long locks; wrap in transactions.

-- Example: reindex a single category (replace :category_id with actual id)
BEGIN;
WITH ordered AS (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY category_id ORDER BY COALESCE(position, 0) ASC, created_at DESC) AS rn
  FROM products
  WHERE category_id = :category_id
)
UPDATE products p
SET position = ordered.rn * 100
FROM ordered
WHERE p.id = ordered.id;
COMMIT;

-- Example: reindex all categories in a safe loop (psql-friendly)
-- WARNING: running this for very large tables may be slow; do during off-peak.

-- In psql or a script, iterate over distinct category ids and run the above per-category update.
-- For example (psql):
-- \copy (SELECT DISTINCT category_id FROM products) TO '/tmp/categories.txt'
-- then loop reading categories and apply the per-category update replacing :category_id with the value.
