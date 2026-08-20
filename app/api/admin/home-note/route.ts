import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { homeNote } from "@/lib/db/schema/system";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const note = await db.query.homeNote.findFirst();
    return NextResponse.json({ note: note || null });
  } catch (error) {
    console.error("Error fetching home note:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { contentEn, contentFa, isEnabled } = body;

    const existing = await db.query.homeNote.findFirst();

    if (existing) {
      await db.update(homeNote).set({
        contentEn: contentEn || null,
        contentFa: contentFa || null,
        isEnabled: isEnabled ?? true,
        updatedAt: new Date(),
      }).where(eq(homeNote.id, existing.id));
    } else {
      await db.insert(homeNote).values({
        contentEn: contentEn || null,
        contentFa: contentFa || null,
        isEnabled: isEnabled ?? true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving home note:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
