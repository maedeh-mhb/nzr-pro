ALTER TABLE "orders" ADD COLUMN "delivery_confirmed_by_user" timestamp;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "delivery_confirmed_at" timestamp;--> statement-breakpoint
ALTER TABLE "discount_codes" ADD COLUMN "is_reward_generated" boolean DEFAULT false NOT NULL;