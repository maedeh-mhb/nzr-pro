ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS edit_token_hash text;
ALTER TABLE guest_orders ADD COLUMN IF NOT EXISTS edit_expires_at timestamp;
