import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users, products, discountCodes, discountCodeUsages, orderStatusHistory } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

// GET - Fetch order details by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, ["view_orders", "edit_orders"], { requireAll: false });
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Fetch order items
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });
    const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
    const shippingCost = order.shippingMethod === "courier"
      ? 0
      : Math.max(0, parseFloat(order.total) - subtotal + parseFloat(order.discountAmount || "0"));

    // Fetch guest order if exists
    const guestOrder = await db.query.guestOrders.findFirst({
      where: eq(guestOrders.orderId, order.id),
    });

    // Fetch user if registered order
    let user = null;
    if (order.userId) {
      user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
      });
    }

    const provincesFilePath = path.join(process.cwd(), "public", "data", "provinces-en.json");
    const citiesFilePath = path.join(process.cwd(), "public", "data", "cities-en.json");
    const provinces = JSON.parse(fs.readFileSync(provincesFilePath, "utf8")) as Array<{ id: number; name: string }>;
    const cities = JSON.parse(fs.readFileSync(citiesFilePath, "utf8")) as Array<{ id: number; name: string; province_id?: number }>;

    const getProvinceName = (provinceId: number | null | undefined) => {
      if (!provinceId) return null;
      return provinces.find((p) => p.id === provinceId)?.name || null;
    };

    const getCityName = (cityId: number | null | undefined, provinceId: number | null | undefined) => {
      if (!cityId) return null;
      const city = cities.find((c) => c.id === cityId && (provinceId == null || c.province_id === provinceId));
      return city?.name || null;
    };

    return NextResponse.json({
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        userId: order.userId,
        isGuest: !!guestOrder,
        customerName: guestOrder
          ? guestOrder.guestName
          : user
            ? `${user.name} ${user.surname || ""}`.trim()
            : "Unknown",
        customerEmail: guestOrder ? guestOrder.guestEmail : user?.email || "",
        customerPhone: guestOrder ? guestOrder.guestPhone : user?.phone || "",
        guestAddress: guestOrder
          ? {
            provinceId: guestOrder.provinceId,
            cityId: guestOrder.cityId,
            address: guestOrder.address,
            provinceName: getProvinceName(guestOrder.provinceId),
            cityName: getCityName(guestOrder.cityId, guestOrder.provinceId),
            postalCode: guestOrder.postalCode || null,
          }
          : null,
        shippingAddress: order.shippingAddress
          ? {
            provinceId: order.shippingProvinceId,
            cityId: order.shippingCityId,
            address: order.shippingAddress,
            provinceName: getProvinceName(order.shippingProvinceId),
            cityName: getCityName(order.shippingCityId, order.shippingProvinceId),
            postalCode: order.shippingPostalCode || null,
          }
          : null,
        status: order.status,
        total: order.total,
        shippingCost,
        paymentMethod: order.paymentMethod,
        paymentVerified: order.paymentVerified,
        shippingMethod: order.shippingMethod,
        shippingStatus: order.shippingStatus,
        trackingCode: order.trackingCode,
        discountCodeId: order.discountCodeId,
        discountAmount: order.discountAmount,
        items: items.map((item) => ({
          id: item.id,
          productId: item.productId,
          productName: item.productName,
          productNameFa: item.productNameFa || null,
          quantity: item.quantity,
          price: item.price,
          fulfilledQuantity: item.fulfilledQuantity || 0,
        })),
        invoiceRequested: order.invoiceRequested,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch order", details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update order (payment verification, shipping status, etc.)
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
    const { paymentVerified, shippingStatus, status, trackingCode } = body;
    let statusToApply = status as string | undefined;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Track implicit status transitions (e.g., auto-progress after payment verification)
    let autoStatusProgressed = false;
    let autoStatusPrevious: string | null = null;
    let autoStatusNext: string | null = null;

    // Check if payment was not previously verified (to avoid duplicate notifications/rewards)
    let wasNotVerified = false;
    let orderUserId: string | null = null;
    let orderNumber: string | null = null;

    if (paymentVerified !== undefined && paymentVerified === true) {
      const currentOrder = await db.query.orders.findFirst({
        where: eq(orders.id, id),
      });
      wasNotVerified = !currentOrder?.paymentVerified;
      orderUserId = currentOrder?.userId || null;
      orderNumber = currentOrder?.orderNumber || null;
    }

    // Update payment verification
    if (paymentVerified !== undefined) {
      if (paymentVerified === true) {
        updateData.paymentVerified = new Date();
        // If payment is verified and status is pending, change to processing
        if (status === undefined) {
          const currentOrder = await db.query.orders.findFirst({
            where: eq(orders.id, id),
          });
          if (currentOrder?.status === "pending" || currentOrder?.status === "pending_payment") {
            updateData.status = "processing";
            autoStatusProgressed = true;
            autoStatusPrevious = currentOrder?.status || null;
            autoStatusNext = "processing";
          }
        }
      } else if (paymentVerified === false) {
        updateData.paymentVerified = null;
        // Capture order info for rejection notification
        const currentOrder = await db.query.orders.findFirst({
          where: eq(orders.id, id),
        });
        orderUserId = currentOrder?.userId || null;
        orderNumber = currentOrder?.orderNumber || null;
      }
    }

    // Update shipping status
    if (shippingStatus !== undefined) {
      updateData.shippingStatus = shippingStatus || null;
    }

    // Update tracking code
    if (trackingCode !== undefined) {
      updateData.trackingCode = trackingCode || null;
    }

    // Get current order state before updating (needed for cancellation logic)
    const currentOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!currentOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if order is being cancelled
    // Derive an order status from shipping status when none is explicitly provided
    if (statusToApply === undefined && shippingStatus !== undefined) {
      const shippingToStatusMap: Record<string, string> = {
        preparing: "processing",
        shipped: "shipped",
        in_transit: "shipped",
        delivered: "delivered",
      };
      const mappedStatus = shippingToStatusMap[shippingStatus];
      if (mappedStatus && mappedStatus !== currentOrder.status) {
        statusToApply = mappedStatus;
      }
    }

    const isBeingCancelled = statusToApply === "cancelled" && currentOrder.status !== "cancelled";
    const wasCancelled = currentOrder.status === "cancelled";
    const statusChanged = statusToApply !== undefined && statusToApply !== currentOrder.status;
    const shippingStatusChanged = shippingStatus !== undefined && shippingStatus !== currentOrder.shippingStatus;
    const trackingCodeAdded = trackingCode !== undefined && !currentOrder.trackingCode && trackingCode.trim() !== "";

    // Update order status
    if (statusToApply !== undefined) {
      updateData.status = statusToApply;
    }

    // If order is being cancelled, restore inventory and reverse discount code usage
    if (isBeingCancelled) {
      // Wrap cancellation operations in a transaction
      await db.transaction(async (tx) => {
        // 1. Restore product inventory
        const orderItemsList = await tx
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, id));

        for (const item of orderItemsList) {
          // Lock product row to prevent race conditions
          const lockedProducts = await tx.execute(
            sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
          );

          const product = (lockedProducts as any).rows?.[0] as any;
          if (product) {
            const currentQuantity = parseFloat(product.quantity?.toString() || "0");
            const restoredQuantity = currentQuantity + item.quantity;

            await tx
              .update(products)
              .set({
                quantity: restoredQuantity,
              })
              .where(eq(products.id, item.productId));
          }
        }

        // 2. Reverse discount code usage if order used a discount code
        if (currentOrder.discountCodeId) {
          // Delete the usage record
          await tx
            .delete(discountCodeUsages)
            .where(eq(discountCodeUsages.orderId, id));

          // Decrement usage count
          await tx
            .update(discountCodes)
            .set({
              usageCount: sql`GREATEST(0, ${discountCodes.usageCount} - 1)`, // Prevent negative counts
              updatedAt: new Date(),
            })
            .where(eq(discountCodes.id, currentOrder.discountCodeId));
        }

        // 3. Update order status to cancelled
        await tx
          .update(orders)
          .set({
            ...updateData,
            status: "cancelled",
            updatedAt: new Date(),
          })
          .where(eq(orders.id, id));

        // 4. Record status change in history
        await tx.insert(orderStatusHistory).values({
          orderId: id,
          status: "cancelled",
          previousStatus: currentOrder.status,
          changedBy: session.user.id,
          changedByType: "admin",
          notes: body.cancellationReason || null,
        });
      });
    } else {
      // Normal update (not cancellation)
      const [updated] = await db
        .update(orders)
        .set(updateData)
        .where(eq(orders.id, id))
        .returning();

      if (!updated) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      // Record status change in history if status changed
      if (statusChanged) {
        await db.insert(orderStatusHistory).values({
          orderId: id,
          status: statusToApply!,
          previousStatus: currentOrder.status,
          changedBy: session.user.id,
          changedByType: "admin",
          notes: body.statusNotes || null,
        });
      } else if (autoStatusProgressed && autoStatusNext) {
        await db.insert(orderStatusHistory).values({
          orderId: id,
          status: autoStatusNext,
          previousStatus: autoStatusPrevious,
          changedBy: session.user.id,
          changedByType: "admin",
          notes: "Auto-progressed after payment verification",
        });
      }
    }

    // Fetch updated order
    const updatedOrder = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!updatedOrder) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Create notification for order cancellation
    if (isBeingCancelled && orderUserId) {
      try {
        await createNotification({
          userId: orderUserId,
          type: "order_pending",
          title: "Order Cancelled",
          titleFa: "سفارش لغو شد",
          message: `Your order #${currentOrder.orderNumber} has been cancelled.`,
          messageFa: `سفارش #${currentOrder.orderNumber} شما لغو شد.`,
          notificationData: { orderId: id, orderNumber: currentOrder.orderNumber },
        });

        await createActivity({
          userId: orderUserId,
          activityType: "order_cancelled" as any,
          activityData: {
            orderId: id,
            orderNumber: currentOrder.orderNumber,
          },
        });
      } catch (error) {
        console.error("Error creating cancellation notification/activity:", error);
        // Don't fail the update if notification fails
      }
    }

    // Get orderUserId and orderNumber for notifications (if not already set)
    if (!orderUserId && updatedOrder.userId) {
      orderUserId = updatedOrder.userId;
    }
    if (!orderNumber && updatedOrder.orderNumber) {
      orderNumber = updatedOrder.orderNumber;
    }

    // Create notification when payment is rejected
    if (paymentVerified === false && orderUserId && orderNumber) {
      try {
        await createNotification({
          userId: orderUserId,
          type: "order_pending",
          title: "Payment Rejected",
          titleFa: "پرداخت رد شد",
          message: `Your payment for order #${orderNumber} was rejected. Please contact support or try again.`,
          messageFa: `پرداخت سفارش #${orderNumber} شما رد شد. لطفاً با پشتیبانی تماس بگیرید یا دوباره تلاش کنید.`,
          notificationData: { orderId: id, orderNumber },
        });

        await createActivity({
          userId: orderUserId,
          activityType: "payment_rejected" as any,
          activityData: { orderId: id, orderNumber },
        });
      } catch (error) {
        console.error("Error creating payment rejection notification:", error);
      }
    }

    // After updating the order, create notifications and distribute rewards if payment was just verified
    if (paymentVerified === true && wasNotVerified && orderUserId && orderNumber && !isBeingCancelled) {
      try {
        await createNotification({
          userId: orderUserId,
          type: "order_pending", // Reusing order_pending type
          title: "Payment Verified",
          titleFa: "پرداخت تأیید شد",
          message: `Your payment for order #${orderNumber} has been verified.`,
          messageFa: `پرداخت سفارش #${orderNumber} شما تأیید شد.`,
          notificationData: { orderId: id, orderNumber: orderNumber },
        });

        // Create activity for payment verification
        await createActivity({
          userId: orderUserId,
          activityType: "payment_verified",
          activityData: {
            orderId: id,
            orderNumber: orderNumber,
          },
        });

        // Distribute rewards for this order (now that paymentVerified is updated in DB)
        try {
          const { distributeOrderRewards } = await import("@/lib/services/rewards");
          await distributeOrderRewards(id);
        } catch (rewardError) {
          console.error("Error distributing rewards:", rewardError);
          // Don't fail the update if reward distribution fails
        }
      } catch (notificationError) {
        console.error("Error creating payment verification notification/activity:", notificationError);
        // Don't fail the update if notification/activity fails
      }
    }

    // Create notification for order status changes (only for registered users)
    if ((statusChanged || autoStatusProgressed) && orderUserId && orderNumber && !isBeingCancelled) {
      try {
        const nextStatus = statusChanged ? statusToApply : autoStatusNext;

        if (!nextStatus) {
          console.error("Status notification skipped: missing next status");
        } else {
          let notificationTitle = "";
          let notificationTitleFa = "";
          let notificationMessage = "";
          let notificationMessageFa = "";
          let notificationType: "order_pending" | "order_shipped" | "order_delivered" = "order_pending";

          switch (nextStatus) {
            case "processing":
              notificationTitle = "Order Processing";
              notificationTitleFa = "سفارش در حال پردازش";
              notificationMessage = `Your order #${orderNumber} is now being processed.`;
              notificationMessageFa = `سفارش #${orderNumber} شما در حال پردازش است.`;
              notificationType = "order_pending";
              break;
            case "shipped":
              notificationTitle = "Order Shipped";
              notificationTitleFa = "سفارش ارسال شد";
              notificationMessage = `Your order #${orderNumber} has been shipped!`;
              notificationMessageFa = `سفارش #${orderNumber} شما ارسال شد!`;
              notificationType = "order_shipped";
              break;
            case "delivered":
              notificationTitle = "Order Delivered";
              notificationTitleFa = "سفارش تحویل داده شد";
              notificationMessage = `Your order #${orderNumber} has been delivered.`;
              notificationMessageFa = `سفارش #${orderNumber} شما تحویل داده شد.`;
              notificationType = "order_delivered";
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

            // Create activity for status change
            await createActivity({
              userId: orderUserId,
              activityType: `order_${nextStatus}` as any,
              activityData: {
                orderId: id,
                orderNumber: orderNumber,
              },
            });
          }
        }
      } catch (error) {
        console.error("Error creating order status change notification/activity:", error);
        // Don't fail the update if notification fails
      }
    }

    // Create notification for shipping status changes (only for registered users)
    if (shippingStatusChanged && orderUserId && orderNumber && !isBeingCancelled) {
      try {
        let notificationTitle = "";
        let notificationTitleFa = "";
        let notificationMessage = "";
        let notificationMessageFa = "";
        let notificationType: "order_pending" | "order_shipped" | "order_delivered" = "order_pending";

        switch (shippingStatus) {
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
          case "in_transit":
            notificationTitle = "Order In Transit";
            notificationTitleFa = "سفارش در راه است";
            notificationMessage = `Your order #${orderNumber} is on the way to you.`;
            notificationMessageFa = `سفارش #${orderNumber} شما در راه شماست.`;
            notificationType = "order_shipped";
            break;
          case "delivered":
            notificationTitle = "Order Delivered";
            notificationTitleFa = "سفارش تحویل داده شد";
            notificationMessage = `Your order #${orderNumber} has been delivered.`;
            notificationMessageFa = `سفارش #${orderNumber} شما تحویل داده شد.`;
            notificationType = "order_delivered";
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
            activityType: `shipping_${shippingStatus}` as any,
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

    // Create notification when tracking code is added (only for registered users)
    if (trackingCodeAdded && orderUserId && orderNumber && !isBeingCancelled) {
      try {
        await createNotification({
          userId: orderUserId,
          type: "order_shipped",
          title: "Tracking Code Added",
          titleFa: "کد رهگیری اضافه شد",
          message: `Tracking code for order #${orderNumber}: ${trackingCode}`,
          messageFa: `کد رهگیری سفارش #${orderNumber}: ${trackingCode}`,
          notificationData: { orderId: id, orderNumber: orderNumber, trackingCode: trackingCode },
        });

        // Create activity for tracking code
        await createActivity({
          userId: orderUserId,
          activityType: "tracking_code_added" as any,
          activityData: {
            orderId: id,
            orderNumber: orderNumber,
            trackingCode: trackingCode,
          },
        });
      } catch (error) {
        console.error("Error creating tracking code notification/activity:", error);
        // Don't fail the update if notification fails
      }
    }

    // Fetch updated order with items
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, updatedOrder.id),
    });

    const guestOrder = await db.query.guestOrders.findFirst({
      where: eq(guestOrders.orderId, updatedOrder.id),
    });

    let user = null;
    if (updatedOrder.userId) {
      user = await db.query.users.findFirst({
        where: eq(users.id, updatedOrder.userId),
      });
    }

    return NextResponse.json({
      order: {
        id: updatedOrder.id,
        orderNumber: updatedOrder.orderNumber,
        userId: updatedOrder.userId,
        isGuest: !!guestOrder,
        customerName: guestOrder
          ? guestOrder.guestName
          : user
            ? `${user.name} ${user.surname || ""}`.trim()
            : "Unknown",
        customerEmail: guestOrder ? guestOrder.guestEmail : user?.email || "",
        customerPhone: guestOrder ? guestOrder.guestPhone : user?.phone || "",
        guestAddress: guestOrder
          ? {
            provinceId: guestOrder.provinceId,
            cityId: guestOrder.cityId,
            address: guestOrder.address,
          }
          : null,
        status: updatedOrder.status,
        total: updatedOrder.total,
        paymentMethod: updatedOrder.paymentMethod,
        paymentVerified: updatedOrder.paymentVerified,
        shippingMethod: updatedOrder.shippingMethod,
        shippingStatus: updatedOrder.shippingStatus,
        trackingCode: updatedOrder.trackingCode,
        discountCodeId: updatedOrder.discountCodeId,
        discountAmount: updatedOrder.discountAmount,
        items: items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        })),
        createdAt: updatedOrder.createdAt,
        updatedAt: updatedOrder.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating order:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update order", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "cancel_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await db.transaction(async (tx) => {
      await tx.delete(discountCodeUsages).where(eq(discountCodeUsages.orderId, id));
      await tx.delete(orders).where(eq(orders.id, id));
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting order:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete order", details: errorMessage },
      { status: 500 }
    );
  }
}

