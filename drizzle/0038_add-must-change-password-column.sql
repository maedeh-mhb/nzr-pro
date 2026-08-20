ALTER TABLE "guest_orders" ALTER COLUMN "guest_email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;