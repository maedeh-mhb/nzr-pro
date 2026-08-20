DO $$ BEGIN
 CREATE TYPE "product_type" AS ENUM('economic', 'featured');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "product_type" "product_type" NOT NULL;