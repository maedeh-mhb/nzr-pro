import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PUT - Set address as default
export async function PUT(
    request: NextRequest,
    { params }: { params: { addressId: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const addressId = params.addressId;

        // Check if address exists and belongs to user
        const existingAddress = await db.query.addresses.findFirst({
            where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
        });

        if (!existingAddress) {
            return NextResponse.json({ error: "Address not found" }, { status: 404 });
        }

        // Set all addresses to not default first
        await db
            .update(addresses)
            .set({ isDefault: false })
            .where(eq(addresses.userId, userId));

        // Then set the specified address as default
        await db
            .update(addresses)
            .set({ isDefault: true })
            .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

        return NextResponse.json({
            message: "Address set as default successfully",
        });
    } catch (error) {
        console.error("Error setting default address:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: "Failed to set default address", details: errorMessage },
            { status: 500 }
        );
    }
}
