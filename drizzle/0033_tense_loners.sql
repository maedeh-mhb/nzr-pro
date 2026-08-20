CREATE TABLE "instructions_page" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text,
	"title_fa" text,
	"content_en" text,
	"content_fa" text,
	"audio_url" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mid_page_banner" (
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
ALTER TABLE "products" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "position" integer;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "product_name_fa" text;