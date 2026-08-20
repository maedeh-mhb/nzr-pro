import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq, desc, count as drizzleCount } from "drizzle-orm";
import { paginatedResponse } from "@/lib/utils/apiResponse";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate pagination params
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Get total count
    const totalResult = await db
      .select({ count: drizzleCount() })
      .from(orders)
      .where(eq(orders.userId, userId));
    const total = totalResult[0]?.count || 0;

    // Calculate offset and fetch paginated orders
    const offset = (page - 1) * limit;
    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt))
      .offset(offset)
      .limit(limit);

    // Fetch order items for each order
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const items = await db.query.orderItems.findMany({
          where: eq(orderItems.orderId, order.id),
        });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentVerified: order.paymentVerified,
          shippingMethod: order.shippingMethod,
          shippingStatus: order.shippingStatus,
          trackingCode: order.trackingCode,
          deliveryConfirmedByUser: order.deliveryConfirmedByUser,
          items: items.map((item) => ({
            productName: item.productName,
            productNameFa: item.productNameFa, // Include Farsi name
            quantity: item.quantity,
            price: item.price,
          })),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      })
    );

    return paginatedResponse(ordersWithItems, page, limit, total);
  } catch (error) {
    console.error("Error fetching user orders:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch orders", details: errorMessage },
      { status: 500 }
    );
  }
}

