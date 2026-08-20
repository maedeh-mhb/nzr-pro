/**
 * Script to manually apply the enum migration
 * Run with: npx tsx scripts/apply-enum-migration.ts
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

async function applyEnumMigration() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    console.log("Applying enum migration...");
    
    // Add superadmin to the user_role enum
    await client.unsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'superadmin' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
        ) THEN
          ALTER TYPE "user_role" ADD VALUE 'superadmin';
        END IF;
      END $$;
    `);

    console.log("✅ Enum migration applied successfully!");
    console.log("   The user_role enum now includes: user, admin, superadmin");
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      console.log("✅ Enum value 'superadmin' already exists in the database");
    } else {
      console.error("❌ Error applying migration:", error);
      throw error;
    }
  } finally {
    await client.end();
  }
}

applyEnumMigration()
  .then(() => {
    console.log("\n✅ Script completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Script failed:", error);
    process.exit(1);
  });

