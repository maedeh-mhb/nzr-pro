import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { and, gte, lte, not, eq, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Calculate date range
    const now = new Date();
    let chartStart: Date;
    let chartEnd: Date = now;

    if (startDate && endDate) {
      chartStart = new Date(startDate);
      chartEnd = new Date(endDate);
    } else {
      switch (period) {
        case "week":
          chartStart = new Date(now);
          chartStart.setDate(chartStart.getDate() - 7);
          break;
        case "year":
          chartStart = new Date(now);
          chartStart.setFullYear(chartStart.getFullYear() - 1);
          break;
        case "month":
        default:
          chartStart = new Date(now);
          chartStart.setMonth(chartStart.getMonth() - 1);
          break;
      }
    }

    // Calculate number of days for grouping
    const daysDiff = Math.ceil((chartEnd.getTime() - chartStart.getTime()) / (1000 * 60 * 60 * 24));
    let groupBy: "day" | "week" | "month" = "day";
    
    if (daysDiff > 90) {
      groupBy = "month";
    } else if (daysDiff > 30) {
      groupBy = "week";
    }

    // Fetch sales data grouped by date
    const salesData = await db
      .select({
        date: sql<string>`DATE(${orders.createdAt})`,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(CASE WHEN ${orders.status} != 'cancelled' THEN ${orders.total} ELSE 0 END), 0)`,
      })
      .from(orders)
      .where(
        and(
          gte(orders.createdAt, chartStart),
          lte(orders.createdAt, chartEnd)
        )
      )
      .groupBy(sql`DATE(${orders.createdAt})`)
      .orderBy(sql`DATE(${orders.createdAt})`);

    // Format data for charts
    const chartData = salesData.map((item) => ({
      date: item.date,
      orders: Number(item.count),
      revenue: Number(item.revenue),
    }));

    return NextResponse.json({
      data: chartData,
      period: {
        start: chartStart.toISOString(),
        end: chartEnd.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error fetching chart data:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch chart data", details: errorMessage },
      { status: 500 }
    );
  }
}

