import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers, discountCodeUsages } from "@/lib/db/schema";
import { eq, and, or, gte, lte, sql, inArray } from "drizzle-orm";
import { deactivateExpiredCodes } from "@/lib/services/discountCodes";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const now = new Date();

    // Auto-deactivate expired codes (but keep them in database for user to see)
    await deactivateExpiredCodes();

    // Fetch global active discount codes
    const globalCodes = await db
      .select()
      .from(discountCodes)
      .where(
        and(
          eq(discountCodes.type, "global"),
          eq(discountCodes.isActive, true),
          lte(discountCodes.validFrom, now),
          gte(discountCodes.validUntil, now)
        )
      );

    // Fetch personal discount codes assigned to this user using a join
    // Include expired codes but mark them as expired (don't filter them out)
    const personalCodes = await db
      .select({
        id: discountCodes.id,
        code: discountCodes.code,
        type: discountCodes.type,
        discountType: discountCodes.discountType,
        discountValue: discountCodes.discountValue,
        minPurchaseAmount: discountCodes.minPurchaseAmount,
        maxDiscountAmount: discountCodes.maxDiscountAmount,
        usageLimit: discountCodes.usageLimit,
        usageCount: discountCodes.usageCount,
        userLimit: discountCodes.userLimit,
        validFrom: discountCodes.validFrom,
        validUntil: discountCodes.validUntil,
        isActive: discountCodes.isActive,
        isRewardGenerated: discountCodes.isRewardGenerated,
        createdAt: discountCodes.createdAt,
        description: discountCodes.description,
        descriptionFa: discountCodes.descriptionFa,
      })
      .from(discountCodes)
      .innerJoin(discountCodeUsers, eq(discountCodes.id, discountCodeUsers.discountCodeId))
      .where(
        and(
          eq(discountCodeUsers.userId, userId),
          eq(discountCodes.type, "personal")
        )
      );

    // Ensure expired codes are deactivated in DB (defensive in case cron didn't run)
    const rawCodes = [...globalCodes, ...personalCodes];
    const expiredIds: string[] = [];
    for (const code of rawCodes) {
      const rewardExpiry = code.isRewardGenerated
        ? new Date(new Date(code.createdAt).getTime() + 24 * 60 * 60 * 1000)
        : null;
      const isExpired = (rewardExpiry ? rewardExpiry < now : false) || code.validUntil < now || !code.isActive;
      if (isExpired && code.isActive) {
        expiredIds.push(code.id);
      }
    }

    if (expiredIds.length > 0) {
      await db
        .update(discountCodes)
        .set({ isActive: false, updatedAt: now })
        .where(inArray(discountCodes.id, expiredIds));
    }

    // Combine and format codes
    const allCodes = await Promise.all(rawCodes.map(async (code) => {
      const rewardExpiry = code.isRewardGenerated
        ? new Date(new Date(code.createdAt).getTime() + 24 * 60 * 60 * 1000)
        : null;
      const isExpired = (rewardExpiry ? rewardExpiry < now : false) || code.validUntil < now || !code.isActive;
      
      // Get user's usage count for this code
      const userUsageResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(discountCodeUsages)
        .where(
          and(
            eq(discountCodeUsages.discountCodeId, code.id),
            eq(discountCodeUsages.userId, userId)
          )
        );
      const userUsageCount = userUsageResult[0]?.count || 0;
      
      return {
        id: code.id,
        code: code.code,
        type: code.type,
        discountType: code.discountType,
        discountValue: code.discountValue,
        minPurchaseAmount: code.minPurchaseAmount,
        maxDiscountAmount: code.maxDiscountAmount,
        usageLimit: code.usageLimit,
        usageCount: code.usageCount,
        userLimit: code.userLimit,
        userUsageCount: userUsageCount, // Add user's personal usage count
        validFrom: code.validFrom.toISOString(),
        validUntil: code.validUntil.toISOString(),
        isActive: !isExpired, // Mark as inactive if expired
        isExpired: isExpired, // Add explicit expired flag
        description: code.description,
        descriptionFa: code.descriptionFa,
      };
    }));

    return NextResponse.json({ codes: allCodes });
  } catch (error: any) {
    console.error("Error fetching discount codes:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount codes", details: error.message },
      { status: 500 }
    );
  }
}

