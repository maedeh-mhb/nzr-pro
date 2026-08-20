import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { refunds, orders, users, orderStatusHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PATCH - Update refund status (process or reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status || !["processed", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'processed' or 'rejected'" },
        { status: 400 }
      );
    }

    // Fetch refund
    const refund = await db.query.refunds.findFirst({
      where: eq(refunds.id, id),
    });

    if (!refund) {
      return NextResponse.json({ error: "Refund not found" }, { status: 404 });
    }

    if (refund.status !== "pending") {
      return NextResponse.json(
        { error: "Refund has already been processed or rejected" },
        { status: 400 }
      );
    }

    // Update refund status
    const updateData: any = {
      status,
      processedBy: session.user.id,
      processedAt: new Date(),
      updatedAt: new Date(),
    };

    if (notes) {
      updateData.notes = notes.trim();
    }

    await db.update(refunds).set(updateData).where(eq(refunds.id, id));

    // Record status change in order history
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, refund.orderId),
    });

    if (order) {
      await db.insert(orderStatusHistory).values({
        orderId: refund.orderId,
        status: order.status,
        previousStatus: order.status,
        changedBy: session.user.id,
        changedByType: "admin",
        notes: `Refund ${status}: ${refund.amount} - ${refund.reason}`,
      });
    }

    // Fetch updated refund with user names
    const updatedRefund = await db.query.refunds.findFirst({
      where: eq(refunds.id, id),
    });

    const processedByUser = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    const processedByName = processedByUser
      ? `${processedByUser.name} ${processedByUser.surname || ""}`.trim()
      : "Unknown";

    return NextResponse.json({
      refund: {
        id: updatedRefund!.id,
        orderId: updatedRefund!.orderId,
        amount: updatedRefund!.amount,
        reason: updatedRefund!.reason,
        status: updatedRefund!.status,
        createdBy: updatedRefund!.createdBy,
        processedBy: updatedRefund!.processedBy,
        processedByName,
        processedAt: updatedRefund!.processedAt,
        notes: updatedRefund!.notes,
        createdAt: updatedRefund!.createdAt,
        updatedAt: updatedRefund!.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error updating refund:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update refund", details: errorMessage },
      { status: 500 }
    );
  }
}

