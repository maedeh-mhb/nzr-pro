import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cartItemIds } = body;

    if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return NextResponse.json(
        { error: "No items specified for removal" },
        { status: 400 }
      );
    }

    // Remove only the specified cart items
    await db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.userId, userId),
          inArray(cartItems.id, cartItemIds)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing cart items:", error);
    return NextResponse.json(
      { error: "Failed to remove cart items" },
      { status: 500 }
    );
  }
}

