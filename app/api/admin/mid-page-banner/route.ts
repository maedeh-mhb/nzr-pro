import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { midPageBanner } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db.select().from(midPageBanner).limit(1);

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
    console.error("Error fetching mid-page banner:", error);
    return NextResponse.json(
      { error: "Failed to fetch mid-page banner" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const existing = await db.select().from(midPageBanner).limit(1);

    if (existing.length > 0) {
      await db
        .update(midPageBanner)
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
        .where(eq(midPageBanner.id, existing[0].id));

      return NextResponse.json({ success: true });
    } else {
      await db.insert(midPageBanner).values({
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
    console.error("Error saving mid-page banner:", error);
    return NextResponse.json(
      { error: "Failed to save mid-page banner" },
      { status: 500 }
    );
  }
}
