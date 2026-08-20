import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, products, users } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
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
    const { items } = body;

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Get existing cart items from DB
    const existingCartItems = await db
      .select()
      .from(cartItems)
      .where(eq(cartItems.userId, userId));

    // Create a map of existing items by productId
    const existingMap = new Map(
      existingCartItems.map((item) => [item.productId, item])
    );

    // Process guest cart items
    for (const guestItem of items) {
      const productId = guestItem.productId;

      // Verify product exists and get current price/stock
      const product = await db.query.products.findFirst({
        where: eq(products.id, productId),
      });

      if (!product) {
        // Product doesn't exist, skip it
        continue;
      }

      const existingItem = existingMap.get(productId);
      const guestQuantity = guestItem.quantity || 1;

      if (existingItem) {
        // Merge: sum quantities
        const newQuantity = existingItem.quantity + guestQuantity;

        // Update existing cart item
        await db
          .update(cartItems)
          .set({
            quantity: newQuantity,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(cartItems.userId, userId),
              eq(cartItems.productId, productId)
            )
          );
      } else {
        // Add new item to cart
        const finalQuantity = guestQuantity;

        await db.insert(cartItems).values({
          userId,
          productId,
          quantity: finalQuantity,
        });
      }
    }

    // Fetch updated cart with product details
    const updatedCartItems = await db
      .select({
        id: cartItems.id,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        name: products.name,
        nameFa: products.nameFa,
        price: products.price,
        image: products.image,
        slug: products.slug,
        category: products.category,
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));

    return NextResponse.json({
      success: true,
      items: updatedCartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        nameFa: item.nameFa,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        slug: item.slug,
        category: item.category,
      })),
    });
  } catch (error) {
    console.error("Error merging cart:", error);
    return NextResponse.json(
      { error: "Failed to merge cart" },
      { status: 500 }
    );
  }
}

