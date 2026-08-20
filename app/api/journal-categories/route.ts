import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active journal categories ordered by order field
    const allCategories = await db
      .select()
      .from(journalCategories)
      .where(eq(journalCategories.isActive, true))
      .orderBy(journalCategories.order);

    return NextResponse.json({ categories: allCategories });
  } catch (error) {
    console.error("Error fetching journal categories:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch journal categories", details: errorMessage },
      { status: 500 }
    );
  }
}

