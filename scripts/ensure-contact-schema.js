require("dotenv/config");
const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set");
}

const sql = postgres(process.env.DATABASE_URL);

async function ensureContactSchema() {
  try {
    await sql.unsafe(`
      ALTER TABLE "contact_messages"
        DROP COLUMN IF EXISTS "email",
        DROP COLUMN IF EXISTS "subject"
    `);
    console.log("Contact message schema is up to date.");
  } finally {
    await sql.end();
  }
}

ensureContactSchema().catch((error) => {
  console.error("Failed to update contact message schema:", error);
  process.exit(1);
});