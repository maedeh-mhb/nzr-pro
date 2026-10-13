import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { eq, sql } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  discountCodes,
  guestOrders,
  orderItems,
  orders,
  products,
  shippingSettings,
  walletTransactions,
} from "@/lib/db/schema";
import {
  calculateWeightBasedShippingCost,
  DEFAULT_SHIPPING_WEIGHT_RATES,
} from "@/lib/shipping/weightRates";
import {
  isOrderEditTokenValid,
  isOrderWithinEditWindow,
} from "@/lib/utils/orderEditing";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const requestedItems = body.items;
    const editToken = typeof body.editToken === "string" ? body.editToken : "";
    if (
      !Array.isArray(requestedItems) ||
      requestedItems.length > 100 ||
      requestedItems.some(
        (item) =>
          typeof item?.productId !== "string" ||
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 0 ||
          item.quantity > 1000
      )
    ) {
      return NextResponse.json({ error: "Invalid order items" }, { status: 400 });
    }
    const desired = new Map<string, number>();
    for (const item of requestedItems) {
      if (item.quantity) {
        desired.set(
          item.productId,
          (desired.get(item.productId) || 0) + item.quantity
        );
      }
    }
    if ([...desired.values()].some((quantity) => quantity > 1000)) {
      return NextResponse.json({ error: "Order contains invalid quantities" }, { status: 400 });
    }

    const order = await db.query.orders.findFirst({
      where: eq(orders.id, params.id),
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const guest = await db.query.guestOrders.findFirst({
      where: eq(guestOrders.orderId, order.id),
    });
    const owner = Boolean(order.userId) && session?.user?.id === order.userId;
    const guestHasAccess =
      Boolean(guest) &&
      isOrderEditTokenValid(editToken, guest?.editTokenHash) &&
      Boolean(guest?.editExpiresAt) &&
      guest!.editExpiresAt!.getTime() > Date.now();
    if (!owner && !guestHasAccess) {
      return NextResponse.json({ error: "Unauthorized order access" }, { status: 403 });
    }
    const isPaidOrder = Boolean(order.paymentVerified);
    const isUnpaidEditableOrder =
      ["pending", "payment_pending"].includes(order.status) &&
      !order.paymentVerified &&
      !order.zibalTrackId;
    const isPaidEditableOrder =
      order.status === "processing" && isPaidOrder && Boolean(order.userId);
    if (!isOrderWithinEditWindow(order.createdAt) || (!isUnpaidEditableOrder && !isPaidEditableOrder)) {
      return NextResponse.json({ error: "Order is no longer editable" }, { status: 409 });
    }

    const result = await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT id FROM orders WHERE id = ${order.id} FOR UPDATE`);
      const lockedOrder = await tx.query.orders.findFirst({ where: eq(orders.id, order.id) });
      if (!lockedOrder || !isOrderWithinEditWindow(lockedOrder.createdAt)) {
        throw new Error("ORDER_NOT_EDITABLE");
      }
      const lockedIsPaid = Boolean(lockedOrder.paymentVerified);
      const lockedIsEditable =
        (lockedIsPaid && lockedOrder.status === "processing" && Boolean(lockedOrder.userId)) ||
        (!lockedIsPaid &&
          !lockedOrder.zibalTrackId &&
          ["pending", "payment_pending"].includes(lockedOrder.status));
      if (!lockedIsEditable) throw new Error("ORDER_NOT_EDITABLE");
      const previous = await tx.query.orderItems.findMany({
        where: eq(orderItems.orderId, lockedOrder.id),
      });
      const previousByProduct = new Map(previous.map((item) => [item.productId, item]));
      const ids = [...new Set([...previousByProduct.keys(), ...desired.keys()])].sort();
      const lockedProducts = new Map<string, typeof products.$inferSelect>();
      for (const id of ids) {
        await tx.execute(sql`SELECT id FROM products WHERE id = ${id} FOR UPDATE`);
        const product = await tx.query.products.findFirst({
          where: eq(products.id, id),
        });
        if (product) lockedProducts.set(id, product);
      }
      for (const id of ids) {
        const product = lockedProducts.get(id);
        const oldQuantity = previousByProduct.get(id)?.quantity || 0;
        const newQuantity = desired.get(id) || 0;
        if (!product) {
          if (newQuantity) throw new Error("A selected product is no longer available");
          continue;
        }
        const difference = newQuantity - oldQuantity;
        if (difference > 0) {
          if (
            product.badge === "Out of Stock" ||
            product.badge === "Not Available" ||
            product.quantity < difference
          ) {
            throw new Error(`Insufficient inventory for ${product.name}`);
          }
        }
        if (difference) {
          await tx.update(products)
            .set({ quantity: product.quantity - difference })
            .where(eq(products.id, id));
        }
      }

      await tx.delete(orderItems).where(eq(orderItems.orderId, order.id));
      const newRows = [...desired.entries()].map(([productId, quantity]) => {
        const product = lockedProducts.get(productId)!;
        const oldItem = previousByProduct.get(productId);
        return {
          orderId: order.id,
          productId,
          productName: oldItem?.productName || product.name,
          productNameFa: oldItem?.productNameFa || product.nameFa,
          price: oldItem?.price || product.price,
          quantity,
          fulfilledQuantity: 0,
        };
      });
      if (newRows.length) {
        await tx.insert(orderItems).values(newRows);
      }

      const subtotal = newRows.reduce(
        (sum, item) => sum + Number(item.price) * item.quantity,
        0
      );
      const totalWeight = newRows.reduce(
        (sum, item) =>
          sum + Number(lockedProducts.get(item.productId)?.weight || 0) * item.quantity,
        0
      );
      const settings = await tx.query.shippingSettings.findFirst();
      const postage = lockedOrder.shippingMethod === "courier"
        ? 0
        : calculateWeightBasedShippingCost(
            totalWeight,
            settings?.weightRates?.length
              ? settings.weightRates
              : DEFAULT_SHIPPING_WEIGHT_RATES
          );
      let discount = Number(lockedOrder.discountAmount || 0);
      if (lockedOrder.discountCodeId) {
        const code = await tx.query.discountCodes.findFirst({
          where: eq(discountCodes.id, lockedOrder.discountCodeId),
        });
        if (code?.discountType === "free_shipping") discount = postage;
        else if (code?.discountType === "percentage") {
          discount = Math.min(
            subtotal * Number(code.discountValue || 0) / 100,
            Number(code.maxDiscountAmount || Infinity),
            subtotal
          );
        } else if (code?.discountType === "fixed_amount") {
          discount = Math.min(Number(code.discountValue || 0), subtotal);
        }
      }
      const newTotal = Math.max(0, subtotal + postage - discount);
      const paidAmount = Number(lockedOrder.paidAmount ?? (lockedIsPaid ? lockedOrder.total : 0));
      const paymentAmount = Math.max(0, newTotal - paidAmount);
      const refundAmount = Math.max(0, paidAmount - newTotal);
      const requiresAdditionalPayment = paymentAmount > 0;

      if (refundAmount > 0 && lockedOrder.userId) {
        await tx.insert(walletTransactions).values({
          userId: lockedOrder.userId,
          type: "credit",
          amount: refundAmount.toString(),
          description: `Refund for order #${lockedOrder.orderNumber} after order edit`,
          orderId: lockedOrder.id,
        });
      }
      const [updated] = await tx.update(orders)
        .set({
          total: newTotal.toString(),
          paidAmount: requiresAdditionalPayment ? paidAmount.toString() : newTotal.toString(),
          discountAmount: discount.toString(),
          status: newRows.length
            ? requiresAdditionalPayment
              ? "payment_pending"
              : lockedIsPaid
                ? "processing"
                : lockedOrder.status
            : "cancelled",
          paymentVerified: requiresAdditionalPayment ? null : lockedOrder.paymentVerified,
          zibalTrackId: requiresAdditionalPayment ? null : lockedOrder.zibalTrackId,
          updatedAt: new Date(),
        })
        .where(eq(orders.id, order.id))
        .returning();
      return {
        order: updated,
        items: newRows,
        postage,
        paymentAmount,
        refundAmount,
        requiresAdditionalPayment,
      };
    });

    return NextResponse.json({
      success: true,
      order: {
        id: result.order.id,
        total: result.order.total,
        shippingCost: result.postage,
        discountAmount: result.order.discountAmount,
        paymentRequired: result.requiresAdditionalPayment,
        paymentAmount: result.paymentAmount,
        refundAmount: result.refundAmount,
        items: result.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productNameFa: item.productNameFa,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "ORDER_NOT_EDITABLE") {
      return NextResponse.json({ error: "Order is no longer editable" }, { status: 409 });
    }
    console.error("Error modifying customer order:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update order" },
      { status: 500 }
    );
  }
}
