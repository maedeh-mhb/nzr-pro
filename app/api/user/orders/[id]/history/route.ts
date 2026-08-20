import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderStatusHistory, orders } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    // Verify the order belongs to the user
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch order status history
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(desc(orderStatusHistory.createdAt));

    // Format history
    const formattedHistory = history.map((entry) => {
      let changedByName = "System";
      if (entry.changedByType === "user") {
        changedByName = "You";
      } else if (entry.changedByType === "admin") {
        changedByName = "Admin";
      }

      return {
        id: entry.id,
        status: entry.status,
        previousStatus: entry.previousStatus,
        changedByType: entry.changedByType,
        changedByName,
        notes: entry.notes,
        createdAt: entry.createdAt,
      };
    });

    return NextResponse.json({ history: formattedHistory });
  } catch (error) {
    console.error("Error fetching order status history:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch order status history", details: errorMessage },
      { status: 500 }
    );
  }
}

