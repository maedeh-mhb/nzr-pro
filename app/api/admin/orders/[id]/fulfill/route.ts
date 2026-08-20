import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orderItems, orders, orderStatusHistory } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/orders/[id]/fulfill
 * Update fulfilled quantity for order items
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }
    const session = authResult.session;
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { itemFulfillments } = body; // Array of { itemId: string, fulfilledQuantity: number }

    if (!Array.isArray(itemFulfillments)) {
      return NextResponse.json(
        { error: "itemFulfillments must be an array" },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Update fulfilled quantities in a transaction
    await db.transaction(async (tx) => {
      for (const fulfillment of itemFulfillments) {
        const { itemId, fulfilledQuantity } = fulfillment;

        if (!itemId || typeof fulfilledQuantity !== "number" || fulfilledQuantity < 0) {
          continue; // Skip invalid entries
        }

        // Get the order item to validate
        const item = await tx.query.orderItems.findFirst({
          where: eq(orderItems.id, itemId),
        });

        if (!item || item.orderId !== id) {
          continue; // Skip if item doesn't exist or doesn't belong to this order
        }

        // Ensure fulfilled quantity doesn't exceed ordered quantity
        const validFulfilledQuantity = Math.min(fulfilledQuantity, item.quantity);

        // Update fulfilled quantity
        await tx
          .update(orderItems)
          .set({
            fulfilledQuantity: validFulfilledQuantity,
          })
          .where(eq(orderItems.id, itemId));
      }

      // Check if all items are fully fulfilled
      const allItems = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, id),
      });

      const allFulfilled = allItems.every(
        (item) => item.fulfilledQuantity >= item.quantity
      );
      const anyFulfilled = allItems.some((item) => item.fulfilledQuantity > 0);

      // Update order shipping status based on fulfillment
      if (allFulfilled && order.shippingStatus !== "delivered") {
        // If all items are fulfilled, mark as shipped (if not already delivered)
        if (order.shippingStatus !== "shipped" && order.shippingStatus !== "in_transit") {
          await tx
            .update(orders)
            .set({
              shippingStatus: "shipped",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, id));

          // Record status change
          await tx.insert(orderStatusHistory).values({
            orderId: id,
            status: order.status,
            previousStatus: order.status,
            changedBy: session.user.id,
            changedByType: "admin",
            notes: "Shipping status updated to 'shipped' - all items fulfilled",
          });
        }
      } else if (anyFulfilled && !allFulfilled) {
        // If some items are fulfilled, mark as preparing (partial fulfillment)
        if (order.shippingStatus !== "preparing" && order.shippingStatus !== "shipped") {
          await tx
            .update(orders)
            .set({
              shippingStatus: "preparing",
              updatedAt: new Date(),
            })
            .where(eq(orders.id, id));

          // Record status change
          await tx.insert(orderStatusHistory).values({
            orderId: id,
            status: order.status,
            previousStatus: order.status,
            changedBy: session.user.id,
            changedByType: "admin",
            notes: "Shipping status updated to 'preparing' - partial fulfillment",
          });
        }
      }
    });

    // Fetch updated order to check if shipping status changed
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if shipping status changed and send notification
    const shippingStatusChanged = updatedOrder.shippingStatus !== order.shippingStatus;
    const orderUserId = updatedOrder.userId;
    const orderNumber = updatedOrder.orderNumber;

    if (shippingStatusChanged && orderUserId && orderNumber) {
      try {
        let notificationTitle = "";
        let notificationTitleFa = "";
        let notificationMessage = "";
        let notificationMessageFa = "";
        let notificationType: "order_pending" | "order_shipped" | "order_delivered" = "order_pending";

        switch (updatedOrder.shippingStatus) {
          case "preparing":
            notificationTitle = "Order Being Prepared";
            notificationTitleFa = "سفارش در حال آماده‌سازی";
            notificationMessage = `Your order #${orderNumber} is being prepared for shipment.`;
            notificationMessageFa = `سفارش #${orderNumber} شما در حال آماده‌سازی برای ارسال است.`;
            notificationType = "order_pending";
            break;
          case "shipped":
            notificationTitle = "Order Shipped";
            notificationTitleFa = "سفارش ارسال شد";
            notificationMessage = `Your order #${orderNumber} has been shipped!`;
            notificationMessageFa = `سفارش #${orderNumber} شما ارسال شد!`;
            notificationType = "order_shipped";
            break;
        }

        if (notificationTitle) {
          await createNotification({
            userId: orderUserId,
            type: notificationType,
            title: notificationTitle,
            titleFa: notificationTitleFa,
            message: notificationMessage,
            messageFa: notificationMessageFa,
            notificationData: { orderId: id, orderNumber: orderNumber },
          });

          // Create activity for shipping status change
          await createActivity({
            userId: orderUserId,
            activityType: `shipping_${updatedOrder.shippingStatus}` as any,
            activityData: {
              orderId: id,
              orderNumber: orderNumber,
            },
          });
        }
      } catch (error) {
        console.error("Error creating shipping status change notification/activity:", error);
        // Don't fail the update if notification fails
      }
    }

    // Fetch updated order items
    const updatedItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, id),
    });

    return NextResponse.json({
      success: true,
      items: updatedItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        fulfilledQuantity: item.fulfilledQuantity,
      })),
    });
  } catch (error) {
    console.error("Error updating fulfillment:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update fulfillment", details: errorMessage },
      { status: 500 }
    );
  }
}

