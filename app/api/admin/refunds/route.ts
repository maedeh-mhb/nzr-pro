import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { refunds, orders, users, orderItems } from "@/lib/db/schema";
import { eq, desc, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch all refunds
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "";
    const orderId = searchParams.get("orderId") || "";

    // Fetch refunds with filters
    const conditions: any[] = [];
    if (status) {
      conditions.push(eq(refunds.status, status));
    }
    if (orderId) {
      conditions.push(eq(refunds.orderId, orderId));
    }

    const whereClause = conditions.length > 0 
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    const refundsData = await db
      .select()
      .from(refunds)
      .where(whereClause)
      .orderBy(desc(refunds.createdAt));

    // Fetch order and user info for each refund
    const refundsWithDetails = await Promise.all(
      refundsData.map(async (refund) => {
        const order = await db.query.orders.findFirst({
          where: eq(orders.id, refund.orderId),
        });

        const createdByUser = await db.query.users.findFirst({
          where: eq(users.id, refund.createdBy),
        });

        const processedByUser = refund.processedBy
          ? await db.query.users.findFirst({
              where: eq(users.id, refund.processedBy),
            })
          : null;

        return {
          id: refund.id,
          orderId: refund.orderId,
          orderNumber: order?.orderNumber || "Unknown",
          amount: refund.amount,
          reason: refund.reason,
          status: refund.status,
          createdBy: refund.createdBy,
          createdByName: createdByUser
            ? `${createdByUser.name} ${createdByUser.surname || ""}`.trim()
            : "Unknown",
          processedBy: refund.processedBy,
          processedByName: processedByUser
            ? `${processedByUser.name} ${processedByUser.surname || ""}`.trim()
            : null,
          processedAt: refund.processedAt,
          notes: refund.notes,
          createdAt: refund.createdAt,
          updatedAt: refund.updatedAt,
        };
      })
    );

    return NextResponse.json({ refunds: refundsWithDetails });
  } catch (error) {
    console.error("Error fetching refunds:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch refunds", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new refund
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, amount, reason, notes } = body;

    if (!orderId || !amount || !reason) {
      return NextResponse.json(
        { error: "orderId, amount, and reason are required" },
        { status: 400 }
      );
    }

    // Verify order exists
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate amount (should be positive and not exceed order total)
    const refundAmount = parseFloat(amount);
    const orderTotal = parseFloat(order.total);

    if (refundAmount <= 0) {
      return NextResponse.json(
        { error: "Refund amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (refundAmount > orderTotal) {
      return NextResponse.json(
        { error: "Refund amount cannot exceed order total" },
        { status: 400 }
      );
    }

    // Check existing refunds for this order
    const existingRefunds = await db
      .select()
      .from(refunds)
      .where(eq(refunds.orderId, orderId));

    const totalRefunded = existingRefunds.reduce((sum, r) => {
      if (r.status === "processed") {
        return sum + parseFloat(r.amount?.toString() || "0");
      }
      return sum;
    }, 0);

    if (totalRefunded + refundAmount > orderTotal) {
      return NextResponse.json(
        { error: "Total refund amount cannot exceed order total" },
        { status: 400 }
      );
    }

    // Create refund
    const [newRefund] = await db
      .insert(refunds)
      .values({
        orderId,
        amount: refundAmount.toString(),
        reason: reason.trim(),
        status: "pending",
        createdBy: session.user.id,
        notes: notes?.trim() || null,
      })
      .returning();

    // Fetch user name
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    const createdByName = user
      ? `${user.name} ${user.surname || ""}`.trim()
      : "Unknown";

    return NextResponse.json({
      refund: {
        id: newRefund.id,
        orderId: newRefund.orderId,
        orderNumber: order.orderNumber,
        amount: newRefund.amount,
        reason: newRefund.reason,
        status: newRefund.status,
        createdBy: newRefund.createdBy,
        createdByName,
        processedBy: newRefund.processedBy,
        processedByName: null,
        processedAt: newRefund.processedAt,
        notes: newRefund.notes,
        createdAt: newRefund.createdAt,
        updatedAt: newRefund.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error creating refund:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create refund", details: errorMessage },
      { status: 500 }
    );
  }
}

