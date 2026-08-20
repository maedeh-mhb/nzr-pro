CREATE TABLE IF NOT EXISTS "audit_trail" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"description" text NOT NULL,
	"description_fa" text,
	"before_state" jsonb,
	"after_state" jsonb,
	"metadata" jsonb,
	"can_rollback" boolean DEFAULT false NOT NULL,
	"rolled_back" boolean DEFAULT false NOT NULL,
	"rolled_back_at" timestamp,
	"rolled_back_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "permission_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"admin_id" text NOT NULL,
	"action" text NOT NULL,
	"user_id" text NOT NULL,
	"permission_id" text,
	"old_role" text,
	"new_role" text,
	"old_permissions" jsonb,
	"new_permissions" jsonb,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discount_code_usages" DROP CONSTRAINT "discount_code_usages_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "inventory_reservations" DROP CONSTRAINT "inventory_reservations_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_discount_code_id_discount_codes_id_fk";
--> statement-breakpoint
ALTER TABLE "reward_history" DROP CONSTRAINT "reward_history_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "wallet_transactions" DROP CONSTRAINT "wallet_transactions_order_id_orders_id_fk";
--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "name_en" text NOT NULL;--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "name_fa" text NOT NULL;--> statement-breakpoint
ALTER TABLE "social_links" ADD COLUMN "category_id" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "social_links" ADD CONSTRAINT "social_links_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "social_links" DROP COLUMN IF EXISTS "name";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_trail" ADD CONSTRAINT "audit_trail_rolled_back_by_users_id_fk" FOREIGN KEY ("rolled_back_by") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permission_audit_log" ADD CONSTRAINT "permission_audit_log_admin_id_users_id_fk" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permission_audit_log" ADD CONSTRAINT "permission_audit_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "permission_audit_log" ADD CONSTRAINT "permission_audit_log_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
