import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers, users } from "@/lib/db/schema";
import { eq, ilike, or, and, sql } from "drizzle-orm";
import { deactivateExpiredCodes } from "@/lib/services/discountCodes";
import { createAdminActivity } from "@/lib/services/adminActivities";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ensure expired codes are deactivated before returning list
    await deactivateExpiredCodes();

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const type = searchParams.get("type"); // "global" | "personal" | null
    const isActive = searchParams.get("isActive"); // "true" | "false" | null

    let query = db.select().from(discountCodes);

    const conditions = [];

    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(ilike(discountCodes.code, searchTerm));
    }

    if (type === "global" || type === "personal") {
      conditions.push(eq(discountCodes.type, type));
    }

    if (isActive === "true") {
      conditions.push(eq(discountCodes.isActive, true));
    } else if (isActive === "false") {
      conditions.push(eq(discountCodes.isActive, false));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const codes = await query.orderBy(discountCodes.createdAt);

    // For each code, if it's personal, get associated users
    const now = new Date();

    const codesWithUsers = await Promise.all(
      codes.map(async (code) => {
        const isExpired = code.validUntil < now || !code.isActive;

        if (code.type === "personal") {
          const users = await db
            .select({
              userId: discountCodeUsers.userId,
            })
            .from(discountCodeUsers)
            .where(eq(discountCodeUsers.discountCodeId, code.id));

          return {
            ...code,
            userIds: users.map((u) => u.userId),
            isExpired,
          };
        }
        return { ...code, userIds: [], isExpired };
      })
    );

    return NextResponse.json({ codes: codesWithUsers });
  } catch (error) {
    console.error("Error fetching discount codes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch discount codes", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const {
      code,
      type,
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      userLimit,
      validFrom,
      validUntil,
      description,
      descriptionFa,
      userIds, // Array of user IDs for personal codes
    } = body;

    // Validation
    if (!code || !type || !discountType || !validFrom || !validUntil) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (discountType !== "free_shipping" && discountValue === null) {
      return NextResponse.json(
        { error: "Discount value is required for percentage and fixed_amount types" },
        { status: 400 }
      );
    }

    if (type === "personal" && (!userIds || !Array.isArray(userIds) || userIds.length === 0)) {
      return NextResponse.json(
        { error: "User IDs are required for personal discount codes" },
        { status: 400 }
      );
    }

    // Check if code already exists (case-insensitive)
    const existingCodes = await db
      .select()
      .from(discountCodes)
      .where(sql`LOWER(${discountCodes.code}) = LOWER(${sql.raw(`'${code.trim().replace(/'/g, "''")}'`)})`)
      .limit(1);

    const existingCode = existingCodes[0] || null;

    if (existingCode) {
      return NextResponse.json(
        { error: "A discount code with this code already exists" },
        { status: 400 }
      );
    }

    const adminId = (session.user as any)?.id;

    // Create discount code
    const [newCode] = await db
      .insert(discountCodes)
      .values({
        code: code.trim().toUpperCase(),
        type,
        discountType,
        discountValue: discountType === "free_shipping" ? null : discountValue?.toString(),
        minPurchaseAmount: minPurchaseAmount ? minPurchaseAmount.toString() : null,
        maxDiscountAmount: maxDiscountAmount ? maxDiscountAmount.toString() : null,
        usageLimit: usageLimit || null,
        userLimit: userLimit || null,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        description: description || null,
        descriptionFa: descriptionFa || null,
        createdBy: adminId,
      })
      .returning();

    // If personal code, add users and create notifications
    if (type === "personal" && userIds.length > 0) {
      await db.insert(discountCodeUsers).values(
        userIds.map((userId: string) => ({
          discountCodeId: newCode.id,
          userId,
        }))
      );

      // Create notifications for assigned users
      const discountDisplay =
        discountType === "percentage"
          ? `${discountValue}%`
          : discountType === "fixed_amount"
            ? `${discountValue} ${"Tomans"}`
            : "Free Shipping";

      for (const userId of userIds) {
        await createNotification({
          userId,
          type: "discount_code_available",
          title: "New Personal Discount Code",
          titleFa: "کد تخفیف شخصی جدید",
          message: `You have received a personal discount code: ${newCode.code}. ${discountDisplay} off!`,
          messageFa: `شما یک کد تخفیف شخصی دریافت کرده‌اید: ${newCode.code}. ${discountDisplay} تخفیف!`,
          notificationData: {
            codeId: newCode.id,
            code: newCode.code,
            type: "personal",
            discountType,
            discountValue,
          },
        });

        // Create activity for user
        await createActivity({
          userId,
          activityType: "discount_code_received",
          activityData: {
            code: newCode.code,
            codeId: newCode.id,
            type: "personal",
            discountType,
            discountValue,
          },
        });
      }
    } else if (type === "global") {
      // For global codes, create notifications for all active users
      const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "user"));

      const discountDisplay =
        discountType === "percentage"
          ? `${discountValue}%`
          : discountType === "fixed_amount"
            ? `${discountValue} ${"Tomans"}`
            : "Free Shipping";

      // Create notifications and activities for all users (batch in chunks to avoid overwhelming the database)
      const batchSize = 50;
      for (let i = 0; i < allUsers.length; i += batchSize) {
        const batch = allUsers.slice(i, i + batchSize);
        await Promise.all(
          batch.map((user) =>
            Promise.all([
              createNotification({
                userId: user.id,
                type: "discount_code_available",
                title: "New Discount Code Available",
                titleFa: "کد تخفیف جدید در دسترس",
                message: `A new discount code is available: ${newCode.code}. ${discountDisplay} off!`,
                messageFa: `یک کد تخفیف جدید در دسترس است: ${newCode.code}. ${discountDisplay} تخفیف!`,
                notificationData: {
                  codeId: newCode.id,
                  code: newCode.code,
                  type: "global",
                  discountType,
                  discountValue,
                },
              }),
              createActivity({
                userId: user.id,
                activityType: "discount_code_received",
                activityData: {
                  code: newCode.code,
                  codeId: newCode.id,
                  type: "global",
                  discountType,
                  discountValue,
                },
              }),
            ])
          )
        );
      }
    }

    // Log admin activity
    await createAdminActivity({
      adminId,
      activityType: "discount_code_created",
      activityData: {
        codeId: newCode.id,
        code: newCode.code,
        type: newCode.type,
      },
    });

    return NextResponse.json({ code: newCode }, { status: 201 });
  } catch (error) {
    console.error("Error creating discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create discount code", details: errorMessage },
      { status: 500 }
    );
  }
}

