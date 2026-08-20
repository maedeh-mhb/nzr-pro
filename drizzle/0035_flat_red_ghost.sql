CREATE TABLE "admin_notification_reads" (
	"id" text PRIMARY KEY NOT NULL,
	"notification_id" text NOT NULL,
	"admin_user_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_notification_reads" ADD CONSTRAINT "admin_notification_reads_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;