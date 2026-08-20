import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Database health check
    let dbHealth = {
      status: "healthy" as "healthy" | "degraded" | "unhealthy",
      responseTime: 0,
      error: null as string | null,
    };

    const dbStartTime = Date.now();
    try {
      await db.execute(sql`SELECT 1`);
      dbHealth.responseTime = Date.now() - dbStartTime;
      if (dbHealth.responseTime > 1000) {
        dbHealth.status = "degraded";
      }
    } catch (error: any) {
      dbHealth.status = "unhealthy";
      dbHealth.error = error.message;
    }

    // System metrics
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    // Get database stats
    const [userCount] = await db.execute(sql`SELECT COUNT(*) as count FROM users`);
    const [orderCount] = await db.execute(sql`SELECT COUNT(*) as count FROM orders`);
    const [productCount] = await db.execute(sql`SELECT COUNT(*) as count FROM products`);

    return NextResponse.json({
      database: dbHealth,
      system: {
        uptime: Math.floor(uptime),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
          external: Math.round(memoryUsage.external / 1024 / 1024), // MB
        },
        nodeVersion: process.version,
        platform: process.platform,
      },
      stats: {
        users: (userCount as any).count,
        orders: (orderCount as any).count,
        products: (productCount as any).count,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching system health:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

