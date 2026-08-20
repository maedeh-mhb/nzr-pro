import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch reward thresholds (public, no auth required)
export async function GET() {
  try {
    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "reward_thresholds"))
      .limit(1);

    if (setting.length === 0 || !setting[0].value) {
      // Return empty array if no thresholds set
      return NextResponse.json(
        { thresholds: [] },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        }
      );
    }

    // Parse JSON thresholds
    let thresholds = [];
    try {
      thresholds = JSON.parse(setting[0].value);
    } catch (e) {
      console.error("Error parsing reward thresholds:", e);
      thresholds = [];
    }

    return NextResponse.json(
      { thresholds },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching reward thresholds:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reward thresholds", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Update reward thresholds (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { thresholds } = body;

    if (!Array.isArray(thresholds)) {
      return NextResponse.json({ error: "Thresholds must be an array" }, { status: 400 });
    }

    // Validate thresholds (max 3, each must have value and discount)
    if (thresholds.length > 3) {
      return NextResponse.json({ error: "Maximum 3 thresholds allowed" }, { status: 400 });
    }

    for (const threshold of thresholds) {
      if (!threshold.value || !threshold.discount) {
        return NextResponse.json(
          { error: "Each threshold must have both value and discount" },
          { status: 400 }
        );
      }
      if (isNaN(parseInt(threshold.value, 10)) || parseInt(threshold.value, 10) <= 0) {
        return NextResponse.json(
          { error: "Threshold value must be a positive number" },
          { status: 400 }
        );
      }
      if (isNaN(parseInt(threshold.discount, 10)) || parseInt(threshold.discount, 10) <= 0 || parseInt(threshold.discount, 10) > 100) {
        return NextResponse.json(
          { error: "Discount must be a number between 1 and 100" },
          { status: 400 }
        );
      }
    }

    // Store as JSON string
    const value = JSON.stringify(thresholds);

    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "reward_thresholds"))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(settings)
        .set({
          value,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, "reward_thresholds"));
    } else {
      // Insert new
      await db.insert(settings).values({
        key: "reward_thresholds",
        value,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating reward thresholds:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update reward thresholds", details: errorMessage },
      { status: 500 }
    );
  }
}

