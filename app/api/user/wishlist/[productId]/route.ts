import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlist, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// DELETE - Remove product from wishlist
export async function DELETE(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.productId;

    // Check if item exists in wishlist
    const existingItem = await db.query.wishlist.findFirst({
      where: and(
        eq(wishlist.userId, userId),
        eq(wishlist.productId, productId)
      ),
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found in wishlist" }, { status: 404 });
    }

    // Remove from wishlist
    await db
      .delete(wishlist)
      .where(
        and(
          eq(wishlist.userId, userId),
          eq(wishlist.productId, productId)
        )
      );

    return NextResponse.json({ message: "Product removed from wishlist" }, { status: 200 });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to remove from wishlist", details: errorMessage },
      { status: 500 }
    );
  }
}

// GET - Check if product is in wishlist
export async function GET(
  request: NextRequest,
  { params }: { params: { productId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ isInWishlist: false });
    }

    const userId = session.user.id;
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const productId = params.productId;

    const existingItem = await db.query.wishlist.findFirst({
      where: and(
        eq(wishlist.userId, userId),
        eq(wishlist.productId, productId)
      ),
    });

    return NextResponse.json({ isInWishlist: !!existingItem }, { status: 200 });
  } catch (error) {
    console.error("Error checking wishlist:", error);
    return NextResponse.json({ isInWishlist: false }, { status: 200 });
  }
}

