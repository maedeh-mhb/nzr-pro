import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { orders, users, orderItems, contactSettings } from "@/lib/db/schema";
import { paymentSettings } from "@/lib/db/schema/payments";
import { eq } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "@/lib/services/email";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackId = searchParams.get("trackId");
  const orderNumber = searchParams.get("orderId");
  // Zibal sends success=1 for completed payments, success=0 for cancellations/failures
  const successParam = searchParams.get("success");

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  if (!orderNumber) {
    return Response.redirect(`${baseUrl}/products`);
  }

  try {
    const order = await db.query.orders.findFirst({
      where: eq(orders.orderNumber, orderNumber),
    });

    if (!order) {
      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=error`);
    }

    // Idempotency: if already processed successfully, just redirect to success
    if (order.status === "processing" && order.paymentVerified) {
      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=success&trackId=${order.zibalTrackId || trackId}`);
    }

    // If user cancelled/hit back on Zibal's page (success=0 with no trackId or explicit cancel)
    // Still attempt verify if we have a trackId so we can record the final state
    if (!trackId || successParam === "0") {
      await db.update(orders).set({
        status: "cancelled",
        zibalTrackId: trackId || null,
      }).where(eq(orders.id, order.id));
      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=failed&trackId=${trackId || ""}`);
    }

    const settings = await db.query.paymentSettings.findFirst();
    const merchantId = settings?.onlinePaymentMerchantId;

    if (!merchantId) {
      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=error`);
    }

    const verifyResponse = await fetch("https://gateway.zibal.ir/v1/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant: merchantId, trackId: parseInt(trackId) }),
    });

    const verifyData = await verifyResponse.json();

    // CRITICAL FIX: Zibal's verify API returns result:100 + status:1 for a successful
    // first-time verification. The status:2 only appears in the callback URL query params
    // from Zibal, NOT in the verify API response body. Checking status===2 here means
    // every successful payment was incorrectly being treated as failed.
    //
    // result:100 = verification succeeded
    // result:201 = already verified before (idempotent — still treat as success)
    // anything else = failure
    const isSuccess = verifyData.result === 100 || verifyData.result === 201;

    if (isSuccess) {
      await db.update(orders).set({
        status: "processing",
        paymentVerified: new Date(),
        paidAmount: order.total,
        zibalTrackId: trackId,
      }).where(eq(orders.id, order.id));

      if (order.userId) {
        try {
          const user = await db.query.users.findFirst({ where: eq(users.id, order.userId) });
          if (user?.email) {
            const items = await db.query.orderItems.findMany({ where: eq(orderItems.orderId, order.id) });
            const contactData = await db.select().from(contactSettings).limit(1);
            const contactInfo = contactData[0] || {};

            await sendOrderConfirmationEmail(user.email, {
              orderNumber: order.orderNumber,
              customerName: `${user.name} ${user.surname || ""}`.trim(),
              orderDate: new Date().toLocaleDateString("fa-IR"),
              items: items.map((item) => ({
                name: item.productName,
                quantity: item.quantity,
                price: item.price.toString(),
              })),
              total: order.total.toString(),
              paymentMethod: "online_payment",
              telegram: contactInfo.telegram || null,
              instagram: contactInfo.instagram || null,
              whatsapp: contactInfo.whatsapp || null,
              contactAddress: contactInfo.address || null,
              contactAddressFa: contactInfo.addressFa || null,
              contactEmail: contactInfo.email || null,
            });
          }
        } catch (emailError) {
          console.error("Error sending payment confirmation email:", emailError);
        }
      }

      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=success&trackId=${trackId}`);
    } else {
      await db.update(orders).set({
        status: "cancelled",
        zibalTrackId: trackId,
      }).where(eq(orders.id, order.id));

      console.error("Zibal verify failed:", JSON.stringify(verifyData));
      return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=failed&trackId=${trackId}`);
    }
  } catch (error) {
    console.error("Callback error:", error);
    return Response.redirect(`${baseUrl}/checkout/success?orderNumber=${orderNumber}&paymentStatus=error`);
  }
}
