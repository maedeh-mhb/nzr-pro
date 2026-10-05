import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingSettings } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
import { DEFAULT_SHIPPING_WEIGHT_RATES, SHIPPING_WEIGHT_TIERS } from "@/lib/shipping/weightRates";
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
      weightRates: setting.weightRates || DEFAULT_SHIPPING_WEIGHT_RATES,
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
    const { adminProvince, adminCity, weightRates } = body;

    if (
      typeof adminProvince !== "string" ||
      !adminProvince.trim() ||
      !Array.isArray(weightRates) ||
      weightRates.length !== SHIPPING_WEIGHT_TIERS.length ||
      weightRates.some((rate) => typeof rate !== "number" || !Number.isFinite(rate) || rate < 0)
    ) {
      return NextResponse.json(
        { error: "A province and a valid price for every weight tier are required" },
        { status: 400 }
      );
    }

    // Check if settings already exist
    const existing = await db.select().from(shippingSettings).limit(1);

    if (existing.length > 0) {
      // Update existing settings
      await db
        .update(shippingSettings)
        .set({
          adminProvince,
          adminCity: adminCity || null,
          weightRates,
          updatedAt: new Date(),
        })
        .where(eq(shippingSettings.id, existing[0].id));

      return NextResponse.json({ success: true });
    } else {
      // Create new settings
      await db.insert(shippingSettings).values({
        adminProvince,
        adminCity: adminCity || null,
        weightRates,
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
