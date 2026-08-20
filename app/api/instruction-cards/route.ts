import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instructionCards } from "@/lib/db/schema/system";
import { eq, asc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cards = await db
      .select({
        id: instructionCards.id,
        titleEn: instructionCards.titleEn,
        titleFa: instructionCards.titleFa,
        imageUrl: instructionCards.imageUrl,
        contentEn: instructionCards.contentEn,
        contentFa: instructionCards.contentFa,
        audioUrl: instructionCards.audioUrl,
        sortOrder: instructionCards.sortOrder,
      })
      .from(instructionCards)
      .where(eq(instructionCards.isEnabled, true))
      .orderBy(asc(instructionCards.sortOrder));

    return NextResponse.json(
      { cards },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching instruction cards:", error);
    return NextResponse.json({ cards: [] });
  }
}
