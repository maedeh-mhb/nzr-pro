import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature } from "@/lib/utils/webhookVerification";
import { getOrCreateRequestId, addRequestIdToHeaders } from "@/lib/utils/requestId";
export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/payment
 * Handle payment gateway webhook callbacks
 * This endpoint receives payment verification callbacks from payment gateways
 */
export async function POST(request: NextRequest) {
    const requestId = getOrCreateRequestId(request);

    try {
        // Get webhook secret from environment
        const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;

        if (!webhookSecret) {
            console.error(`[${requestId}] Webhook secret not configured`);
            return NextResponse.json(
                { error: "Webhook configuration error" },
                {
                    status: 500,
                    headers: addRequestIdToHeaders({}, requestId)
                }
            );
        }

        // Get raw body for signature verification
        const rawBody = await request.text();

        // Get signature from headers
        const signature = request.headers.get("x-webhook-signature") ||
            request.headers.get("x-signature") ||
            request.headers.get("stripe-signature");

        if (!signature) {
            console.error(`[${requestId}] Missing webhook signature`);
            return NextResponse.json(
                { error: "Missing signature" },
                {
                    status: 401,
                    headers: addRequestIdToHeaders({}, requestId)
                }
            );
        }

        // Verify signature
        const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);

        if (!isValid) {
            console.error(`[${requestId}] Invalid webhook signature`);
            return NextResponse.json(
                { error: "Invalid signature" },
                {
                    status: 401,
                    headers: addRequestIdToHeaders({}, requestId)
                }
            );
        }

        // Parse webhook payload
        const payload = JSON.parse(rawBody);

        // Extract relevant data based on webhook type
        const {
            orderId,
            orderNumber,
            status,
            transactionId,
            paymentMethod
        } = payload;

        if (!orderId && !orderNumber) {
            console.error(`[${requestId}] Missing order identifier in webhook`);
            return NextResponse.json(
                { error: "Invalid webhook data" },
                {
                    status: 400,
                    headers: addRequestIdToHeaders({}, requestId)
                }
            );
        }

        // Find order
        const whereClause = orderId
            ? eq(orders.id, orderId)
            : eq(orders.orderNumber, orderNumber);

        const order = await db.query.orders.findFirst({
            where: whereClause,
        });

        if (!order) {
            console.error(`[${requestId}] Order not found:`, orderId || orderNumber);
            return NextResponse.json(
                { error: "Order not found" },
                {
                    status: 404,
                    headers: addRequestIdToHeaders({}, requestId)
                }
            );
        }

        // Update order based on webhook status
        let updateData: any = {};

        if (status === "success" || status === "completed" || status === "verified") {
            updateData.paymentVerified = true;
            updateData.status = "processing";
        } else if (status === "failed" || status === "declined") {
            updateData.paymentVerified = false;
            updateData.status = "cancelled";
        }

        // Add transaction ID if provided
        if (transactionId) {
            updateData.transactionId = transactionId;
        }

        // Update order
        if (Object.keys(updateData).length > 0) {
            await db
                .update(orders)
                .set({
                    ...updateData,
                    updatedAt: new Date(),
                })
                .where(eq(orders.id, order.id));
        }

        // Return success response
        return NextResponse.json(
            {
                success: true,
                message: "Webhook processed successfully"
            },
            {
                status: 200,
                headers: addRequestIdToHeaders({}, requestId)
            }
        );

    } catch (error) {
        console.error(`[${requestId}] Webhook processing error:`, error instanceof Error ? error.message : String(error));

        return NextResponse.json(
            { error: "Webhook processing failed" },
            {
                status: 500,
                headers: addRequestIdToHeaders({}, requestId)
            }
        );
    }
}
