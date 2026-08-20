CREATE TABLE "home_note" (
	"id" text PRIMARY KEY NOT NULL,
	"content_en" text,
	"content_fa" text,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
