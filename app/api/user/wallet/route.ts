import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { and, desc, eq, sum } from "drizzle-orm";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { walletTransactions } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [credits, debits, transactions] = await Promise.all([
      db.select({ total: sum(walletTransactions.amount) })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.userId, session.user.id),
          eq(walletTransactions.type, "credit")
        )),
      db.select({ total: sum(walletTransactions.amount) })
        .from(walletTransactions)
        .where(and(
          eq(walletTransactions.userId, session.user.id),
          eq(walletTransactions.type, "debit")
        )),
      db.select()
        .from(walletTransactions)
        .where(eq(walletTransactions.userId, session.user.id))
        .orderBy(desc(walletTransactions.createdAt))
        .limit(50),
    ]);

    const balance = Number(credits[0]?.total || 0) - Number(debits[0]?.total || 0);

    return NextResponse.json({
      balance,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        description: transaction.description,
        orderId: transaction.orderId,
        createdAt: transaction.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching wallet:", error);
    return NextResponse.json({ error: "Failed to fetch wallet" }, { status: 500 });
  }
}
