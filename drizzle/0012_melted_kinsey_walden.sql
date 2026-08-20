CREATE TABLE IF NOT EXISTS "admin_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"activity_data" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "admin_activities" ADD CONSTRAINT "admin_activities_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
