import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, products, orderStatusHistory } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/admin/orders/[id]/modify
 * Modify order items (add, remove, update quantities)
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
    const { items } = body; // Array of { id?: string, productId: string, quantity: number } or { id: string, quantity: number } for updates

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "items must be an array" },
        { status: 400 }
      );
    }

    // Verify order exists and can be modified
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, id),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Don't allow modification of cancelled or delivered orders
    if (order.status === "cancelled" || order.status === "delivered") {
      return NextResponse.json(
        { error: "Cannot modify cancelled or delivered orders" },
        { status: 400 }
      );
    }

    // Get current order items
    const currentItems = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, id),
    });

    // Process modifications in a transaction
    const result = await db.transaction(async (tx) => {
      const itemsToAdd: Array<{ productId: string; quantity: number }> = [];
      const itemsToUpdate: Array<{ id: string; quantity: number }> = [];
      const itemsToRemove: typeof currentItems = [];
      const itemsToKeep = new Set<string>();

      // Process each item in the request
      for (const item of items) {
        if (item.id) {
          // Existing item - update quantity
          const existingItem = currentItems.find((i) => i.id === item.id);
          if (existingItem) {
            if (item.quantity > 0) {
              itemsToUpdate.push({ id: item.id, quantity: item.quantity });
              itemsToKeep.add(item.id);
            } else {
              itemsToRemove.push(existingItem);
            }
          }
        } else if (item.productId && item.quantity > 0) {
          // New item - add
          itemsToAdd.push({ productId: item.productId, quantity: item.quantity });
        }
      }

      // Find items to remove (items not in the request)
      for (const currentItem of currentItems) {
        if (!itemsToKeep.has(currentItem.id)) {
          itemsToRemove.push(currentItem);
        }
      }

      // 1. Restore inventory for removed items
      for (const item of itemsToRemove) {
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

      // 2. Restore inventory for quantity reductions
      for (const update of itemsToUpdate) {
        const existingItem = currentItems.find((i) => i.id === update.id);
        if (existingItem && update.quantity < existingItem.quantity) {
          const quantityDiff = existingItem.quantity - update.quantity;
          const lockedProducts = await tx.execute(
            sql`SELECT * FROM products WHERE id = ${existingItem.productId} FOR UPDATE`
          );
          const product = (lockedProducts as any).rows?.[0] as any;
          if (product) {
            const currentQuantity = parseFloat(product.quantity?.toString() || "0");
            const restoredQuantity = currentQuantity + quantityDiff;
            await tx
              .update(products)
              .set({
                quantity: restoredQuantity,
              })
              .where(eq(products.id, existingItem.productId));
          }
        }
      }

      // 3. Remove deleted items
      for (const item of itemsToRemove) {
        await tx.delete(orderItems).where(eq(orderItems.id, item.id));
      }

      // 4. Update existing items
      for (const update of itemsToUpdate) {
        const existingItem = currentItems.find((i) => i.id === update.id);
        if (existingItem) {
          // Get current product price
          const product = await tx.query.products.findFirst({
            where: eq(products.id, existingItem.productId),
          });

          if (product) {
            const newPrice = product.price;
            await tx
              .update(orderItems)
              .set({
                quantity: update.quantity,
                price: newPrice,
              })
              .where(eq(orderItems.id, update.id));
          }
        }
      }

      // 5. Add new items and deduct inventory
      let newTotal = 0;
      for (const addItem of itemsToAdd) {
        // Lock and validate product
        const lockedProducts = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${addItem.productId} FOR UPDATE`
        );
        const product = (lockedProducts as any).rows?.[0] as any;

        if (!product) {
          throw new Error(`Product ${addItem.productId} not found`);
        }

        const currentQuantity = parseFloat(product.quantity?.toString() || "0");
        if (currentQuantity < addItem.quantity) {
          throw new Error(`Insufficient inventory for product ${product.name || addItem.productId}`);
        }

        // Deduct inventory
        const newQuantity = currentQuantity - addItem.quantity;
        await tx
          .update(products)
          .set({
            quantity: newQuantity,
          })
          .where(eq(products.id, addItem.productId));

        // Add order item
        await tx.insert(orderItems).values({
          orderId: id,
          productId: addItem.productId,
          productName: product.name || "Unknown Product",
          price: product.price,
          quantity: addItem.quantity,
          fulfilledQuantity: 0,
        });

        newTotal += parseFloat(product.price?.toString() || "0") * addItem.quantity;
      }

      // 6. Recalculate order total
      const allItems = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, id),
      });

      let calculatedTotal = 0;
      for (const item of allItems) {
        calculatedTotal += parseFloat(item.price?.toString() || "0") * item.quantity;
      }

      // Apply discount if exists
      const finalTotal = order.discountAmount
        ? calculatedTotal - parseFloat(order.discountAmount?.toString() || "0")
        : calculatedTotal;

      // Update order total
      await tx
        .update(orders)
        .set({
          total: finalTotal.toString(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, id));

      // 7. Record status change
      await tx.insert(orderStatusHistory).values({
        orderId: id,
        status: order.status,
        previousStatus: order.status,
        changedBy: session.user.id,
        changedByType: "admin",
        notes: `Order modified: ${itemsToAdd.length} added, ${itemsToUpdate.length} updated, ${itemsToRemove.length} removed`,
      });

      return {
        items: allItems,
        total: finalTotal,
      };
    });

    // Send notification to user if order was modified (only for registered users)
    if (order.userId && order.orderNumber) {
      try {
        await createNotification({
          userId: order.userId,
          type: "order_pending",
          title: "Order Modified",
          titleFa: "سفارش تغییر یافت",
          message: `Your order #${order.orderNumber} has been modified. Please review the changes.`,
          messageFa: `سفارش #${order.orderNumber} شما تغییر یافت. لطفاً تغییرات را بررسی کنید.`,
          notificationData: { orderId: id, orderNumber: order.orderNumber },
        });

        // Create activity for order modification
        await createActivity({
          userId: order.userId,
          activityType: "order_modified" as any,
          activityData: {
            orderId: id,
            orderNumber: order.orderNumber,
          },
        });
      } catch (error) {
        console.error("Error creating order modification notification/activity:", error);
        // Don't fail the update if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        total: result.total.toString(),
      },
      items: result.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: item.price,
        quantity: item.quantity,
        fulfilledQuantity: item.fulfilledQuantity || 0,
      })),
    });
  } catch (error) {
    console.error("Error modifying order:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to modify order", details: errorMessage },
      { status: 500 }
    );
  }
}

