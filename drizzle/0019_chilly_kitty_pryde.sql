ALTER TABLE "reviews" DROP CONSTRAINT "reviews_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "guest_orders" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "tracking_code" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "invoice_requested" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "card_to_card_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "online_payment_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pay_after_delivery_enabled" boolean;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "paypal_enabled" boolean;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "reviews" ADD CONSTRAINT "reviews_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
