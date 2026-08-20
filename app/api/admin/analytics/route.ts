import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, products, refunds, users } from "@/lib/db/schema";
import { eq, not, and, gte, lte, sum, count, sql, desc, isNotNull } from "drizzle-orm";
export const dynamic = "force-dynamic";

/**
 * GET /api/admin/analytics
 * Get analytics data: sales reports, revenue analytics, product performance
 */
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
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const period = searchParams.get("period") || "30"; // days

    // Calculate date range
    const endDate = dateTo ? new Date(dateTo) : new Date();
    const startDate = dateFrom
      ? new Date(dateFrom)
      : new Date(endDate.getTime() - parseInt(period) * 24 * 60 * 60 * 1000);

    // Build date filter conditions
    const dateConditions: any[] = [];
    dateConditions.push(gte(orders.createdAt, startDate));
    const toDate = new Date(endDate);
    toDate.setHours(23, 59, 59, 999);
    dateConditions.push(lte(orders.createdAt, toDate));

    // 1. Revenue Analytics
    const revenueStats = await db
      .select({
        totalRevenue: sum(orders.total),
        orderCount: count(),
        averageOrderValue: sql<number>`AVG(CAST(${orders.total} AS DECIMAL))`,
      })
      .from(orders)
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions));

    const totalRevenue = parseFloat(revenueStats[0]?.totalRevenue?.toString() || "0");
    const orderCount = revenueStats[0]?.orderCount || 0;
    const averageOrderValue = parseFloat(revenueStats[0]?.averageOrderValue?.toString() || "0");

    // Revenue by status
    const revenueByStatus = await db
      .select({
        status: orders.status,
        revenue: sum(orders.total),
        count: count(),
      })
      .from(orders)
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions))
      .groupBy(orders.status);

    // Revenue by payment method
    const revenueByPaymentMethod = await db
      .select({
        paymentMethod: orders.paymentMethod,
        revenue: sum(orders.total),
        count: count(),
      })
      .from(orders)
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions))
      .groupBy(orders.paymentMethod);

    // Daily revenue (last 30 days or date range)
    const dailyRevenue = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        revenue: sum(orders.total),
        orderCount: count(),
      })
      .from(orders)
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions))
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // 2. Product Performance
    const productPerformance = await db
      .select({
        productId: orderItems.productId,
        productName: orderItems.productName,
        totalQuantity: sum(sql<number>`CAST(${orderItems.quantity} AS INTEGER)`),
        totalRevenue: sum(
          sql<number>`CAST(${orderItems.price} AS DECIMAL) * CAST(${orderItems.quantity} AS INTEGER)`
        ),
        orderCount: sql<number>`COUNT(DISTINCT ${orderItems.orderId})`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions))
      .groupBy(orderItems.productId, orderItems.productName)
      .orderBy(desc(sql`SUM(CAST(${orderItems.price} AS DECIMAL) * CAST(${orderItems.quantity} AS INTEGER))`))
      .limit(20);

    // 3. Order Statistics
    const orderStats = await db
      .select({
        status: orders.status,
        count: count(),
      })
      .from(orders)
      .where(and(...dateConditions))
      .groupBy(orders.status);

    // 4. Refund Statistics
    const refundStats = await db
      .select({
        totalRefunded: sum(refunds.amount),
        refundCount: count(),
        pendingRefunds: sql<number>`COUNT(CASE WHEN ${refunds.status} = 'pending' THEN 1 END)`,
        processedRefunds: sql<number>`COUNT(CASE WHEN ${refunds.status} = 'processed' THEN 1 END)`,
      })
      .from(refunds)
      .innerJoin(orders, eq(refunds.orderId, orders.id))
      .where(and(...dateConditions));

    const totalRefunded = parseFloat(refundStats[0]?.totalRefunded?.toString() || "0");
    const refundCount = refundStats[0]?.refundCount || 0;
    const pendingRefunds = refundStats[0]?.pendingRefunds || 0;
    const processedRefunds = refundStats[0]?.processedRefunds || 0;

    // 5. Top Customers (by order value)
    const topCustomers = await db
      .select({
        userId: orders.userId,
        totalSpent: sum(orders.total),
        orderCount: count(),
      })
      .from(orders)
      .where(and(not(eq(orders.status, "cancelled")), ...dateConditions, isNotNull(orders.userId)))
      .groupBy(orders.userId)
      .orderBy(desc(sum(orders.total)))
      .limit(10);

    // Fetch user names for top customers
    const userIds = topCustomers.map((c) => c.userId).filter((id): id is string => id !== null);
    const usersMap = new Map();
    for (const userId of userIds) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        usersMap.set(userId, user);
      }
    }

    const topCustomersWithNames = topCustomers.map((customer) => {
      const user = customer.userId ? usersMap.get(customer.userId) : null;
      return {
        userId: customer.userId,
        customerName: user ? `${user.name} ${user.surname || ""}`.trim() : "Unknown",
        totalSpent: parseFloat(customer.totalSpent?.toString() || "0"),
        orderCount: customer.orderCount || 0,
      };
    });

    return NextResponse.json({
      revenue: {
        total: totalRevenue,
        averageOrderValue,
        orderCount,
        netRevenue: totalRevenue - totalRefunded, // Revenue minus refunds
      },
      revenueByStatus: revenueByStatus.map((r) => ({
        status: r.status,
        revenue: parseFloat(r.revenue?.toString() || "0"),
        count: r.count || 0,
      })),
      revenueByPaymentMethod: revenueByPaymentMethod.map((r) => ({
        paymentMethod: r.paymentMethod || "unknown",
        revenue: parseFloat(r.revenue?.toString() || "0"),
        count: r.count || 0,
      })),
      dailyRevenue: dailyRevenue.map((d) => ({
        date: d.date,
        revenue: parseFloat(d.revenue?.toString() || "0"),
        orderCount: d.orderCount || 0,
      })),
      productPerformance: productPerformance.map((p) => ({
        productId: p.productId,
        productName: p.productName,
        totalQuantity: parseInt(p.totalQuantity?.toString() || "0"),
        totalRevenue: parseFloat(p.totalRevenue?.toString() || "0"),
        orderCount: parseInt(p.orderCount?.toString() || "0"),
      })),
      orderStats: orderStats.map((s) => ({
        status: s.status,
        count: s.count || 0,
      })),
      refunds: {
        totalRefunded,
        refundCount,
        pendingRefunds,
        processedRefunds,
      },
      topCustomers: topCustomersWithNames,
      dateRange: {
        from: startDate.toISOString(),
        to: endDate.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch analytics", details: errorMessage },
      { status: 500 }
    );
  }
}

