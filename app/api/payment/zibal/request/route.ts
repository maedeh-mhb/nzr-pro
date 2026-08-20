import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { paymentSettings } from "@/lib/db/schema/payments";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

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

    if (order.paymentMethod !== "online_payment") {
      return NextResponse.json({ error: "Order is not for online payment" }, { status: 400 });
    }

    if (order.status !== "payment_pending") {
      return NextResponse.json({ error: "Invalid order status for payment" }, { status: 400 });
    }

    // Fetch payment settings for merchant ID
    const settings = await db.query.paymentSettings.findFirst();
    const merchantId = settings?.onlinePaymentMerchantId;

    if (!merchantId) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Amount in Rials (total is in Tomans, multiply by 10)
    const amountInRials = Math.round(Number(order.total) * 10);

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
