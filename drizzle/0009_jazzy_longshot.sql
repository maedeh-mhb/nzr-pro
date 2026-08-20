CREATE TABLE IF NOT EXISTS "cart_items" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "contact_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"telegram" text,
	"instagram" text,
	"whatsapp" text,
	"phone" text,
	"email" text,
	"address" text,
	"address_fa" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "guest_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"order_id" text NOT NULL,
	"guest_name" text NOT NULL,
	"guest_email" text NOT NULL,
	"guest_phone" text NOT NULL,
	"province_id" integer NOT NULL,
	"city_id" integer NOT NULL,
	"address" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "guest_orders_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_codes" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"phone" text NOT NULL,
	"otp_hash" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orders" DROP CONSTRAINT "orders_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "addresses" ALTER COLUMN "country" SET DEFAULT 'Iran';--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "province_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "city_id" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "addresses" ADD COLUMN "postal_code" text NOT NULL;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "author_name_fa" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "publish_date" timestamp;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_title" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_title_fa" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_description" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_description_fa" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_keywords" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "seo_keywords_fa" text;--> statement-breakpoint
ALTER TABLE "journal_posts" ADD COLUMN "og_image" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "payment_method" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "type";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "city";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "state";--> statement-breakpoint
ALTER TABLE "addresses" DROP COLUMN IF EXISTS "zip_code";--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "guest_orders" ADD CONSTRAINT "guest_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
