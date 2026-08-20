import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { userActivities, adminActivities, contactMessages, orders, users, guestOrders } from "@/lib/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5");
    const offset = parseInt(searchParams.get("offset") || "0");
    const typeFilter = searchParams.get("type"); // Filter by activity type

    // Fetch all orders (both registered and guest)
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    // Fetch guest orders
    const guestOrdersMap = new Map<string, typeof guestOrders.$inferSelect>();
    if (allOrders.length > 0) {
      const guestOrdersData = await db
        .select()
        .from(guestOrders)
        .where(inArray(guestOrders.orderId, allOrders.map((o) => o.id)));

      guestOrdersData.forEach((go) => {
        guestOrdersMap.set(go.orderId, go);
      });
    }

    // Get user info for registered orders
    const registeredUserIds = [...new Set(allOrders.filter((o) => o.userId).map((o) => o.userId!))];
    const usersMap = new Map<string, typeof users.$inferSelect>();
    for (const userId of registeredUserIds) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        usersMap.set(userId, user);
      }
    }

    // Format all orders as activities
    const formattedOrderActivities = allOrders.map((order) => {
      const guestOrder = guestOrdersMap.get(order.id);
      const isGuest = !!guestOrder;
      
      let customerName = "Unknown Customer";
      let customerEmail = "";
      
      if (isGuest && guestOrder) {
        customerName = guestOrder.guestName;
        customerEmail = guestOrder.guestEmail || "";
      } else if (order.userId) {
        const user = usersMap.get(order.userId);
        if (user) {
          customerName = `${user.name} ${user.surname || ""}`.trim();
          customerEmail = user.email || "";
        }
      }

      return {
        id: `order_placed_${order.id}`,
        type: "order_placed",
        activityType: "order_placed",
        activityData: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          isGuest,
        },
        orderNumber: order.orderNumber,
        userName: customerName,
        userEmail: customerEmail,
        isGuest,
        createdAt: order.createdAt,
      };
    });

    // Fetch order status changes (from orders table - compare createdAt vs updatedAt)
    // For now, we'll track status changes by checking if status changed
    // In the future, we can add a separate order_status_history table
    // Reuse allOrders data for status changes
    // Format order status changes - only show orders that have been processed beyond pending
    const orderStatusActivities = allOrders
      .filter((order) => {
        // Show orders that have status other than pending (meaning status changed)
        // And orders that were updated after creation (potential status change)
        const wasUpdated = new Date(order.updatedAt).getTime() > new Date(order.createdAt).getTime() + 1000; // 1 second buffer
        return order.status !== "pending" && wasUpdated;
      })
      .map((order) => ({
        id: `order_status_${order.id}`,
        type: "order_status_change",
        activityType: "order_status_changed",
        activityData: {
          orderId: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
        },
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.updatedAt, // Use updatedAt for status changes
      }));

    // Fetch contact messages
    const contactMessagesData = await db
      .select()
      .from(contactMessages)
      .orderBy(desc(contactMessages.createdAt));

    // Format contact messages
    const contactMessageActivities = contactMessagesData.map((message) => ({
      id: `contact_message_${message.id}`,
      type: "contact_message",
      activityType: "contact_message",
      activityData: {
        messageId: message.id,
        name: message.name,
        email: message.email,
        subject: message.subject,
      },
      userName: message.name,
      userEmail: message.email,
      subject: message.subject,
      createdAt: message.createdAt,
    }));

    // Fetch admin activities
    const adminActivitiesData = await db
      .select()
      .from(adminActivities)
      .orderBy(desc(adminActivities.createdAt));

    // Get admin user info
    const adminIds = [...new Set(adminActivitiesData.map((a) => a.adminId))];
    const adminsMap = new Map<string, typeof users.$inferSelect>();
    for (const adminId of adminIds) {
      const admin = await db.query.users.findFirst({
        where: eq(users.id, adminId),
      });
      if (admin) {
        adminsMap.set(adminId, admin);
      }
    }

    // Format admin activities
    const formattedAdminActivities = adminActivitiesData.map((activity) => {
      const admin = adminsMap.get(activity.adminId);
      const activityData = activity.activityData ? JSON.parse(activity.activityData) : {};
      return {
        id: `admin_activity_${activity.id}`,
        type: "admin_activity",
        activityType: activity.activityType,
        activityData,
        adminName: admin ? `${admin.name} ${admin.surname || ""}`.trim() : "Admin",
        createdAt: activity.createdAt,
      };
    });

    // Combine all activities
    let allActivities = [
      ...formattedOrderActivities,
      ...orderStatusActivities,
      ...contactMessageActivities,
      ...formattedAdminActivities,
    ];

    // Apply type filter if provided
    if (typeFilter && typeFilter !== "all") {
      allActivities = allActivities.filter((activity) => {
        return activity.type === typeFilter || activity.activityType === typeFilter;
      });
    }

    // Sort by date (newest first)
    allActivities.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Apply pagination
    const paginatedActivities = allActivities.slice(offset, offset + limit);
    const hasMore = allActivities.length > offset + limit;

    return NextResponse.json({
      activities: paginatedActivities,
      hasMore,
      total: allActivities.length,
    });
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

