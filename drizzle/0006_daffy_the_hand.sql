CREATE TABLE IF NOT EXISTS "hero_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text,
	"title_fa" text,
	"description_en" text,
	"description_fa" text,
	"button_text_en" text,
	"button_text_fa" text,
	"button_link" text,
	"background_image_url" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shipping_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_province" text,
	"price_admin_province" numeric(10, 2),
	"price_neighboring_provinces" numeric(10, 2),
	"price_other_provinces" numeric(10, 2),
	"weight_1" numeric(10, 2),
	"weight_1_multiplier" numeric(10, 2),
	"weight_2" numeric(10, 2),
	"weight_2_multiplier" numeric(10, 2),
	"weight_3" numeric(10, 2),
	"weight_3_multiplier" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
