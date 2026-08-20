import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { badges } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch all badges
export async function GET(request: NextRequest) {
    try {
        // Public: allow all users to fetch badges
        const allBadges = await db.select().from(badges);
        return NextResponse.json({ badges: allBadges });
    } catch (error) {
        console.error("Error fetching badges:", error);
        return NextResponse.json(
            { error: "Failed to fetch badges" },
            { status: 500 }
        );
    }
}

// POST - Create a new badge
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin or superadmin
        if (session.user.role !== "admin" && session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, nameFa, color } = body;

        // Validation
        if (!name || !name.trim()) {
            return NextResponse.json(
                { error: "Badge name is required" },
                { status: 400 }
            );
        }

        if (!color || !color.trim()) {
            return NextResponse.json(
                { error: "Badge color is required" },
                { status: 400 }
            );
        }

        // Check if badge with same name already exists
        const existing = await db.query.badges.findFirst({
            where: eq(badges.name, name.trim()),
        });

        if (existing) {
            return NextResponse.json(
                { error: "Badge with this name already exists" },
                { status: 409 }
            );
        }

        const [badge] = await db
            .insert(badges)
            .values({
                name: name.trim(),
                nameFa: nameFa ? nameFa.trim() : null,
                color: color.trim(),
            })
            .returning();

        return NextResponse.json({ badge }, { status: 201 });
    } catch (error) {
        console.error("Error creating badge:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to create badge", details: errorMessage },
            { status: 500 }
        );
    }
}
