import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialLinks } from "@/lib/db/schema";
import { isNull } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Public endpoint - Get user-level exclusive links (no auth required)
export async function GET() {
    try {
        // Get only user links (not category links)
        const userLinks = await db
            .select()
            .from(socialLinks)
            .where(isNull(socialLinks.categoryId))
            .orderBy(socialLinks.order);

        return NextResponse.json({
            success: true,
            links: userLinks,
        });
    } catch (error) {
        console.error("Error fetching social links:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: "Failed to fetch social links", details: errorMessage },
            { status: 500 }
        );
    }
}
