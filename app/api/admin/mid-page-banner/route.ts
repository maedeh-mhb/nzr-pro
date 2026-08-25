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
      titleEn: settings[0].titleEn ?? null,
      titleFa: settings[0].titleFa ?? null,
      descriptionEn: settings[0].descriptionEn ?? null,
      descriptionFa: settings[0].descriptionFa ?? null,
      buttonTextEn: settings[0].buttonTextEn ?? null,
      buttonTextFa: settings[0].buttonTextFa ?? null,
      buttonLink: settings[0].buttonLink ?? null,
      button2TextEn: settings[0].button2TextEn ?? null,
      button2TextFa: settings[0].button2TextFa ?? null,
      button2Link: settings[0].button2Link ?? null,
      backgroundImageUrl: settings[0].backgroundImageUrl ?? null,
      isEnabled: settings[0].isEnabled ?? false,
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
      button2TextEn,
      button2TextFa,
      button2Link,
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
            button2TextEn,
            button2TextFa,
            button2Link,
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
        button2TextEn,
        button2TextFa,
        button2Link,
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
