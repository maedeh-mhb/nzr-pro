import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsages, orders, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get usage history
    const usages = await db
      .select({
        id: discountCodeUsages.id,
        userId: discountCodeUsages.userId,
        orderId: discountCodeUsages.orderId,
        discountAmount: discountCodeUsages.discountAmount,
        usedAt: discountCodeUsages.usedAt,
        orderNumber: orders.orderNumber,
        userName: users.name,
        userEmail: users.email,
      })
      .from(discountCodeUsages)
      .leftJoin(orders, eq(discountCodeUsages.orderId, orders.id))
      .leftJoin(users, eq(discountCodeUsages.userId, users.id))
      .where(eq(discountCodeUsages.discountCodeId, params.id))
      .orderBy(discountCodeUsages.usedAt)
      .limit(limit)
      .offset(offset);

    // Get total count
    const totalCount = await db
      .select({ count: discountCodeUsages.id })
      .from(discountCodeUsages)
      .where(eq(discountCodeUsages.discountCodeId, params.id));

    return NextResponse.json({
      usages,
      total: totalCount.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching discount code usage:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch usage history", details: errorMessage },
      { status: 500 }
    );
  }
}

