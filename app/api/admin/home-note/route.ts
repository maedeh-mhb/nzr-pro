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
    let availabilityDays: string[] = [];
    let availabilityDates: string[] = [];
    try { availabilityDays = note?.availabilityDays ? JSON.parse(note.availabilityDays) : []; } catch { availabilityDays = []; }
    try { availabilityDates = note?.availabilityDates ? JSON.parse(note.availabilityDates) : []; } catch { availabilityDates = []; }

    return NextResponse.json({ note: note ? { ...note, availabilityDays, availabilityDates } : null });
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
    const { contentEn, contentFa, availabilityTitleEn, availabilityTitleFa, availabilityDays, availabilityDates, availabilityIsEnabled, isEnabled } = body;

    const existing = await db.query.homeNote.findFirst();

    if (existing) {
      await db.update(homeNote).set({
        contentEn: contentEn || null,
        contentFa: contentFa || null,
        availabilityTitleEn: availabilityTitleEn || null,
        availabilityTitleFa: availabilityTitleFa || null,
        availabilityDays: JSON.stringify(Array.isArray(availabilityDays) ? availabilityDays : []),
        availabilityDates: JSON.stringify(Array.isArray(availabilityDates) ? availabilityDates : []),
        availabilityIsEnabled: availabilityIsEnabled ?? true,
        isEnabled: isEnabled ?? true,
        updatedAt: new Date(),
      }).where(eq(homeNote.id, existing.id));
    } else {
      await db.insert(homeNote).values({
        contentEn: contentEn || null,
        contentFa: contentFa || null,
        availabilityTitleEn: availabilityTitleEn || null,
        availabilityTitleFa: availabilityTitleFa || null,
        availabilityDays: JSON.stringify(Array.isArray(availabilityDays) ? availabilityDays : []),
        availabilityDates: JSON.stringify(Array.isArray(availabilityDates) ? availabilityDates : []),
        availabilityIsEnabled: availabilityIsEnabled ?? true,
        isEnabled: isEnabled ?? true,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving home note:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
