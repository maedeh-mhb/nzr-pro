import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeNote } from "@/lib/db/schema/system";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const note = await db.query.homeNote.findFirst({
      where: eq(homeNote.isEnabled, true),
    });

    if (!note) {
      return NextResponse.json({ contentEn: null, contentFa: null, isEnabled: false });
    }

    return NextResponse.json(
      { contentEn: note.contentEn, contentFa: note.contentFa, isEnabled: note.isEnabled },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching home note:", error);
    return NextResponse.json({ contentEn: null, contentFa: null, isEnabled: false });
  }
}
