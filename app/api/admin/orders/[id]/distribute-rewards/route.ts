import { NextRequest, NextResponse } from "next/server";
import { distributeOrderRewards } from "@/lib/services/rewards";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders/[id]/distribute-rewards
 * Manually trigger reward distribution for an order (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    // Distribute rewards
    await distributeOrderRewards(id);

    return NextResponse.json({ success: true, message: "Rewards distributed successfully" });
  } catch (error) {
    console.error("Error distributing rewards:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to distribute rewards", details: errorMessage },
      { status: 500 }
    );
  }
}

