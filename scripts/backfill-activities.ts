import "dotenv/config";
import { db } from "../lib/db";
import { users, orders, addresses, userActivities } from "../lib/db/schema";
import { eq, isNotNull } from "drizzle-orm";
import { createActivity } from "../lib/services/activities";

/**
 * Backfill script to create activities for existing user data
 * This will create activities for:
 * - Users who have verified their phone
 * - Users who have placed orders
 * - Users who have addresses
 * 
 * Run with: tsx scripts/backfill-activities.ts
 */

async function backfillActivities() {
  try {
    console.log("Starting activity backfill...");

    // Get all users
    const allUsers = await db.query.users.findMany();

    let activitiesCreated = 0;

    for (const user of allUsers) {
      // Check if phone is verified
      if (user.phoneVerified) {
        // Check if activity already exists
        const existingActivity = await db.query.userActivities.findFirst({
          where: (userActivities, { eq, and }) =>
            and(
              eq(userActivities.userId, user.id),
              eq(userActivities.activityType, "phone_verified")
            ),
        });

        if (!existingActivity) {
          await createActivity({
            userId: user.id,
            activityType: "phone_verified",
            activityData: { verified: true },
          });
          activitiesCreated++;
          console.log(`Created phone_verified activity for user ${user.id}`);
        }
      }

      // Check if email is verified
      if (user.emailVerified) {
        const existingActivity = await db.query.userActivities.findFirst({
          where: (userActivities, { eq, and }) =>
            and(
              eq(userActivities.userId, user.id),
              eq(userActivities.activityType, "email_verified")
            ),
        });

        if (!existingActivity) {
          await createActivity({
            userId: user.id,
            activityType: "email_verified",
            activityData: { verified: true },
          });
          activitiesCreated++;
          console.log(`Created email_verified activity for user ${user.id}`);
        }
      }

      // Get user's orders
      const userOrders = await db.query.orders.findMany({
        where: eq(orders.userId, user.id),
        orderBy: (orders, { desc }) => [desc(orders.createdAt)],
      });

      for (const order of userOrders) {
        // Check if this specific order already has an activity
        const allUserOrderActivities = await db.query.userActivities.findMany({
          where: (userActivities, { eq, and }) =>
            and(
              eq(userActivities.userId, user.id),
              eq(userActivities.activityType, "order_placed")
            ),
        });
        
        const orderAlreadyHasActivity = allUserOrderActivities.some(
          (act) =>
            act.activityData &&
            JSON.parse(act.activityData).orderNumber === order.orderNumber
        );

        if (!orderAlreadyHasActivity) {
          await createActivity({
            userId: user.id,
            activityType: "order_placed",
            activityData: { orderNumber: order.orderNumber },
          });
          activitiesCreated++;
          console.log(`Created order_placed activity for user ${user.id}, order ${order.orderNumber}`);
        }
      }

      // Get user's addresses
      const userAddresses = await db.query.addresses.findMany({
        where: eq(addresses.userId, user.id),
      });

      for (const address of userAddresses) {
        // Check for address_added activity
        const allUserActivities = await db.query.userActivities.findMany({
          where: (userActivities, { eq }) => eq(userActivities.userId, user.id),
        });
        
        const existingAddedActivity = allUserActivities.find(
          (act) =>
            act.activityType === "address_added" &&
            act.activityData &&
            JSON.parse(act.activityData).addressId === address.id
        );

        if (!existingAddedActivity) {
          await createActivity({
            userId: user.id,
            activityType: "address_added",
            activityData: { addressId: address.id },
          });
          activitiesCreated++;
          console.log(`Created address_added activity for user ${user.id}, address ${address.id}`);
        }

        // If address was updated (has updatedAt different from createdAt), create update activity
        if (address.updatedAt && address.createdAt && address.updatedAt.getTime() !== address.createdAt.getTime()) {
            const existingUpdatedActivity = allUserActivities.find(
              (act) =>
                act.activityType === "address_updated" &&
                act.activityData &&
                JSON.parse(act.activityData).addressId === address.id
            );

          if (!existingUpdatedActivity) {
            await createActivity({
              userId: user.id,
              activityType: "address_updated",
              activityData: { addressId: address.id },
            });
            activitiesCreated++;
            console.log(`Created address_updated activity for user ${user.id}, address ${address.id}`);
          }
        }
      }
    }

    console.log(`\n✅ Backfill complete! Created ${activitiesCreated} activities.`);
  } catch (error) {
    console.error("Error during backfill:", error);
    process.exit(1);
  }
}

// Run the backfill
backfillActivities()
  .then(() => {
    console.log("Backfill script finished.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

