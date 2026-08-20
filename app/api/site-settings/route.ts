import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
export const dynamic = "force-dynamic";

// Public API to fetch site settings (for currency, etc.)
export async function GET() {
  try {
    // Fetch all site settings
    const siteSettings = await db.select().from(settings);

    // Convert array to object for easier access
    const settingsObj: Record<string, string> = {};
    siteSettings.forEach((setting) => {
      settingsObj[setting.key] = setting.value || "";
    });

    // Ensure currency defaults to toman if not set or empty
    if (!settingsObj.currency) {
      settingsObj.currency = "toman";
    }

    return NextResponse.json({ settings: settingsObj });
  } catch (error) {
    console.error("Error fetching site settings:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch site settings", details: errorMessage },
      { status: 500 }
    );
  }
}

