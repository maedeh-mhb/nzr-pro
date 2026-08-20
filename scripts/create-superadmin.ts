/**
 * Script to create a superadmin account
 * Run with: npx tsx scripts/create-superadmin.ts
 * Or: ts-node scripts/create-superadmin.ts
 */

import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { users } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Load environment variables FIRST
config();

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set in .env file");
}

// Create database connection
const connectionString = process.env.DATABASE_URL;
const client = postgres(connectionString);
const db = drizzle(client, { schema: { users } });

async function createSuperAdmin() {
  const email = process.env.SUPERADMIN_EMAIL || "superadmin@example.com";
  const password = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";
  const name = process.env.SUPERADMIN_NAME || "Super Admin";

  try {
    // Check if superadmin already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      // Update existing user to superadmin
      const hashedPassword = await bcrypt.hash(password, 10);
      await db
        .update(users)
        .set({
          role: "superadmin",
          password: hashedPassword,
          name: name,
          totalPoints: existingUser.totalPoints ?? 0, // Preserve existing points or set to 0
        })
        .where(eq(users.id, existingUser.id));

      console.log(`✅ Updated existing user to superadmin: ${email}`);
      console.log(`   Password has been updated.`);
    } else {
      // Create new superadmin
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db.insert(users).values({
        name: name,
        email: email,
        password: hashedPassword,
        role: "superadmin",
        totalPoints: 0, // Initialize with 0 points
      }).returning();

      console.log(`✅ Superadmin created successfully!`);
      console.log(`   Email: ${email}`);
      console.log(`   Name: ${name}`);
      console.log(`   ID: ${newUser[0].id}`);
    }

    console.log(`\n📝 Login credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`\n⚠️  Please change the password after first login!`);
  } catch (error) {
    console.error("❌ Error creating superadmin:", error);
    process.exit(1);
  }
}

createSuperAdmin()
  .then(async () => {
    console.log("\n✅ Script completed successfully!");
    await client.end();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("❌ Script failed:", error);
    await client.end();
    process.exit(1);
  });

