/**
 * Script to verify the enum state in the database
 * Run with: npx tsx scripts/verify-enum.ts
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

async function verifyEnum() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    console.log("Checking enum values in database...\n");
    
    // Query the enum values directly from PostgreSQL
    const result = await client.unsafe(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
      ORDER BY enumsortorder;
    `);

    const enumValues = result.map((row: any) => row.enumlabel);
    
    console.log("Current enum values in database:");
    console.log(`  ${enumValues.join(", ")}\n`);
    
    if (enumValues.includes("superadmin")) {
      console.log("✅ superadmin is present in the database enum");
    } else {
      console.log("❌ superadmin is NOT present in the database enum");
      console.log("   Run: npm run db:apply-enum");
    }
    
    if (enumValues.length === 3 && enumValues.includes("user") && enumValues.includes("admin") && enumValues.includes("superadmin")) {
      console.log("\n✅ All enum values are correct!");
    } else {
      console.log("\n⚠️  Enum values don't match expected: [user, admin, superadmin]");
    }
  } catch (error) {
    console.error("❌ Error checking enum:", error);
    throw error;
  } finally {
    await client.end();
  }
}

verifyEnum()
  .then(() => {
    console.log("\n✅ Verification completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Verification failed:", error);
    process.exit(1);
  });

