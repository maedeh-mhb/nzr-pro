import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages, orders, reviews, products, adminNotificationReads } from "@/lib/db/schema";
import { eq, and, desc, isNull, inArray } from "drizzle-orm";
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

    // Fetch unread contact messages
    const unreadMessages = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.isRead, false))
      .orderBy(desc(contactMessages.createdAt));

    // Fetch pending/new orders (status: pending)
    const pendingOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "pending"))
      .orderBy(desc(orders.createdAt));

    // Fetch orders that need payment verification (card_to_card payment method, paymentVerified is null)
    const ordersNeedingVerification = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.paymentMethod, "card_to_card"),
          isNull(orders.paymentVerified)
        )
      )
      .orderBy(desc(orders.createdAt));

    // Fetch orders with invoice requests so admin can handle them manually
    const ordersWithInvoiceRequests = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.invoiceRequested, true),
          eq(orders.status, "pending")
        )
      )
      .orderBy(desc(orders.createdAt));

    // Fetch unverified reviews (pending admin approval)
    const unverifiedReviews = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        reviewerName: reviews.reviewerName,
        reviewText: reviews.reviewText,
        createdAt: reviews.createdAt,
        productName: products.name,
        productNameFa: products.nameFa,
      })
      .from(reviews)
      .leftJoin(products, eq(reviews.productId, products.id))
      .where(eq(reviews.isVerified, false))
      .orderBy(desc(reviews.createdAt));

    // Format contact messages as notifications
    const messageNotifications = unreadMessages.map((message) => ({
      id: `message_${message.id}`,
      type: "contact_message",
      title: "New Contact Message",
      titleFa: "پیام تماس جدید",
      message: `From: ${message.name}`,
      messageFa: `از: ${message.name}`,
      isRead: message.isRead,
      createdAt: message.createdAt,
      data: {
        messageId: message.id,
        name: message.name,
        phone: message.phone,
      },
    }));

    // Format orders as notifications
    const orderNotifications = pendingOrders.map((order) => ({
      id: `order_${order.id}`,
      type: "new_order",
      title: "New Order",
      titleFa: "سفارش جدید",
      message: `Order #${order.orderNumber} - ${order.total}`,
      messageFa: `سفارش #${order.orderNumber} - ${order.total}`,
      isRead: false, // Orders are always "unread" until admin views them
      createdAt: order.createdAt,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    }));

    // Format payment verification needed notifications
    const paymentVerificationNotifications = ordersNeedingVerification.map((order) => ({
      id: `payment_verify_${order.id}`,
      type: "payment_verification_needed",
      title: "Payment Verification Needed",
      titleFa: "نیاز به تأیید پرداخت",
      message: `Order #${order.orderNumber} requires payment verification`,
      messageFa: `سفارش #${order.orderNumber} نیاز به تأیید پرداخت دارد`,
      isRead: false,
      createdAt: order.createdAt,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    }));

    const invoiceRequestNotifications = ordersWithInvoiceRequests.map((order) => ({
      id: `invoice_request_${order.id}`,
      type: "invoice_request",
      title: "Invoice Requested",
      titleFa: "درخواست فاکتور",
      message: `Order #${order.orderNumber} requested an invoice`,
      messageFa: `سفارش #${order.orderNumber} درخواست فاکتور داده است`,
      isRead: false,
      createdAt: order.createdAt,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
      },
    }));

    // Format review approval needed notifications
    const reviewApprovalNotifications = unverifiedReviews.map((review) => {
      const productName = review.productNameFa || review.productName || "Product";
      return {
        id: `review_approval_${review.id}`,
        type: "review_approval_needed",
        title: "Review Approval Needed",
        titleFa: "نیاز به تأیید نظر",
        message: `Review from ${review.reviewerName} on ${productName} needs approval`,
        messageFa: `نظر از ${review.reviewerName} برای ${productName} نیاز به تأیید دارد`,
        isRead: false,
        createdAt: review.createdAt,
        data: {
          reviewId: review.id,
          productId: review.productId,
          reviewerName: review.reviewerName,
          productName: productName,
        },
      };
    });

    // Combine and sort by date (newest first)
    const allNotifications = [
      ...messageNotifications,
      ...orderNotifications,
      ...paymentVerificationNotifications,
      ...invoiceRequestNotifications,
      ...reviewApprovalNotifications,
    ].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // Fetch read notification IDs for this admin
    const readRecords = await db
      .select({ notificationId: adminNotificationReads.notificationId })
      .from(adminNotificationReads)
      .where(eq(adminNotificationReads.adminUserId, session.user.id));

    const readIds = new Set(readRecords.map((r) => r.notificationId));

    // Mark notifications as read if they exist in admin_notification_reads
    const notificationsWithReadState = allNotifications.map((n) => ({
      ...n,
      isRead: readIds.has(n.id) || n.isRead,
    }));

    // Check if there are any notifications
    const hasNotifications = notificationsWithReadState.length > 0;

    return NextResponse.json({
      notifications: notificationsWithReadState,
      hasNotifications,
    });
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

