import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Get all active categories ordered by order field
    const allCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(categories.order);

    return NextResponse.json(
      { categories: allCategories },
      { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch categories", details: errorMessage },
      { status: 500 }
    );
  }
}

