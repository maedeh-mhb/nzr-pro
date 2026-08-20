import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { wishlist, products, users } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch user's wishlist with product details
export async function GET() {
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

    // Fetch wishlist items with product details using join
    const wishlistItems = await db
      .select({
        id: wishlist.id,
        productId: wishlist.productId,
        createdAt: wishlist.createdAt,
        product: products,
      })
      .from(wishlist)
      .innerJoin(products, eq(wishlist.productId, products.id))
      .where(eq(wishlist.userId, userId))
      .orderBy(desc(wishlist.createdAt));

    // Format the response
    const items = wishlistItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      createdAt: item.createdAt,
      product: item.product,
    }));

    return NextResponse.json({ items }, { status: 200 });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch wishlist", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Add product to wishlist
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Check if product exists
    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if already in wishlist
    const existingItem = await db.query.wishlist.findFirst({
      where: and(
        eq(wishlist.userId, userId),
        eq(wishlist.productId, productId)
      ),
    });

    if (existingItem) {
      return NextResponse.json(
        { error: "Product already in wishlist", item: existingItem },
        { status: 400 }
      );
    }

    // Add to wishlist
    const [newItem] = await db
      .insert(wishlist)
      .values({
        userId,
        productId,
      })
      .returning();

    return NextResponse.json(
      {
        item: newItem,
        message: "Product added to wishlist",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to add to wishlist", details: errorMessage },
      { status: 500 }
    );
  }
}

