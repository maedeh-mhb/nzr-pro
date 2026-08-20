/**
 * Script to check the current schema of social_links table
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

async function checkSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    console.log("Checking social_links table schema...\n");

    // Get all columns
    const columns = await client`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'social_links'
      ORDER BY ordinal_position
    `;

    console.log("Columns in social_links table:");
    console.log("=================================");
    for (const col of columns) {
      console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    }

    console.log("\nChecking for name column specifically...");
    const nameColumn = columns.find(c => c.column_name === 'name');
    if (nameColumn) {
      console.log("⚠️  WARNING: 'name' column still exists!");
    } else {
      console.log("✅ 'name' column does not exist (good)");
    }

    console.log("\nChecking for name_en and name_fa columns...");
    const nameEnColumn = columns.find(c => c.column_name === 'name_en');
    const nameFaColumn = columns.find(c => c.column_name === 'name_fa');
    if (nameEnColumn && nameFaColumn) {
      console.log("✅ 'name_en' and 'name_fa' columns exist");
    } else {
      console.log("⚠️  WARNING: 'name_en' or 'name_fa' columns missing!");
    }

    console.log("\nChecking for category_id column...");
    const categoryIdColumn = columns.find(c => c.column_name === 'category_id');
    if (categoryIdColumn) {
      console.log("✅ 'category_id' column exists");
    } else {
      console.log("⚠️  WARNING: 'category_id' column missing!");
    }

  } catch (error) {
    console.error("Error checking schema:", error);
    throw error;
  } finally {
    await client.end();
  }
}

checkSchema()
  .then(() => {
    console.log("\nSchema check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Schema check failed:", error);
    process.exit(1);
  });

