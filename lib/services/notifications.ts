import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export type NotificationType =
  | "cart_reminder"
  | "order_pending"
  | "order_shipped"
  | "order_delivered"
  | "profile_reminder"
  | "phone_reminder"
  | "message_reply"
  | "discount_code_available"
  | "payment_settings_changed"
  | "reward_earned";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  titleFa?: string;
  message: string;
  messageFa?: string;
  notificationData?: Record<string, any>;
}

export const createNotification = async ({
  userId,
  type,
  title,
  titleFa,
  message,
  messageFa,
  notificationData = {},
}: CreateNotificationParams) => {
  try {
    await db.insert(notifications).values({
      userId,
      type,
      title,
      titleFa,
      message,
      messageFa,
      notificationData: JSON.stringify(notificationData),
      isRead: false,
      dismissed: false,
    });
    return { success: true };
  } catch (error) {
    console.error("Error creating notification:", error);
    return { success: false, error };
  }
};

export const updateNotification = async (
  notificationId: string,
  updates: Partial<{
    isRead: boolean;
    dismissed: boolean;
    notificationData: Record<string, any>;
  }>
) => {
  try {
    const updateData: any = {};
    if (updates.isRead !== undefined) updateData.isRead = updates.isRead;
    if (updates.dismissed !== undefined) updateData.dismissed = updates.dismissed;
    if (updates.notificationData !== undefined) {
      updateData.notificationData = JSON.stringify(updates.notificationData);
    }
    updateData.updatedAt = new Date();

    await db
      .update(notifications)
      .set(updateData)
      .where(eq(notifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error("Error updating notification:", error);
    return { success: false, error };
  }
};

export const markAllNotificationsAsRead = async (userId: string) => {
  try {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));

    return { success: true };
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return { success: false, error };
  }
};

export const dismissNotification = async (notificationId: string) => {
  try {
    await db
      .update(notifications)
      .set({ dismissed: true, updatedAt: new Date() })
      .where(eq(notifications.id, notificationId));

    return { success: true };
  } catch (error) {
    console.error("Error dismissing notification:", error);
    return { success: false, error };
  }
};

export const getUnreadCount = async (userId: string) => {
  try {
    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.dismissed, false)
        )
      );

    return result.length;
  } catch (error) {
    console.error("Error getting unread count:", error);
    return 0;
  }
};

export const getOrCreateCartReminder = async (userId: string, cartItemCount: number) => {
  try {
    // Find existing cart reminder
    const existing = await db.query.notifications.findFirst({
      where: and(
        eq(notifications.userId, userId),
        eq(notifications.type, "cart_reminder"),
        eq(notifications.dismissed, false)
      ),
    });

    if (existing) {
      // Update existing notification
      await db
        .update(notifications)
        .set({
          message: `You have ${cartItemCount} item${cartItemCount > 1 ? "s" : ""} in your cart`,
          messageFa: `شما ${cartItemCount} آیتم در سبد خرید خود دارید`,
          updatedAt: new Date(),
        })
        .where(eq(notifications.id, existing.id));
      return existing.id;
    } else {
      // Create new notification
      const [newNotification] = await db
        .insert(notifications)
        .values({
          userId,
          type: "cart_reminder",
          title: "Items in your cart",
          titleFa: "آیتم‌های سبد خرید",
          message: `You have ${cartItemCount} item${cartItemCount > 1 ? "s" : ""} in your cart`,
          messageFa: `شما ${cartItemCount} آیتم در سبد خرید خود دارید`,
          isRead: false,
          dismissed: false,
        })
        .returning();

      return newNotification.id;
    }
  } catch (error) {
    console.error("Error getting/creating cart reminder:", error);
    return null;
  }
};

export const deleteCartReminder = async (userId: string) => {
  try {
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.type, "cart_reminder")
        )
      );
    return { success: true };
  } catch (error) {
    console.error("Error deleting cart reminder:", error);
    return { success: false, error };
  }
};

