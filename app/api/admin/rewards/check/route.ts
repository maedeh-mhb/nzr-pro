import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { rewardHistory } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/rewards/check?orderId=...
 * Check if rewards have been distributed for an order (admin only)
 */
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

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json({ error: "Order ID is required" }, { status: 400 });
    }

    // Check if rewards have been distributed for this order
    const existingRewards = await db.query.rewardHistory.findFirst({
      where: eq(rewardHistory.orderId, orderId),
    });

    return NextResponse.json({ hasRewards: !!existingRewards });
  } catch (error) {
    console.error("Error checking rewards:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to check rewards", details: errorMessage },
      { status: 500 }
    );
  }
}

