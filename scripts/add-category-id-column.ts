/**
 * Script to add category_id column to social_links table
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

async function addCategoryIdColumn() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    console.log("Adding category_id column to social_links table...");

    // Check if column already exists
    const checkResult = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'social_links' AND column_name = 'category_id'
    `;

    if (checkResult && checkResult.length > 0) {
      console.log("✅ 'category_id' column already exists");
      return;
    }

    // Add the category_id column
    await client.unsafe(`
      ALTER TABLE social_links 
      ADD COLUMN category_id TEXT
    `);

    // Add foreign key constraint
    await client.unsafe(`
      ALTER TABLE social_links 
      ADD CONSTRAINT social_links_category_id_fkey 
      FOREIGN KEY (category_id) 
      REFERENCES categories(id) 
      ON DELETE CASCADE
    `);

    console.log("✅ 'category_id' column added successfully!");
  } catch (error) {
    console.error("Error adding category_id column:", error);
    throw error;
  } finally {
    await client.end();
  }
}

addCategoryIdColumn()
  .then(() => {
    console.log("Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Script failed:", error);
    process.exit(1);
  });

