import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers, discountCodeUsages } from "@/lib/db/schema";
import { eq, and, or, lt, gte, lte, sql } from "drizzle-orm";

export interface ValidateDiscountCodeParams {
  code: string;
  userId?: string;
  cartTotal: number;
  shippingCost?: number; // For free shipping calculation
}

export interface DiscountCodeValidationResult {
  valid: boolean;
  discount_type: "percentage" | "fixed_amount" | "free_shipping";
  discount_amount: number | null;
  message: string;
  messageFa?: string;
  codeId?: string;
}

/**
 * Auto-deactivate expired discount codes
 */
export async function deactivateExpiredCodes() {
  const now = new Date();
  await db
    .update(discountCodes)
    .set({ isActive: false, updatedAt: now })
    .where(and(eq(discountCodes.isActive, true), lt(discountCodes.validUntil, now)));
}

/**
 * Validate and calculate discount for a code
 */
export async function validateDiscountCode(
  params: ValidateDiscountCodeParams
): Promise<DiscountCodeValidationResult> {
  const { code, userId, cartTotal, shippingCost = 0 } = params;

  // First, auto-deactivate expired codes
  await deactivateExpiredCodes();

  // Find the code (case-insensitive)
  const codeRecord = await db
    .select()
    .from(discountCodes)
    .where(sql`LOWER(${discountCodes.code}) = LOWER(${sql.raw(`'${code.replace(/'/g, "''")}'`)})`)
    .limit(1)
    .then((results) => results[0] || null);

  if (!codeRecord) {
    return {
      valid: false,
      discount_type: "percentage",
      discount_amount: null,
      message: "Invalid discount code",
      messageFa: "کد تخفیف نامعتبر است",
    };
  }

  // Check if code is active
  if (!codeRecord.isActive) {
    return {
      valid: false,
      discount_type: codeRecord.discountType,
      discount_amount: null,
      message: "This discount code is not active",
      messageFa: "این کد تخفیف فعال نیست",
    };
  }

  // Check date validity
  const now = new Date();
  if (codeRecord.validFrom > now) {
    return {
      valid: false,
      discount_type: codeRecord.discountType,
      discount_amount: null,
      message: "This discount code is not yet valid",
      messageFa: "این کد تخفیف هنوز معتبر نیست",
    };
  }

  if (codeRecord.validUntil < now) {
    // Auto-deactivate
    await db
      .update(discountCodes)
      .set({ isActive: false, updatedAt: now })
      .where(eq(discountCodes.id, codeRecord.id));

    return {
      valid: false,
      discount_type: codeRecord.discountType,
      discount_amount: null,
      message: "This discount code has expired",
      messageFa: "این کد تخفیف منقضی شده است",
    };
  }

  // SECURITY: Check if personal code and user is assigned
  // Personal codes (including reward codes) can ONLY be used by the user who generated them
  if (codeRecord.type === "personal") {
    if (!userId) {
      return {
        valid: false,
        discount_type: codeRecord.discountType,
        discount_amount: null,
        message: "You must be logged in to use this discount code",
        messageFa: "برای استفاده از این کد تخفیف باید وارد شوید",
      };
    }

    // Verify the code is assigned to this specific user
    const userAssignment = await db.query.discountCodeUsers.findFirst({
      where: and(
        eq(discountCodeUsers.discountCodeId, codeRecord.id),
        eq(discountCodeUsers.userId, userId)
      ),
    });

    if (!userAssignment) {
      return {
        valid: false,
        discount_type: codeRecord.discountType,
        discount_amount: null,
        message: "This discount code is not available for your account",
        messageFa: "این کد تخفیف برای حساب شما در دسترس نیست",
      };
    }

    // Additional security: Verify the code was created by this user
    if (codeRecord.createdBy !== userId) {
      return {
        valid: false,
        discount_type: codeRecord.discountType,
        discount_amount: null,
        message: "This discount code is not available for your account",
        messageFa: "این کد تخفیف برای حساب شما در دسترس نیست",
      };
    }
  }

  // Check usage limit
  if (codeRecord.usageLimit !== null && codeRecord.usageCount >= codeRecord.usageLimit) {
    return {
      valid: false,
      discount_type: codeRecord.discountType,
      discount_amount: null,
      message: "This discount code has reached its usage limit",
      messageFa: "این کد تخفیف به حداکثر تعداد استفاده رسیده است",
    };
  }

  // Check user limit (if user is logged in)
  if (userId && codeRecord.userLimit !== null) {
    const userUsageCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(discountCodeUsages)
      .where(
        and(
          eq(discountCodeUsages.discountCodeId, codeRecord.id),
          eq(discountCodeUsages.userId, userId)
        )
      );

    const count = Number(userUsageCount[0]?.count || 0);
    if (count >= codeRecord.userLimit) {
      return {
        valid: false,
        discount_type: codeRecord.discountType,
        discount_amount: null,
        message: "You have reached the maximum usage limit for this discount code",
        messageFa: "شما به حداکثر تعداد استفاده از این کد تخفیف رسیده‌اید",
      };
    }
  }

  // Check minimum purchase amount
  if (
    codeRecord.minPurchaseAmount !== null &&
    cartTotal < Number(codeRecord.minPurchaseAmount)
  ) {
    return {
      valid: false,
      discount_type: codeRecord.discountType,
      discount_amount: null,
      message: `Minimum purchase amount of ${codeRecord.minPurchaseAmount} is required`,
      messageFa: `حداقل مبلغ خرید ${codeRecord.minPurchaseAmount} مورد نیاز است`,
    };
  }

  // Check if this is a reward-generated code
  // Reward codes: generated from reward point conversions (24-hour lifetime, single-use, personal)
  const isRewardCode = codeRecord.isRewardGenerated;

  // Reward codes cannot be free_shipping type - they can only discount products, not shipping
  // This is an extra safety check since reward codes are always generated as percentage type
  if (isRewardCode && codeRecord.discountType === "free_shipping") {
    return {
      valid: false,
      discount_type: "free_shipping",
      discount_amount: null,
      message: "Reward codes cannot be used for free shipping",
      messageFa: "کدهای جایزه برای ارسال رایگان قابل استفاده نیستند",
    };
  }

  // Calculate discount amount based on type
  let discountAmount: number | null = null;

  if (codeRecord.discountType === "percentage") {
    if (codeRecord.discountValue === null) {
      return {
        valid: false,
        discount_type: "percentage",
        discount_amount: null,
        message: "Invalid discount code configuration",
        messageFa: "پیکربندی کد تخفیف نامعتبر است",
      };
    }

    const percentage = Number(codeRecord.discountValue);
    discountAmount = (cartTotal * percentage) / 100;

    // Apply max discount amount cap if set
    if (codeRecord.maxDiscountAmount !== null) {
      discountAmount = Math.min(discountAmount, Number(codeRecord.maxDiscountAmount));
    }

    // Don't exceed cart total (subtotal only - shipping is never discounted)
    discountAmount = Math.min(discountAmount, cartTotal);
  } else if (codeRecord.discountType === "fixed_amount") {
    if (codeRecord.discountValue === null) {
      return {
        valid: false,
        discount_type: "fixed_amount",
        discount_amount: null,
        message: "Invalid discount code configuration",
      };
    }

    discountAmount = Math.min(Number(codeRecord.discountValue), cartTotal);
  } else if (codeRecord.discountType === "free_shipping") {
    // Store shipping cost as discount amount
    // Note: Reward codes are already blocked from this type above
    discountAmount = shippingCost;
  }

  // Extra safety: For reward codes, ensure discount never exceeds subtotal
  // This prevents any edge case where shipping could be affected
  if (isRewardCode && discountAmount !== null) {
    discountAmount = Math.min(discountAmount, cartTotal);
  }

  return {
    valid: true,
    discount_type: codeRecord.discountType,
    discount_amount: discountAmount,
    message: "Discount code applied successfully",
    codeId: codeRecord.id,
  };
}

/**
 * Record discount code usage
 */
// NOTE: Discount code usage is recorded inline in app/api/orders/route.ts (line 510)
// This ensures usage is recorded within the order transaction with row-level locking
// to prevent concurrent usage of limited codes.

