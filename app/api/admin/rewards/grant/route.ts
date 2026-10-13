import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifications, userActivities, users } from "@/lib/db/schema";
import { eq, ilike, or, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

async function authorizeAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { session: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  if (session.user.role !== "admin" && session.user.role !== "superadmin") {
    return { session: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { session, response: null };
}

export async function GET(request: NextRequest) {
  try {
    const { response } = await authorizeAdmin();
    if (response) return response;

    const search = request.nextUrl.searchParams.get("search")?.trim() || "";
    if (search.length < 2) {
      return NextResponse.json({ users: [] });
    }

    const searchPattern = `%${search}%`;
    const matchingUsers = await db
      .select({
        id: users.id,
        name: users.name,
        surname: users.surname,
        email: users.email,
        phone: users.phone,
        totalPoints: users.totalPoints,
      })
      .from(users)
      .where(
        or(
          ilike(users.name, searchPattern),
          ilike(users.surname, searchPattern),
          ilike(users.email, searchPattern),
          ilike(users.phone, searchPattern)
        )
      )
      .limit(10);

    return NextResponse.json({ users: matchingUsers });
  } catch (error) {
    console.error("Error searching users for reward grant:", error);
    return NextResponse.json({ error: "Failed to search users" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, response } = await authorizeAdmin();
    if (response) return response;

    const body = await request.json();
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const points = body.points;
    const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : "";

    if (!userId) {
      return NextResponse.json({ error: "Select a user" }, { status: 400 });
    }
    if (!Number.isSafeInteger(points) || points < 1 || points > 1000000) {
      return NextResponse.json(
        { error: "Points must be a whole number between 1 and 1,000,000" },
        { status: 400 }
      );
    }

    const updatedUser = await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id, totalPoints: users.totalPoints })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return null;

      const [updated] = await tx
        .update(users)
        .set({ totalPoints: sql`${users.totalPoints} + ${points}` })
        .where(eq(users.id, userId))
        .returning({ totalPoints: users.totalPoints });

      const newTotalPoints = updated.totalPoints;
      const activityData = JSON.stringify({
        source: "admin_grant",
        points,
        reason,
        adminId: session!.user!.id,
        totalPoints: newTotalPoints,
      });

      await tx.insert(userActivities).values({
        userId,
        activityType: "reward_earned",
        activityData,
      });

      await tx.insert(notifications).values({
        userId,
        type: "reward_earned",
        title: "Reward points added",
        titleFa: "امتیاز پاداش اضافه شد",
        message: `An administrator added ${points} reward points to your account.`,
        messageFa: `${points} امتیاز پاداش توسط مدیر به حساب شما اضافه شد.`,
        notificationData: JSON.stringify({ points, reason, totalPoints: newTotalPoints }),
        isRead: false,
        dismissed: false,
      });

      return updated;
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      points,
      totalPoints: updatedUser.totalPoints,
    });
  } catch (error) {
    console.error("Error granting reward points:", error);
    return NextResponse.json({ error: "Failed to grant reward points" }, { status: 500 });
  }
}
