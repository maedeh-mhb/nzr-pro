import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema/orders";
import { paymentSettings } from "@/lib/db/schema/payments";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { trackId, orderId } = await request.json();

    if (!trackId || !orderId) {
      return NextResponse.json({ error: "trackId and orderId are required" }, { status: 400 });
    }

    // Fetch payment settings
    const settings = await db.query.paymentSettings.findFirst();
    const merchantId = settings?.onlinePaymentMerchantId;

    if (!merchantId) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 });
    }

    // Find the order
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify with Zibal
    const verifyResponse = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant: merchantId,
        trackId: parseInt(trackId),
      }),
    });

    const verifyData = await verifyResponse.json();

    // result:100 = success, result:201 = already verified (idempotent — still treat as success)
    const isSuccess = verifyData.result === 100 || verifyData.result === 201;

    if (isSuccess) {
      await db
        .update(orders)
        .set({
          status: "processing",
          paymentVerified: new Date(),
          zibalTrackId: trackId.toString(),
        })
        .where(eq(orders.id, order.id));

      return NextResponse.json({ success: true, status: "paid" });
    } else {
      return NextResponse.json({
        success: false,
        status: "failed",
        message: verifyData.message,
      });
    }
  } catch (error) {
    console.error("Zibal verify error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
