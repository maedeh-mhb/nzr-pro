import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function POST(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (session.user.role !== "admin" && session.user.role !== "superadmin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const productId = params.id;

        const existing = await db
            .select({ id: products.id })
            .from(products)
            .where(eq(products.id, productId))
            .limit(1);

        if (existing.length === 0) {
            return NextResponse.json({ error: "Product not found" }, { status: 404 });
        }

        await db
            .update(products)
            .set({ badge: "None", updatedAt: new Date() })
            .where(eq(products.id, productId));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error showing product:", error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { error: "Failed to show product", details: errorMessage },
            { status: 500 }
        );
    }
}
