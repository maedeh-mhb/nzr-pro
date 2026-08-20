import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { userActivities } from "@/lib/db/schema";
import { eq, desc, count as drizzleCount } from "drizzle-orm";
import { paginatedResponse } from "@/lib/utils/apiResponse";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate pagination params
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Get total count
    const totalResult = await db
      .select({ count: drizzleCount() })
      .from(userActivities)
      .where(eq(userActivities.userId, userId));
    const total = totalResult[0]?.count || 0;

    // Calculate offset and fetch paginated activities
    const offset = (page - 1) * limit;
    const activities = await db
      .select()
      .from(userActivities)
      .where(eq(userActivities.userId, userId))
      .orderBy(desc(userActivities.createdAt))
      .offset(offset)
      .limit(limit);

    // Parse activity data
    const formattedActivities = activities.map((activity) => ({
      id: activity.id,
      activityType: activity.activityType,
      activityData: activity.activityData ? JSON.parse(activity.activityData) : {},
      createdAt: activity.createdAt,
    }));

    return paginatedResponse(formattedActivities, page, limit, total);
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { error: "Failed to fetch activities" },
      { status: 500 }
    );
  }
}

