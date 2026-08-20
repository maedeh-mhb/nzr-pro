import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heroSettings } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Get hero settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_hero");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get the first (and should be only) hero settings record
    const settings = await db.select().from(heroSettings).limit(1);

    if (settings.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: settings[0].id,
      titleEn: settings[0].titleEn,
      titleFa: settings[0].titleFa,
      descriptionEn: settings[0].descriptionEn,
      descriptionFa: settings[0].descriptionFa,
      buttonTextEn: settings[0].buttonTextEn,
      buttonTextFa: settings[0].buttonTextFa,
      buttonLink: settings[0].buttonLink,
      backgroundImageUrl: settings[0].backgroundImageUrl,
      isEnabled: settings[0].isEnabled,
    });
  } catch (error) {
    console.error("Error fetching hero settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch hero settings" },
      { status: 500 }
    );
  }
}

// Create or update hero settings
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_hero");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      titleEn,
      titleFa,
      descriptionEn,
      descriptionFa,
      buttonTextEn,
      buttonTextFa,
      buttonLink,
      backgroundImageUrl,
      isEnabled,
    } = body;

    // Check if settings already exist
    const existing = await db.select().from(heroSettings).limit(1);

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(heroSettings)
        .set({
          titleEn,
          titleFa,
          descriptionEn,
          descriptionFa,
          buttonTextEn,
          buttonTextFa,
          buttonLink,
          backgroundImageUrl,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          updatedAt: new Date(),
        })
        .where(eq(heroSettings.id, existing[0].id));

      return NextResponse.json({ success: true });
    } else {
      // Create new settings
      await db.insert(heroSettings).values({
        titleEn,
        titleFa,
        descriptionEn,
        descriptionFa,
        buttonTextEn,
        buttonTextFa,
        buttonLink,
        backgroundImageUrl,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error saving hero settings:", error);
    return NextResponse.json(
      { error: "Failed to save hero settings" },
      { status: 500 }
    );
  }
}

