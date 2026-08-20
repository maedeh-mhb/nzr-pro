import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingSettings } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Get shipping settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_shipping");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get the first (and should be only) shipping settings record
    const settings = await db.select().from(shippingSettings).limit(1);

    if (settings.length === 0) {
      return NextResponse.json(null);
    }

    const setting = settings[0];
    return NextResponse.json({
      id: setting.id,
      adminProvince: setting.adminProvince,
      adminCity: setting.adminCity,
      priceAdminProvince: setting.priceAdminProvince ? parseFloat(String(setting.priceAdminProvince)) : null,
      priceNeighboringProvinces: setting.priceNeighboringProvinces ? parseFloat(String(setting.priceNeighboringProvinces)) : null,
      priceOtherProvinces: setting.priceOtherProvinces ? parseFloat(String(setting.priceOtherProvinces)) : null,
      weight1: setting.weight1 ? parseFloat(String(setting.weight1)) : null,
      weight1Multiplier: setting.weight1Multiplier ? parseFloat(String(setting.weight1Multiplier)) : null,
      weight2: setting.weight2 ? parseFloat(String(setting.weight2)) : null,
      weight2Multiplier: setting.weight2Multiplier ? parseFloat(String(setting.weight2Multiplier)) : null,
      weight3: setting.weight3 ? parseFloat(String(setting.weight3)) : null,
      weight3Multiplier: setting.weight3Multiplier ? parseFloat(String(setting.weight3Multiplier)) : null,
    });
  } catch (error) {
    console.error("Error fetching shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping settings" },
      { status: 500 }
    );
  }
}

// Create or update shipping settings
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_shipping");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      adminProvince,
      adminCity,
      priceAdminProvince,
      priceNeighboringProvinces,
      priceOtherProvinces,
      weight1,
      weight1Multiplier,
      weight2,
      weight2Multiplier,
      weight3,
      weight3Multiplier,
    } = body;

    // Check if settings already exist
    const existing = await db.select().from(shippingSettings).limit(1);

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(shippingSettings)
        .set({
          adminProvince,
          adminCity: adminCity || null,
          priceAdminProvince,
          priceNeighboringProvinces,
          priceOtherProvinces,
          weight1,
          weight1Multiplier,
          weight2,
          weight2Multiplier,
          weight3,
          weight3Multiplier,
          updatedAt: new Date(),
        })
        .where(eq(shippingSettings.id, existing[0].id));

      return NextResponse.json({ success: true });
    } else {
      // Create new settings
      await db.insert(shippingSettings).values({
        adminProvince,
        adminCity: adminCity || null,
        priceAdminProvince,
        priceNeighboringProvinces,
        priceOtherProvinces,
        weight1,
        weight1Multiplier,
        weight2,
        weight2Multiplier,
        weight3,
        weight3Multiplier,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error saving shipping settings:", error);
    return NextResponse.json(
      { error: "Failed to save shipping settings" },
      { status: 500 }
    );
  }
}

