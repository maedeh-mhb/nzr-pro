import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, orders, products, contactMessages, reviews, refunds } from "@/lib/db/schema";
import { count, eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all counts in parallel
    const [
      usersCount,
      ordersCount,
      productsCount,
      unreadMessagesCount,
      unverifiedReviewsCount,
      pendingRefundsCount,
    ] = await Promise.all([
      // Total Users
      db.select({ count: count() }).from(users),
      
      // Total Orders
      db.select({ count: count() }).from(orders),
      
      // Total Products
      db.select({ count: count() }).from(products),
      
      // Unread Contact Messages
      db.select({ count: count() })
        .from(contactMessages)
        .where(eq(contactMessages.isRead, false)),
      
      // Unverified Reviews
      db.select({ count: count() })
        .from(reviews)
        .where(eq(reviews.isVerified, false)),
      
      // Pending Refunds
      db.select({ count: count() })
        .from(refunds)
        .where(eq(refunds.status, "pending")),
    ]);

    return NextResponse.json({
      counts: {
        users: usersCount[0]?.count || 0,
        orders: ordersCount[0]?.count || 0,
        products: productsCount[0]?.count || 0,
        contactMessages: unreadMessagesCount[0]?.count || 0,
        reviews: unverifiedReviewsCount[0]?.count || 0,
        refunds: pendingRefundsCount[0]?.count || 0,
      },
    });
  } catch (error) {
    console.error("Error fetching section counts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch section counts", details: errorMessage },
      { status: 500 }
    );
  }
}

