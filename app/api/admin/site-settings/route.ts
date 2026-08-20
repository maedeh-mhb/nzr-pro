import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_site_settings");
    if (!authResult.authorized) {
      return authResult.response!;
    }

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

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_site_settings");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      siteName,
      defaultLanguage,
      currency,
      timezone,
      siteDescription,
      maintenanceMode,
    } = body;

    // Define all settings keys (removed contactEmail, phoneNumber, telegram, whatsapp, instagram)
    const settingsToUpdate = [
      { key: "siteName", value: siteName || "" },
      { key: "defaultLanguage", value: defaultLanguage || "en" },
      { key: "currency", value: currency || "toman" },
      { key: "timezone", value: timezone || "utc" },
      { key: "siteDescription", value: siteDescription || "" },
      { key: "maintenanceMode", value: maintenanceMode || "off" },
    ];

    // Update or insert each setting
    for (const setting of settingsToUpdate) {
      const existing = await db
        .select()
        .from(settings)
        .where(eq(settings.key, setting.key))
        .limit(1);

      if (existing.length > 0) {
        // Update existing
        await db
          .update(settings)
          .set({
            value: setting.value,
            updatedAt: new Date(),
          })
          .where(eq(settings.key, setting.key));
      } else {
        // Insert new
        await db.insert(settings).values({
          key: setting.key,
          value: setting.value,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating site settings:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update site settings", details: errorMessage },
      { status: 500 }
    );
  }
}

