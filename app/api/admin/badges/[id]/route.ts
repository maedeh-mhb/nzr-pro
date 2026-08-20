import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { badges } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PATCH - Update a badge
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin or superadmin
        if (session.user.role !== "admin" && session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = params;
        const body = await request.json();
        const { nameFa, color } = body;

        // Validation
        if (!color || !color.trim()) {
            return NextResponse.json(
                { error: "Badge color is required" },
                { status: 400 }
            );
        }

        const [badge] = await db
            .update(badges)
            .set({
                nameFa: nameFa ? nameFa.trim() : null,
                color: color.trim(),
                updatedAt: new Date(),
            })
            .where(eq(badges.id, id))
            .returning();

        if (!badge) {
            return NextResponse.json({ error: "Badge not found" }, { status: 404 });
        }

        return NextResponse.json({ badge });
    } catch (error) {
        console.error("Error updating badge:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to update badge", details: errorMessage },
            { status: 500 }
        );
    }
}

// DELETE - Delete a badge
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Check if user is admin or superadmin
        if (session.user.role !== "admin" && session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { id } = params;

        const result = await db
            .delete(badges)
            .where(eq(badges.id, id))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: "Badge not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error deleting badge:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Failed to delete badge", details: errorMessage },
            { status: 500 }
        );
    }
}
