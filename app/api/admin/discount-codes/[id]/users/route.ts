import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminActivity } from "@/lib/services/adminActivities";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

export async function POST(
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

    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json(
        { error: "User IDs array is required" },
        { status: 400 }
      );
    }

    // Check if code exists and is personal
    const code = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, params.id),
    });

    if (!code) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    if (code.type !== "personal") {
      return NextResponse.json(
        { error: "Can only add users to personal discount codes" },
        { status: 400 }
      );
    }

    // Get existing user assignments
    const existingUsers = await db
      .select()
      .from(discountCodeUsers)
      .where(eq(discountCodeUsers.discountCodeId, params.id));

    const existingUserIds = existingUsers.map((u) => u.userId);

    // Filter out users that are already assigned
    const newUserIds = userIds.filter((userId: string) => !existingUserIds.includes(userId));

    if (newUserIds.length === 0) {
      return NextResponse.json(
        { error: "All provided users are already assigned to this code" },
        { status: 400 }
      );
    }

    // Add new users
    await db.insert(discountCodeUsers).values(
      newUserIds.map((userId: string) => ({
        discountCodeId: params.id,
        userId,
      }))
    );

    // Create notifications for newly added users
    const discountDisplay = 
      code.discountType === "percentage"
        ? `${code.discountValue}%`
        : code.discountType === "fixed_amount"
        ? `${code.discountValue} ${"Tomans"}`
        : "Free Shipping";

    for (const userId of newUserIds) {
      await createNotification({
        userId,
        type: "discount_code_available",
        title: "New Personal Discount Code",
        titleFa: "کد تخفیف شخصی جدید",
        message: `You have received a personal discount code: ${code.code}. ${discountDisplay} off!`,
        messageFa: `شما یک کد تخفیف شخصی دریافت کرده‌اید: ${code.code}. ${discountDisplay} تخفیف!`,
        notificationData: {
          codeId: code.id,
          code: code.code,
          type: "personal",
          discountType: code.discountType,
          discountValue: code.discountValue,
        },
      });

      // Create activity for user
      await createActivity({
        userId,
        activityType: "discount_code_received",
        activityData: {
          code: code.code,
          codeId: code.id,
          type: "personal",
          discountType: code.discountType,
          discountValue: code.discountValue,
        },
      });
    }

    const adminId = (session.user as any)?.id;

    // Log admin activity
    await createAdminActivity({
      adminId,
      activityType: "discount_code_users_added",
      activityData: {
        codeId: code.id,
        code: code.code,
        userIds: newUserIds,
      },
    });

    return NextResponse.json({
      message: `Added ${newUserIds.length} user(s) to discount code`,
    });
  } catch (error) {
    console.error("Error adding users to discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to add users", details: errorMessage },
      { status: 500 }
    );
  }
}

