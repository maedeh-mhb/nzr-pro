import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { cartItems, users, products, notifications, contactSettings } from "@/lib/db/schema";
import { eq, and, lt, gte, lte } from "drizzle-orm";
import { sendCartFollowupEmail } from "@/lib/services/email";
import { getOrCreateCartReminder } from "@/lib/services/notifications";
export const dynamic = "force-dynamic";

/**
 * Enhanced abandoned cart follow-up system
 * Sends multiple follow-up emails at different intervals:
 * - Day 3: First reminder
 * - Day 7: Second reminder
 * - Day 14: Final reminder
 * 
 * This endpoint should be called daily (via cron job or scheduled task)
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization for cron endpoint
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = new Date();
    
    // Define follow-up intervals (in days)
    const followUpIntervals = [
      { days: 3, name: "first" },
      { days: 7, name: "second" },
      { days: 14, name: "final" },
    ];

    let totalEmailsSent = 0;
    let totalNotificationsCreated = 0;

    // Process each follow-up interval
    for (const interval of followUpIntervals) {
      const daysAgo = new Date(now);
      daysAgo.setDate(daysAgo.getDate() - interval.days);
      
      // Find cart items that are exactly at this interval (within 24 hours)
      const dayStart = new Date(daysAgo);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(daysAgo);
      dayEnd.setHours(23, 59, 59, 999);

      const cartItemsAtInterval = await db
        .select()
        .from(cartItems)
        .where(
          and(
            gte(cartItems.updatedAt, dayStart),
            lte(cartItems.updatedAt, dayEnd)
          )
        );

      // Group by user
      const userCartMap = new Map<string, typeof cartItems.$inferSelect[]>();
      for (const item of cartItemsAtInterval) {
        if (!userCartMap.has(item.userId)) {
          userCartMap.set(item.userId, []);
        }
        userCartMap.get(item.userId)!.push(item);
      }

      // Process each user's cart for this interval
      for (const [userId, items] of userCartMap.entries()) {
        // Fetch user
        const user = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });

        if (!user || !user.email || !user.emailVerified) {
          continue; // Skip users without verified email
        }

        // Get or create cart reminder notification
        let reminder = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, userId),
            eq(notifications.type, "cart_reminder")
          ),
        });

        if (!reminder) {
          await getOrCreateCartReminder(userId, items.length);
          reminder = await db.query.notifications.findFirst({
            where: and(
              eq(notifications.userId, userId),
              eq(notifications.type, "cart_reminder")
            ),
          });
        }

        if (!reminder) continue;

        // Parse notification data to check which emails have been sent
        const notificationData = reminder.notificationData
          ? JSON.parse(reminder.notificationData)
          : {};

        const emailsSent = notificationData.emailsSent || {};
        const emailKey = `${interval.name}_email_sent`;

        // Skip if this follow-up email was already sent
        if (emailsSent[emailKey]) {
          continue;
        }

        // Check if we should send this follow-up based on cart age
        // Only send if cart is at least the required number of days old
        const oldestItem = items.reduce((oldest, item) => {
          return item.updatedAt < oldest.updatedAt ? item : oldest;
        }, items[0]);

        const cartAgeInDays = Math.floor(
          (now.getTime() - oldestItem.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        // Only send if cart is at least the required age
        if (cartAgeInDays < interval.days) {
          continue;
        }

        // Fetch product details for email
        const cartItemsWithProducts = await Promise.all(
          items.map(async (item) => {
            const product = await db.query.products.findFirst({
              where: eq(products.id, item.productId),
            });
            return {
              name: product?.name || "Unknown Product",
              quantity: item.quantity,
              price: product?.price || "0",
            };
          })
        );

        // Calculate total
        const total = cartItemsWithProducts.reduce((sum, item) => {
          return sum + parseFloat(item.price) * item.quantity;
        }, 0);

        // Get contact settings for email footer
        const contactSettingsData = await db.query.contactSettings.findFirst();

        // Send email
        try {
          await sendCartFollowupEmail(user.email, {
            name: `${user.name} ${user.surname || ""}`.trim(),
            items: cartItemsWithProducts,
            total: total.toFixed(2),
            checkoutLink: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout`,
            telegram: contactSettingsData?.telegram || null,
            instagram: contactSettingsData?.instagram || null,
            whatsapp: contactSettingsData?.whatsapp || null,
            contactAddress: contactSettingsData?.address || null,
            contactAddressFa: contactSettingsData?.addressFa || null,
            contactEmail: contactSettingsData?.email || null,
            language: "fa",
          });

          totalEmailsSent++;

          // Update notification data to track which emails were sent
          const updatedEmailsSent = {
            ...emailsSent,
            [emailKey]: true,
            [`${emailKey}_at`]: new Date().toISOString(),
          };

          await db
            .update(notifications)
            .set({
              notificationData: JSON.stringify({
                ...notificationData,
                emailsSent: updatedEmailsSent,
                lastEmailSent: interval.name,
                lastEmailSentAt: new Date().toISOString(),
              }),
              updatedAt: new Date(),
            })
            .where(eq(notifications.id, reminder.id));

          totalNotificationsCreated++;
        } catch (emailError) {
          console.error(`Error sending ${interval.name} follow-up email to user ${userId}:`, emailError);
          // Continue with other users
        }
      }
    }

    return NextResponse.json({
      success: true,
      emailsSent: totalEmailsSent,
      notificationsCreated: totalNotificationsCreated,
      message: `Processed abandoned cart follow-ups. Sent ${totalEmailsSent} email(s).`,
    });
  } catch (error) {
    console.error("Error processing abandoned carts:", error);
    return NextResponse.json(
      { error: "Failed to process abandoned carts" },
      { status: 500 }
    );
  }
}

