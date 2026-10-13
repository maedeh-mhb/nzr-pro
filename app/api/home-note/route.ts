import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { homeNote } from "@/lib/db/schema/system";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const note = await db.query.homeNote.findFirst();

    if (!note) {
      return NextResponse.json({ contentEn: null, contentFa: null, availabilityDays: [], availabilityDates: [], availabilityAudioUrl: null, availabilityIsEnabled: false, isEnabled: false });
    }

    let availabilityDays: string[] = [];
    let availabilityDates: string[] = [];
    try { availabilityDays = note.availabilityDays ? JSON.parse(note.availabilityDays) : []; } catch { availabilityDays = []; }
    try { availabilityDates = note.availabilityDates ? JSON.parse(note.availabilityDates) : []; } catch { availabilityDates = []; }

    return NextResponse.json(
      { contentEn: note.contentEn, contentFa: note.contentFa, availabilityTitleEn: note.availabilityTitleEn, availabilityTitleFa: note.availabilityTitleFa, availabilityDays, availabilityDates, availabilityAudioUrl: note.availabilityAudioUrl, availabilityIsEnabled: note.availabilityIsEnabled, isEnabled: note.isEnabled },
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
    return NextResponse.json({ contentEn: null, contentFa: null, availabilityDays: [], availabilityDates: [], availabilityAudioUrl: null, availabilityIsEnabled: false, isEnabled: false });
  }
}
