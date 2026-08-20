import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, users } from "@/lib/db/schema";
import { eq, and, desc, count as drizzleCount } from "drizzle-orm";
import { getUnreadCount } from "@/lib/services/notifications";
import { paginatedResponse } from "@/lib/utils/apiResponse";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let limit = parseInt(searchParams.get("limit") || "20", 10);

    // Validate pagination params
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 20;
    if (limit > 100) limit = 100;

    // Get total count
    const totalResult = await db
      .select({ count: drizzleCount() })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.dismissed, false)
        )
      );
    const total = totalResult[0]?.count || 0;

    // Calculate offset and fetch paginated notifications
    const offset = (page - 1) * limit;
    const userNotifications = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.dismissed, false)
        )
      )
      .orderBy(desc(notifications.createdAt))
      .offset(offset)
      .limit(limit);

    // Get unread count
    const unreadCount = await getUnreadCount(userId);

    // Parse notification data
    const formattedNotifications = userNotifications.map((notification) => ({
      id: notification.id,
      type: notification.type,
      title: notification.title,
      titleFa: notification.titleFa,
      message: notification.message,
      messageFa: notification.messageFa,
      isRead: notification.isRead,
      notificationData: notification.notificationData
        ? JSON.parse(notification.notificationData)
        : {},
      createdAt: notification.createdAt,
    }));

    // Sort: cart_reminder first, then by date
    const sortedNotifications = formattedNotifications.sort((a, b) => {
      if (a.type === "cart_reminder" && b.type !== "cart_reminder") return -1;
      if (a.type !== "cart_reminder" && b.type === "cart_reminder") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Return paginated response with unreadCount metadata
    const response = paginatedResponse(sortedNotifications, page, limit, total);
    const data = await response.json();
    return NextResponse.json({
      ...data,
      unreadCount,
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

