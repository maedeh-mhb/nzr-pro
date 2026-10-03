ALTER TABLE "products" ALTER COLUMN "weight" SET DATA TYPE numeric(10, 3);--> statement-breakpoint
ALTER TABLE "home_note" ADD COLUMN IF NOT EXISTS "availability_title_en" text;--> statement-breakpoint
ALTER TABLE "home_note" ADD COLUMN IF NOT EXISTS "availability_title_fa" text;--> statement-breakpoint
ALTER TABLE "home_note" ADD COLUMN IF NOT EXISTS "availability_days" text;--> statement-breakpoint
ALTER TABLE "home_note" ADD COLUMN IF NOT EXISTS "availability_dates" text;--> statement-breakpoint
ALTER TABLE "home_note" ADD COLUMN IF NOT EXISTS "availability_is_enabled" boolean DEFAULT true NOT NULL;