import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instructionCards } from "@/lib/db/schema/system";
import { eq, asc, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const latest = parseInt(searchParams.get("latest") || "", 10);

    // ?latest=N returns the N most recently created cards (newest first)
    if (Number.isFinite(latest) && latest > 0) {
      const latestCards = await db
        .select({
          id: instructionCards.id,
          titleEn: instructionCards.titleEn,
          titleFa: instructionCards.titleFa,
          imageUrl: instructionCards.imageUrl,
        })
        .from(instructionCards)
        .where(eq(instructionCards.isEnabled, true))
        .orderBy(desc(instructionCards.createdAt))
        .limit(Math.min(latest, 20));

      return NextResponse.json(
        { cards: latestCards },
        { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
      );
    }

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
