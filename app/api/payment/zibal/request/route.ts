import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { guestOrders, orders } from "@/lib/db/schema/orders";
import { users } from "@/lib/db/schema/users";
import { isPersianName } from "@/lib/utils/nameValidation";
import { paymentSettings } from "@/lib/db/schema/payments";
import { eq } from "drizzle-orm";
import { isOrderEditTokenValid } from "@/lib/utils/orderEditing";

export async function POST(request: NextRequest) {
  try {
    const { orderId, editToken } = await request.json();

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const session = await getServerSession(authOptions);
    const guestOrder = await db.query.guestOrders.findFirst({
      where: eq(guestOrders.orderId, order.id),
    });
    const isOwner = Boolean(order.userId && session?.user?.id === order.userId);
    const isGuestWithValidToken =
      Boolean(guestOrder?.editTokenHash) &&
      typeof editToken === "string" &&
      isOrderEditTokenValid(editToken, guestOrder?.editTokenHash) &&
      Boolean(guestOrder?.editExpiresAt && guestOrder.editExpiresAt.getTime() > Date.now());
    if (!isOwner && !isGuestWithValidToken) {
      return NextResponse.json({ error: "Unauthorized order access" }, { status: 403 });
    }

    if (order.paymentMethod !== "online_payment") {
      return NextResponse.json({ error: "Order is not for online payment" }, { status: 400 });
    }

    if (order.status !== "payment_pending") {
      return NextResponse.json({ error: "Invalid order status for payment" }, { status: 400 });
    }

    if (guestOrder) {
      const guestFirstName = guestOrder.guestName.trim().split(/[\s\u200c]+/)[0] || "";
      if (!isPersianName(guestFirstName)) {
        return NextResponse.json(
          {
            error: "Please enter your name in Persian",
            errorFa: "نام خود را به فارسی وارد کنید",
          },
          { status: 400 }
        );
      }
    } else if (order.userId) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
        columns: { name: true, surname: true },
      });
      if (!user || !isPersianName(user.name) || !isPersianName(user.surname || "")) {
        return NextResponse.json(
          {
            error: "Please enter your first and family names in Persian",
            errorFa: "نام و نام خانوادگی خود را به فارسی وارد کنید",
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        { error: "Customer name is required", errorFa: "نام مشتری الزامی است" },
        { status: 400 }
      );
    }

    // Fetch payment settings for merchant ID
    const settings = await db.query.paymentSettings.findFirst();
    const merchantId = settings?.onlinePaymentMerchantId;

    if (!merchantId) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Amount in Rials (total is in Tomans, multiply by 10)
    const amountDue = Math.max(
      0,
      Number(order.total) - Number(order.paidAmount || 0)
    );
    if (!amountDue) {
      return NextResponse.json({ error: "No additional payment is required" }, { status: 400 });
    }
    const amountInRials = Math.round(amountDue * 10);

    // Build callback URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.headers.get("origin") || "http://localhost:3000";
    const callbackUrl = `${baseUrl}/api/payment/zibal/callback`;

    // Call Zibal request API
    const zibalResponse = await fetch("https://gateway.zibal.ir/v1/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantId,
        amount: amountInRials,
        callbackUrl,
        orderId: order.orderNumber,
        description: `Payment for order #${order.orderNumber}`,
      }),
    });

    const zibalData = await zibalResponse.json();

    if (zibalData.result !== 100 || !zibalData.trackId) {
      console.error("Zibal request failed:", JSON.stringify(zibalData));
      return NextResponse.json(
        { error: "Failed to create payment", details: zibalData.message },
        { status: 500 }
      );
    }

    // Store trackId on the order
    await db
      .update(orders)
      .set({ zibalTrackId: zibalData.trackId.toString() })
      .where(eq(orders.id, orderId));

    // Use paymentUrl from API response, or construct it
    const isSandbox = merchantId === "zibal";
    const paymentUrl = zibalData.paymentUrl
      || (isSandbox
        ? `https://sandbox.zibal.ir/start/${zibalData.trackId}`
        : `https://gateway.zibal.ir/start/${zibalData.trackId}`);

    return NextResponse.json({ paymentUrl, trackId: zibalData.trackId });
  } catch (error) {
    console.error("Zibal request error:", error);
    return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
  }
}
