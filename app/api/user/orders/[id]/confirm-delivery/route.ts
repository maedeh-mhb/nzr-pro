import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const orderId = params.id;

        // Get the order
        const order = await db
            .select()
            .from(orders)
            .where(eq(orders.id, orderId))
            .limit(1);

        if (!order || order.length === 0) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        // Check if the order belongs to the user
        if (order[0].userId !== session.user.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        // Check if order status is delivered
        if (order[0].status !== "delivered") {
            return NextResponse.json(
                { error: "Order must be in delivered status to confirm delivery" },
                { status: 400 }
            );
        }

        // Update the order with delivery confirmation
        const now = new Date();
        await db
            .update(orders)
            .set({
                deliveryConfirmedByUser: now,
                deliveryConfirmedAt: now,
                updatedAt: now,
            })
            .where(eq(orders.id, orderId));

        return NextResponse.json(
            {
                success: true,
                message: "Delivery confirmed successfully",
                deliveryConfirmedByUser: now.toISOString(),
            },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error confirming delivery:", error);
        return NextResponse.json(
            { error: "Failed to confirm delivery" },
            { status: 500 }
        );
    }
}
