import "dotenv/config";
import { db } from "../lib/db";
import { users, cartItems, notifications } from "../lib/db/schema";
import { eq, and } from "drizzle-orm";
import { getOrCreateCartReminder } from "../lib/services/notifications";

/**
 * Backfill script to create notifications for existing user data
 * This will create:
 * - Cart reminder notifications for users with items in cart
 * 
 * Run with: tsx scripts/backfill-notifications.ts
 */

async function backfillNotifications() {
  try {
    console.log("Starting notification backfill...");

    // Get all users who have cart items
    const usersWithCart = await db
      .selectDistinct({ userId: cartItems.userId })
      .from(cartItems);

    let notificationsCreated = 0;

    for (const { userId } of usersWithCart) {
      if (!userId) continue;

      // Get cart item count for this user
      const userCartItems = await db.query.cartItems.findMany({
        where: eq(cartItems.userId, userId),
      });

      if (userCartItems.length > 0) {
        // Check if notification already exists
        const existingNotification = await db.query.notifications.findFirst({
          where: and(
            eq(notifications.userId, userId),
            eq(notifications.type, "cart_reminder"),
            eq(notifications.dismissed, false)
          ),
        });

        if (!existingNotification) {
          await getOrCreateCartReminder(userId, userCartItems.length);
          notificationsCreated++;
          console.log(`Created cart reminder notification for user ${userId} (${userCartItems.length} items)`);
        }
      }
    }

    console.log(`\n✅ Backfill complete! Created ${notificationsCreated} notifications.`);
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillNotifications()
  .then(() => {
    console.log("Backfill script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

