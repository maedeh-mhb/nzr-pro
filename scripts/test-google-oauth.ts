/**
 * Test script to verify Google OAuth configuration
 * Run with: tsx scripts/test-google-oauth.ts
 */

import dotenv from "dotenv";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });
config({ path: ".env" });

const requiredEnvVars = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "NEXTAUTH_SECRET",
  "NEXTAUTH_URL",
];

console.log("🔍 Checking Google OAuth Configuration...\n");

let allPresent = true;

requiredEnvVars.forEach((varName) => {
  const value = process.env[varName];
  if (!value) {
    console.error(`❌ Missing: ${varName}`);
    allPresent = false;
  } else {
    // Mask sensitive values
    const maskedValue =
      varName.includes("SECRET") || varName.includes("SECRET")
        ? `${value.substring(0, 8)}...${value.substring(value.length - 4)}`
        : value;
    console.log(`✅ ${varName}: ${maskedValue}`);
  }
});

if (!allPresent) {
  console.log("\n❌ Configuration incomplete!");
  console.log("\nPlease ensure the following are set in your .env file:");
  requiredEnvVars.forEach((varName) => {
    console.log(`  - ${varName}`);
  });
  console.log("\nSee docs/GOOGLE_OAUTH_SETUP.md for setup instructions.");
  process.exit(1);
}

// Validate format
const clientId = process.env.GOOGLE_CLIENT_ID!;
if (!clientId.includes(".apps.googleusercontent.com")) {
  console.warn(
    "\n⚠️  Warning: GOOGLE_CLIENT_ID doesn't look like a valid Google Client ID"
  );
  console.warn("   Expected format: xxxxxx.apps.googleusercontent.com");
}

const nextAuthUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
const expectedCallbackUrl = `${nextAuthUrl}/api/auth/callback/google`;

console.log("\n📋 Configuration Summary:");
console.log(`   Callback URL: ${expectedCallbackUrl}`);
console.log(
  "\n⚠️  Make sure this callback URL is added to your Google OAuth Client:"
);
console.log(`   1. Go to Google Cloud Console`);
console.log(`   2. Navigate to APIs & Services > Credentials`);
console.log(`   3. Edit your OAuth 2.0 Client`);
console.log(`   4. Add to Authorized redirect URIs: ${expectedCallbackUrl}`);

console.log("\n✅ Configuration check complete!");
console.log("\nNext steps:");
console.log("  1. Ensure callback URL is configured in Google Console");
console.log("  2. Start your dev server: npm run dev");
console.log("  3. Test login at: http://localhost:3000/login");

