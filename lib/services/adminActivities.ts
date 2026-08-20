import { db } from "@/lib/db";
import { adminActivities } from "@/lib/db/schema";

export type AdminActivityType =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "order_placed"
  | "order_status_changed"
  | "settings_updated"
  | "journal_post_created"
  | "journal_post_updated"
  | "journal_post_deleted"
  | "discount_code_created"
  | "discount_code_updated"
  | "discount_code_deleted"
  | "discount_code_users_added"
  | "discount_code_users_removed";

interface CreateAdminActivityParams {
  adminId: string;
  activityType: AdminActivityType;
  activityData?: Record<string, any>;
}

export const createAdminActivity = async ({
  adminId,
  activityType,
  activityData = {},
}: CreateAdminActivityParams) => {
  try {
    await db.insert(adminActivities).values({
      adminId,
      activityType,
      activityData: JSON.stringify(activityData),
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating admin activity:", error);
    return { success: false, error };
  }
};

