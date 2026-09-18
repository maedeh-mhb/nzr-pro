ALTER TABLE home_note ADD COLUMN IF NOT EXISTS availability_title_en text;
ALTER TABLE home_note ADD COLUMN IF NOT EXISTS availability_title_fa text;
ALTER TABLE home_note ADD COLUMN IF NOT EXISTS availability_days text;
ALTER TABLE home_note ADD COLUMN IF NOT EXISTS availability_dates text;
ALTER TABLE home_note ADD COLUMN IF NOT EXISTS availability_is_enabled boolean NOT NULL DEFAULT true;