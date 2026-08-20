-- Create index concurrently after backfill to avoid locks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_products_category_position
  ON products (category_id, position);
