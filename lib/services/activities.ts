import { db } from "@/lib/db";
import { userActivities } from "@/lib/db/schema";

export type ActivityType =
  | "phone_verified"
  | "order_placed"
  | "address_added"
  | "address_updated"
  | "profile_updated"
  | "email_verified"
  | "discount_code_received"
  | "payment_verified"
  | "payment_settings_changed"
  | "reward_earned";

interface CreateActivityParams {
  userId: string;
  activityType: ActivityType;
  activityData?: Record<string, any>;
}

export const createActivity = async ({
  userId,
  activityType,
  activityData = {},
}: CreateActivityParams) => {
  try {
    await db.insert(userActivities).values({
      userId,
      activityType,
      activityData: JSON.stringify(activityData),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating activity:", error);
    return { success: false, error };
  }
};

