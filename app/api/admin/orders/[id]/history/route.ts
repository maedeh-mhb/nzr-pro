import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderStatusHistory, users } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "view_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    // Fetch order status history
    const history = await db
      .select()
      .from(orderStatusHistory)
      .where(eq(orderStatusHistory.orderId, id))
      .orderBy(desc(orderStatusHistory.createdAt));

    // Fetch user names for changedBy fields
    const userIds = new Set(
      history
        .filter((h) => h.changedBy && h.changedByType === "admin")
        .map((h) => h.changedBy!)
    );

    const usersMap = new Map();
    for (const userId of userIds) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        usersMap.set(userId, user);
      }
    }

    // Format history with user names
    const formattedHistory = history.map((entry) => {
      let changedByName = "System";
      if (entry.changedByType === "admin" && entry.changedBy) {
        const user = usersMap.get(entry.changedBy);
        if (user) {
          changedByName = `${user.name} ${user.surname || ""}`.trim();
        }
      } else if (entry.changedByType === "user") {
        changedByName = "Customer";
      }

      return {
        id: entry.id,
        status: entry.status,
        previousStatus: entry.previousStatus,
        changedBy: entry.changedBy,
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

