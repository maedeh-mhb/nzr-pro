ALTER TABLE "contact_messages" ADD COLUMN "parent_message_id" text;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "reply" text;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "reply_at" timestamp;--> statement-breakpoint
ALTER TABLE "contact_messages" ADD COLUMN "is_read_by_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_parent_message_id_contact_messages_id_fk" FOREIGN KEY ("parent_message_id") REFERENCES "contact_messages"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
