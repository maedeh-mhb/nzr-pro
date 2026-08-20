import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createAdminActivity } from "@/lib/services/adminActivities";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; userId: string } }
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

    // Check if code exists
    const code = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, params.id),
    });

    if (!code) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    // Remove user assignment
    await db
      .delete(discountCodeUsers)
      .where(
        and(
          eq(discountCodeUsers.discountCodeId, params.id),
          eq(discountCodeUsers.userId, params.userId)
        )
      );

    const adminId = (session.user as any)?.id;

    // Log admin activity
    await createAdminActivity({
      adminId,
      activityType: "discount_code_users_removed",
      activityData: {
        codeId: code.id,
        code: code.code,
        userId: params.userId,
      },
    });

    return NextResponse.json({ message: "User removed from discount code" });
  } catch (error) {
    console.error("Error removing user from discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to remove user", details: errorMessage },
      { status: 500 }
    );
  }
}

