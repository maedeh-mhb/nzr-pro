CREATE TABLE IF NOT EXISTS "badges" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_fa" text,
	"color" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "badges_name_unique" UNIQUE("name")
);
