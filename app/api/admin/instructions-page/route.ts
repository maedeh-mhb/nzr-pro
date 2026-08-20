import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { instructionsPage } from "@/lib/db/schema";
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

    const settings = await db.select().from(instructionsPage).limit(1);

    if (settings.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: settings[0].id,
      titleEn: settings[0].titleEn,
      titleFa: settings[0].titleFa,
      contentEn: settings[0].contentEn,
      contentFa: settings[0].contentFa,
      audioUrl: settings[0].audioUrl,
      isEnabled: settings[0].isEnabled,
    });
  } catch (error) {
    console.error("Error fetching instructions page:", error);
    return NextResponse.json(
      { error: "Failed to fetch instructions page" },
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
      contentEn,
      contentFa,
      audioUrl,
      isEnabled,
    } = body;

    const existing = await db.select().from(instructionsPage).limit(1);

    if (existing.length > 0) {
      await db
        .update(instructionsPage)
        .set({
          titleEn,
          titleFa,
          contentEn,
          contentFa,
          audioUrl,
          isEnabled: isEnabled !== undefined ? isEnabled : true,
          updatedAt: new Date(),
        })
        .where(eq(instructionsPage.id, existing[0].id));

      return NextResponse.json({ success: true });
    } else {
      await db.insert(instructionsPage).values({
        titleEn,
        titleFa,
        contentEn,
        contentFa,
        audioUrl,
        isEnabled: isEnabled !== undefined ? isEnabled : true,
      });

      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error("Error saving instructions page:", error);
    return NextResponse.json(
      { error: "Failed to save instructions page" },
      { status: 500 }
    );
  }
}
