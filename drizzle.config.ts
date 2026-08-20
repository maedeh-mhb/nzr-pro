import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",  // ✅ Required field
  dbCredentials: {
    url: process.env.DATABASE_URL!,  // ✅ 'connectionString' is now 'url'
  },
});