import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/[orderNumber]
 * Get order details by order number (public endpoint for order confirmation page)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> | { orderNumber: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const orderNumber = resolvedParams.orderNumber;

    if (!orderNumber) {
      return NextResponse.json({ error: "Order number is required" }, { status: 400 });
    }

    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });
    // Transform items for frontend
    const orderItemsData = items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      productNameFa: item.productNameFa ?? null,
      quantity: item.quantity,
      price: item.price.toString(),
    }));

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        paymentMethod: order.paymentMethod,
        shippingMethod: order.shippingMethod,
        discountAmount: order.discountAmount,
        createdAt: order.createdAt,
      },
      items: orderItemsData,
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
