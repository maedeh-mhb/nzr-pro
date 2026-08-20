import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, products, journalPosts } from "@/lib/db/schema";
import { count, sum, eq, not, gte, lte, and, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";

interface TrendData {
  current: number;
  previous: number;
  trend: number; // percentage change
  isPositive: boolean;
}

function calculateTrend(current: number, previous: number): TrendData {
  if (previous === 0) {
    return {
      current,
      previous: 0,
      trend: current > 0 ? 100 : 0,
      isPositive: current > 0,
    };
  }
  const trend = ((current - previous) / previous) * 100;
  return {
    current,
    previous,
    trend: Math.abs(trend),
    isPositive: trend >= 0,
  };
}

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

    // Get query parameters for date range
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month"; // week, month, year
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date ranges
    const now = new Date();
    let currentStart: Date;
    let currentEnd: Date = now;
    let previousStart: Date;
    let previousEnd: Date;

    if (startDate && endDate) {
      // Custom date range
      currentStart = new Date(startDate);
      currentEnd = new Date(endDate);
      const rangeDays = Math.ceil((currentEnd.getTime() - currentStart.getTime()) / (1000 * 60 * 60 * 24));
      previousEnd = new Date(currentStart);
      previousEnd.setDate(previousEnd.getDate() - 1);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousStart.getDate() - rangeDays);
    } else {
      // Predefined periods
      switch (period) {
        case "week":
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setDate(currentStart.getDate() - 7);
          previousEnd = new Date(currentStart);
          previousEnd.setDate(previousEnd.getDate() - 1);
          previousStart = new Date(previousEnd);
          previousStart.setDate(previousStart.getDate() - 7);
          break;
        case "year":
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setFullYear(currentStart.getFullYear() - 1);
          previousEnd = new Date(currentStart);
          previousEnd.setDate(previousEnd.getDate() - 1);
          previousStart = new Date(previousEnd);
          previousStart.setFullYear(previousStart.getFullYear() - 1);
          break;
        case "month":
        default:
          currentEnd = now;
          currentStart = new Date(now);
          currentStart.setMonth(currentStart.getMonth() - 1);
          previousEnd = new Date(currentStart);
          previousEnd.setDate(previousEnd.getDate() - 1);
          previousStart = new Date(previousEnd);
          previousStart.setMonth(previousStart.getMonth() - 1);
          break;
      }
    }

    // Fetch current period stats
    const [
      currentUsers,
      currentOrders,
      currentRevenue,
      currentProducts,
      currentJournalPosts,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, currentStart),
            lte(users.createdAt, currentEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, currentStart),
            lte(orders.createdAt, currentEnd)
          )
        ),
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            not(eq(orders.status, "cancelled")),
            gte(orders.createdAt, currentStart),
            lte(orders.createdAt, currentEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            gte(products.createdAt, currentStart),
            lte(products.createdAt, currentEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(journalPosts)
        .where(
          and(
            gte(journalPosts.createdAt, currentStart),
            lte(journalPosts.createdAt, currentEnd)
          )
        ),
    ]);

    // Fetch previous period stats for comparison
    const [
      previousUsers,
      previousOrders,
      previousRevenue,
      previousProducts,
      previousJournalPosts,
    ] = await Promise.all([
      db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            gte(users.createdAt, previousStart),
            lte(users.createdAt, previousEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(orders)
        .where(
          and(
            gte(orders.createdAt, previousStart),
            lte(orders.createdAt, previousEnd)
          )
        ),
      db
        .select({ total: sum(orders.total) })
        .from(orders)
        .where(
          and(
            not(eq(orders.status, "cancelled")),
            gte(orders.createdAt, previousStart),
            lte(orders.createdAt, previousEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(products)
        .where(
          and(
            gte(products.createdAt, previousStart),
            lte(products.createdAt, previousEnd)
          )
        ),
      db
        .select({ count: count() })
        .from(journalPosts)
        .where(
          and(
            gte(journalPosts.createdAt, previousStart),
            lte(journalPosts.createdAt, previousEnd)
          )
        ),
    ]);

    // Calculate totals (all time)
    const [totalUsersAll, totalOrdersAll, totalRevenueAll, totalProductsAll, totalJournalPostsAll] =
      await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(orders),
        db
          .select({ total: sum(orders.total) })
          .from(orders)
          .where(not(eq(orders.status, "cancelled"))),
        db.select({ count: count() }).from(products),
        db.select({ count: count() }).from(journalPosts),
      ]);

    // Calculate trends
    const usersTrend = calculateTrend(
      currentUsers[0]?.count || 0,
      previousUsers[0]?.count || 0
    );
    const ordersTrend = calculateTrend(
      currentOrders[0]?.count || 0,
      previousOrders[0]?.count || 0
    );
    const revenueCurrent = parseFloat(currentRevenue[0]?.total || "0");
    const revenuePrevious = parseFloat(previousRevenue[0]?.total || "0");
    const revenueTrend = calculateTrend(revenueCurrent, revenuePrevious);
    const productsTrend = calculateTrend(
      currentProducts[0]?.count || 0,
      previousProducts[0]?.count || 0
    );
    const journalTrend = calculateTrend(
      currentJournalPosts[0]?.count || 0,
      previousJournalPosts[0]?.count || 0
    );

    const stats = {
      totalUsers: totalUsersAll[0]?.count || 0,
      totalOrders: totalOrdersAll[0]?.count || 0,
      revenue: totalRevenueAll[0]?.total || "0",
      totalProducts: totalProductsAll[0]?.count || 0,
      totalJournalPosts: totalJournalPostsAll[0]?.count || 0,
      trends: {
        users: usersTrend,
        orders: ordersTrend,
        revenue: revenueTrend,
        products: productsTrend,
        journal: journalTrend,
      },
      period: {
        current: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString(),
        },
        previous: {
          start: previousStart.toISOString(),
          end: previousEnd.toISOString(),
        },
      },
    };

    return NextResponse.json({ stats });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats", details: errorMessage },
      { status: 500 }
    );
  }
}

