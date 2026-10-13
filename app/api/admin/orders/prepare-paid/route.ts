import { NextRequest, NextResponse } from "next/server";
import { and, eq, inArray, isNotNull, isNull, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { orderStatusHistory, orders } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { createNotification } from "@/lib/services/notifications";

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const adminId = authResult.session?.user?.id;
    if (!adminId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preparedOrders = await db.transaction(async (tx) => {
      const eligibleOrders = await tx
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          userId: orders.userId,
          status: orders.status,
          shippingStatus: orders.shippingStatus,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, "processing"),
            isNotNull(orders.paymentVerified),
            or(isNull(orders.shippingStatus), eq(orders.shippingStatus, "pending"))
          )
        )
        .for("update");

      if (!eligibleOrders.length) {
        return [];
      }

      const preparedAt = new Date();
      await tx
        .update(orders)
        .set({ shippingStatus: "preparing", updatedAt: preparedAt })
        .where(inArray(orders.id, eligibleOrders.map((order) => order.id)));

      const changedOrders = eligibleOrders.filter(
        (order) => order.shippingStatus !== "preparing"
      );
      if (changedOrders.length) {
        await tx.insert(orderStatusHistory).values(
          changedOrders.map((order) => ({
            orderId: order.id,
            status: order.status,
            previousStatus: order.status,
            changedBy: adminId,
            changedByType: "admin",
            notes: "Shipping status updated to 'preparing' by bulk action",
            createdAt: preparedAt,
          }))
        );

      }

      return changedOrders;
    });

    for (const order of preparedOrders) {
      if (!order.userId) continue;
      const notification = await createNotification({
        userId: order.userId,
        type: "order_pending",
        title: "Order Being Prepared",
        titleFa: "سفارش در حال آماده‌سازی",
        message: `Your order #${order.orderNumber} is being prepared for shipment.`,
        messageFa: `سفارش #${order.orderNumber} شما در حال آماده‌سازی برای ارسال است.`,
        notificationData: { orderId: order.id, orderNumber: order.orderNumber },
      });
      if (!notification.success) {
        console.error(
          `Failed to notify user about prepared order ${order.orderNumber}:`,
          notification.error
        );
      }
    }

    return NextResponse.json({ success: true, updatedCount: preparedOrders.length });
  } catch (error) {
    console.error("Error preparing paid orders:", error);
    return NextResponse.json(
      { error: "Failed to prepare paid orders" },
      { status: 500 }
    );
  }
}
