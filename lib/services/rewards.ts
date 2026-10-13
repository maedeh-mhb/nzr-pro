import { db } from "@/lib/db";
import { users, rewardHistory, orders, orderItems, products, settings, discountCodes, discountCodeUsers } from "@/lib/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { randomBytes } from "crypto";

/**
 * Calculate and distribute rewards for an order when payment is verified
 */
export async function distributeOrderRewards(orderId: string): Promise<void> {
  try {
    // Get order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order || !order.userId) {
      // Guest orders don't get rewards
      return;
    }

    // Check if payment is verified
    if (!order.paymentVerified) {
      // Payment not verified yet, don't distribute rewards
      return;
    }

    // Check if rewards have already been distributed for this order
    const existingRewards = await db.query.rewardHistory.findFirst({
      where: eq(rewardHistory.orderId, orderId),
    });

    if (existingRewards) {
      // Rewards already distributed
      return;
    }

    // Fetch order items manually (in case relations aren't working)
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, orderId),
    });

    if (!items || items.length === 0) {
      return;
    }

    let totalPointsEarned = 0;

    // Calculate rewards for each item
    for (const item of items) {
      // Get product to check reward points
      const product = await db.query.products.findFirst({
        where: eq(products.id, item.productId),
      });

      if (product && product.rewardPoints && product.rewardPoints > 0) {
        const pointsForThisItem = product.rewardPoints * item.quantity;
        totalPointsEarned += pointsForThisItem;

        // Create reward history entry
        await db.insert(rewardHistory).values({
          userId: order.userId,
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          points: pointsForThisItem,
          quantity: item.quantity,
          rewardPerItem: product.rewardPoints,
        });

        // Create user activity for reward earned
        const { createActivity } = await import("@/lib/services/activities");
        await createActivity({
          userId: order.userId,
          activityType: "reward_earned",
          activityData: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            productId: item.productId,
            productName: item.productName,
            points: pointsForThisItem,
            quantity: item.quantity,
            rewardPerItem: product.rewardPoints,
          },
        });
      }
    }

    // Update user's total points and create notification
    if (totalPointsEarned > 0) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
      });

      if (user) {
        const newTotalPoints = (user.totalPoints || 0) + totalPointsEarned;
        await db
          .update(users)
          .set({ totalPoints: newTotalPoints })
          .where(eq(users.id, order.userId));

        // Create notification for reward earned
        const { createNotification } = await import("@/lib/services/notifications");
        await createNotification({
          userId: order.userId,
          type: "reward_earned",
          title: "Rewards Earned",
          titleFa: "پاداش دریافت شد",
          message: `You earned ${totalPointsEarned} reward point${totalPointsEarned > 1 ? "s" : ""} from order #${order.orderNumber}. Your total points: ${newTotalPoints}`,
          messageFa: `شما ${totalPointsEarned} امتیاز پاداش از سفارش #${order.orderNumber} دریافت کردید. مجموع امتیازهای شما: ${newTotalPoints}`,
          notificationData: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            pointsEarned: totalPointsEarned,
            totalPoints: newTotalPoints,
          },
        });
      }
    }
  } catch (error) {
    console.error("Error distributing order rewards:", error);
    throw error;
  }
}

/**
 * Get user's total reward points
 */
export async function getUserTotalPoints(userId: string): Promise<number> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    return user?.totalPoints || 0;
  } catch (error) {
    console.error("Error getting user total points:", error);
    return 0;
  }
}

/**
 * Get user's reward history
 */
export async function getUserRewardHistory(
  userId: string,
  limit: number = 10,
  offset: number = 0
) {
  try {
    const history = await db.query.rewardHistory.findMany({
      where: eq(rewardHistory.userId, userId),
      orderBy: (rewardHistory, { desc }) => [desc(rewardHistory.createdAt)],
      limit,
      offset,
    });

    return history;
  } catch (error) {
    console.error("Error getting user reward history:", error);
    return [];
  }
}

/**
 * Convert points to discount code
 */
export async function convertPointsToDiscountCode(
  userId: string,
  pointsToConvert: number,
  thresholdIndex: number
): Promise<{ success: boolean; discountCodeId?: string; error?: string }> {
  try {
    // Get reward thresholds from settings
    const thresholdsSetting = await db.query.settings.findFirst({
      where: eq(settings.key, "reward_thresholds"),
    });

    if (!thresholdsSetting || !thresholdsSetting.value) {
      return {
        success: false,
        error: "Reward thresholds not configured",
      };
    }

    // Parse thresholds JSON
    let thresholds: Array<{ value: number; discount: number }> = [];
    try {
      thresholds = JSON.parse(thresholdsSetting.value);
    } catch (e) {
      return {
        success: false,
        error: "Invalid reward thresholds configuration",
      };
    }

    if (!Array.isArray(thresholds) || thresholds.length === 0) {
      return {
        success: false,
        error: "No reward thresholds configured",
      };
    }

    // Validate threshold index
    if (thresholdIndex < 0 || thresholdIndex >= thresholds.length) {
      return {
        success: false,
        error: "Invalid threshold index",
      };
    }

    const selectedThreshold = thresholds[thresholdIndex];
    const threshold = selectedThreshold.value;
    const discount = selectedThreshold.discount;

    // Check if user exists and is verified
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return {
        success: false,
        error: "User not found",
      };
    }

    // User must have at least one verified purchase
    // Check if user has any orders with verified payment
    const verifiedOrders = await db.query.orders.findMany({
      where: and(
        eq(orders.userId, userId),
        isNotNull(orders.paymentVerified)
      ),
      limit: 1,
    });

    if (verifiedOrders.length === 0) {
      return {
        success: false,
        error: "You must have at least one verified purchase before generating discount codes",
      };
    }

    const currentPoints = user.totalPoints || 0;
    if (currentPoints < threshold) {
      return {
        success: false,
        error: `Insufficient points. You need ${threshold} points to convert to a discount code.`,
      };
    }

    // Verify pointsToConvert matches the threshold value
    if (pointsToConvert !== threshold) {
      return {
        success: false,
        error: "Points amount does not match the selected threshold",
      };
    }

    // Deduct threshold points
    const pointsToDeduct = threshold;

    // Generate discount code with the selected threshold's discount percentage
    const discountCode = await generateDiscountCodeFromPoints(userId, pointsToDeduct, discount);

    // Deduct points from user
    const newTotalPoints = currentPoints - pointsToDeduct;
    await db
      .update(users)
      .set({ totalPoints: newTotalPoints })
      .where(eq(users.id, userId));

    // Create activity for discount code generation
    const { createActivity } = await import("@/lib/services/activities");
    await createActivity({
      userId: userId,
      activityType: "discount_code_received",
      activityData: {
        discountCodeId: discountCode.id,
        pointsUsed: pointsToDeduct,
        discountPercentage: discount,
        thresholdIndex: thresholdIndex,
      },
    });

    // Create notification (without showing the code)
    const { createNotification } = await import("@/lib/services/notifications");
    await createNotification({
      userId: userId,
      type: "discount_code_available",
      title: "Discount Code Generated",
      titleFa: "کد تخفیف ایجاد شد",
      message: `You have successfully generated a ${discount}% discount code using ${pointsToDeduct} reward points.`,
      messageFa: `شما با موفقیت یک کد تخفیف ${discount}% با استفاده از ${pointsToDeduct} امتیاز پاداش ایجاد کردید.`,
      notificationData: {
        discountCodeId: discountCode.id,
        pointsUsed: pointsToDeduct,
        discountPercentage: discount,
      },
    });

    return {
      success: true,
      discountCodeId: discountCode.id,
    };
  } catch (error) {
    console.error("Error converting points to discount code:", error);
    return {
      success: false,
      error: "Failed to convert points to discount code",
    };
  }
}

/**
 * Generate a cryptographically secure random discount code
 * Format: 16 characters containing letters, numbers, and at most 2 special characters
 */
function generateSecureDiscountCode(): string {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const specialChars = "!@#$%&*";
  const allChars = letters + numbers;

  // Generate cryptographically secure random bytes
  const randomBytesArray = randomBytes(16);

  let code = "";
  let specialCharCount = 0;
  const maxSpecialChars = 2;

  // Generate 16 characters
  for (let i = 0; i < 16; i++) {
    const randomValue = randomBytesArray[i];

    // Decide character type: 80% letters/numbers, 20% chance for special (if under limit)
    const useSpecial = specialCharCount < maxSpecialChars && (randomValue % 10) < 2;

    if (useSpecial) {
      const specialIndex = randomValue % specialChars.length;
      code += specialChars[specialIndex];
      specialCharCount++;
    } else {
      // Use letters or numbers
      const charIndex = randomValue % allChars.length;
      code += allChars[charIndex];
    }
  }

  // Ensure at least one number and one letter for better security
  const hasNumber = /[0-9]/.test(code);
  const hasLetter = /[A-Za-z]/.test(code);

  if (!hasNumber || !hasLetter) {
    // Regenerate if missing required character types
    return generateSecureDiscountCode();
  }

  return code;
}

/**
 * Generate a discount code from points
 * SECURITY: Only verified users with verified purchases can generate codes
 */
async function generateDiscountCodeFromPoints(userId: string, pointsUsed: number, discountPercentage: number) {
  try {
    // Generate cryptographically secure random code (16 chars: letters, numbers, max 2 special)
    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure code is unique (check against existing codes)
    do {
      code = generateSecureDiscountCode();
      attempts++;

      if (attempts > maxAttempts) {
        throw new Error("Failed to generate unique discount code after multiple attempts");
      }

      // Check if code already exists
      const existingCode = await db.query.discountCodes.findFirst({
        where: eq(discountCodes.code, code),
      });

      if (!existingCode) {
        break; // Code is unique
      }
    } while (attempts <= maxAttempts);

    // Create discount code (valid for 24 hours from generation)
    // IMPORTANT: Reward codes can only discount product subtotal, never shipping costs
    // This is enforced in validateDiscountCode() function
    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setHours(validUntil.getHours() + 24); // 24 hours from now


    const [discountCode] = await db
      .insert(discountCodes)
      .values({
        code,
        type: "personal", // Personal codes can only be used by the generating user
        discountType: "percentage", // Only percentage or fixed_amount allowed, never free_shipping
        discountValue: String(discountPercentage), // Use the discount from the selected threshold
        validFrom,
        validUntil,
        isActive: true,
        isRewardGenerated: true, // Explicit flag for reward-generated codes
        createdBy: userId,
        description: `Reward code from ${pointsUsed} points`,
        descriptionFa: `کد تخفیف از ${pointsUsed} امتیاز`,
        userLimit: 1, // Can only be used once by the user
      })
      .returning();

    if (!discountCode) {
      throw new Error("Failed to create discount code - no code returned");
    }

    // SECURITY: Link code to user in discount_code_users table
    // This ensures ONLY the generating user can use this code
    await db.insert(discountCodeUsers).values({
      discountCodeId: discountCode.id,
      userId: userId,
    });

    return discountCode;
  } catch (error) {
    console.error("Error in generateDiscountCodeFromPoints:", error);
    throw error;
  }
}
