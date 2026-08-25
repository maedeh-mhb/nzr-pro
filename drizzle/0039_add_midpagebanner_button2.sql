-- Add button2 columns to mid_page_banner
ALTER TABLE mid_page_banner
  ADD COLUMN IF NOT EXISTS button2_text_en text,
  ADD COLUMN IF NOT EXISTS button2_text_fa text,
  ADD COLUMN IF NOT EXISTS button2_link text;
