-- Migration: add nullable position column for product ordering (per-category)
-- Run this migration as part of your normal migration pipeline. Designed to be safe.

BEGIN;

-- 1) Add nullable column
ALTER TABLE products ADD COLUMN IF NOT EXISTS position integer;

COMMIT;

-- After applying, run the backfill script in small batches (external script) and then create the index concurrently.
