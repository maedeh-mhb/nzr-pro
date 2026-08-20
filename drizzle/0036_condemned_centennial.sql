CREATE TABLE "instruction_cards" (
	"id" text PRIMARY KEY NOT NULL,
	"title_en" text NOT NULL,
	"title_fa" text NOT NULL,
	"image_url" text NOT NULL,
	"content_en" text,
	"content_fa" text,
	"audio_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
