import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch a specific setting by key
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json({ error: "Key parameter is required" }, { status: 400 });
    }

    // Allow non-admin users to fetch reward settings (public settings)
    const isPublicSetting = key === "reward_threshold" || key === "reward_thresholds";
    
    if (!isPublicSetting) {
      // For other settings, require admin authentication
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (session.user.role !== "admin" && session.user.role !== "superadmin") {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const setting = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (setting.length === 0) {
      return NextResponse.json({ key, value: null });
    }

    // Add cache-control headers to prevent caching
    return NextResponse.json(
      { key: setting[0].key, value: setting[0].value },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error) {
    console.error("Error fetching setting:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch setting", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create or update a setting
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
    const { key, value } = body;

    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 });
    }

    // Check if setting exists
    const existing = await db
      .select()
      .from(settings)
      .where(eq(settings.key, key))
      .limit(1);

    if (existing.length > 0) {
      // Update existing
      await db
        .update(settings)
        .set({
          value: value || null,
          updatedAt: new Date(),
        })
        .where(eq(settings.key, key));
    } else {
      // Insert new
      await db.insert(settings).values({
        key,
        value: value || null,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating setting:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update setting", details: errorMessage },
      { status: 500 }
    );
  }
}

