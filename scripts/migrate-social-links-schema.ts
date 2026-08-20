/**
 * Migration script to update social_links table from 'name' column to 'name_en' and 'name_fa' columns
 * Run this script once to migrate the database schema
 * Usage: npm run db:migrate-social-links
 */

import { config } from "dotenv";
import postgres from "postgres";

// Load environment variables
config();

async function migrateSocialLinksSchema() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const connectionString = process.env.DATABASE_URL;
  const client = postgres(connectionString);

  try {
    console.log("Starting migration of social_links table...");

    // Check if name column exists
    const checkResult = await client`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'social_links' AND column_name = 'name'
    `;

    const hasNameColumn = checkResult && checkResult.length > 0;

    if (hasNameColumn) {
      console.log("Found 'name' column. Migrating to name_en and name_fa...");

      // Check if name_en and name_fa columns exist
      const checkNewColumns = await client`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'social_links' 
        AND column_name IN ('name_en', 'name_fa')
      `;

      const hasNewColumns = checkNewColumns && checkNewColumns.length === 2;

      if (!hasNewColumns) {
        // Add name_en and name_fa columns
        console.log("Adding name_en and name_fa columns...");
        await client.unsafe(`
          ALTER TABLE social_links 
          ADD COLUMN IF NOT EXISTS name_en TEXT,
          ADD COLUMN IF NOT EXISTS name_fa TEXT
        `);

        // Copy data from name to name_en and name_fa
        console.log("Copying data from 'name' to 'name_en' and 'name_fa'...");
        await client.unsafe(`
          UPDATE social_links 
          SET name_en = name, name_fa = name 
          WHERE name_en IS NULL OR name_fa IS NULL
        `);

        // Set NOT NULL constraint on name_en and name_fa
        console.log("Setting NOT NULL constraints...");
        await client.unsafe(`
          ALTER TABLE social_links 
          ALTER COLUMN name_en SET NOT NULL,
          ALTER COLUMN name_fa SET NOT NULL
        `);
      }

      // Drop the old name column
      console.log("Dropping old 'name' column...");
      await client.unsafe(`
        ALTER TABLE social_links DROP COLUMN IF EXISTS name
      `);

      console.log("Migration completed successfully!");
    } else {
      console.log("'name' column not found. Migration may have already been completed.");
      
      // Ensure name_en and name_fa exist (in case they don't)
      await client.unsafe(`
        ALTER TABLE social_links 
        ADD COLUMN IF NOT EXISTS name_en TEXT,
        ADD COLUMN IF NOT EXISTS name_fa TEXT
      `);
      
      // Set defaults for any NULL values
      await client.unsafe(`
        UPDATE social_links 
        SET name_en = COALESCE(name_en, ''),
            name_fa = COALESCE(name_fa, '')
        WHERE name_en IS NULL OR name_fa IS NULL
      `);
      
      // Set NOT NULL constraints (handle case where columns might already be NOT NULL)
      try {
        await client.unsafe(`
          ALTER TABLE social_links 
          ALTER COLUMN name_en SET NOT NULL,
          ALTER COLUMN name_fa SET NOT NULL
        `);
      } catch (e: any) {
        if (!e.message?.includes("already is not null")) {
          throw e;
        }
      }
    }

    console.log("Migration script finished.");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await client.end();
  }
}

// Run the migration
migrateSocialLinksSchema()
  .then(() => {
    console.log("Migration script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });

