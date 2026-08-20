import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, wishlist, notifications, walletTransactions, contactMessages, users } from "@/lib/db/schema";
import { count, sum, eq, and, isNull, isNotNull } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user to get totalPoints
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // Fetch all stats in parallel
    const [ordersCount, wishlistCount, unreadNotificationsCount, unreadMessagesCount, creditTransactions, debitTransactions] = await Promise.all([
      // Total Orders for this user
      db.select({ count: count() }).from(orders).where(eq(orders.userId, userId)),
      
      // Total Wishlist items for this user
      db.select({ count: count() }).from(wishlist).where(eq(wishlist.userId, userId)),
      
      // Unread notifications count
      db.select({ count: count() }).from(notifications).where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false),
          eq(notifications.dismissed, false)
        )
      ),
      
      // Unread messages count (messages with replies that user hasn't read)
      db.select({ count: count() }).from(contactMessages).where(
        and(
          eq(contactMessages.userId, userId),
          isNull(contactMessages.parentMessageId), // Only parent messages
          isNotNull(contactMessages.reply), // Has a reply
          eq(contactMessages.isReadByUser, false) // User hasn't read it
        )
      ),
      
      // Sum of credit transactions
      db.select({ 
        total: sum(walletTransactions.amount) 
      }).from(walletTransactions).where(
        and(
          eq(walletTransactions.userId, userId),
          eq(walletTransactions.type, "credit")
        )
      ),
      
      // Sum of debit transactions
      db.select({ 
        total: sum(walletTransactions.amount) 
      }).from(walletTransactions).where(
        and(
          eq(walletTransactions.userId, userId),
          eq(walletTransactions.type, "debit")
        )
      ),
    ]);

    // Get reward points from user's totalPoints
    const points = user?.totalPoints || 0;

    const stats = {
      orders: ordersCount[0]?.count || 0,
      wishlist: wishlistCount[0]?.count || 0,
      points: points,
      messages: unreadMessagesCount[0]?.count || 0,
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

