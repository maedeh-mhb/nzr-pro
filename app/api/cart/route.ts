import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, products, users } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { getOrCreateCartReminder, deleteCartReminder } from "@/lib/services/notifications";
export const dynamic = "force-dynamic";

// Get cart items
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      // Return empty cart for guests (could also use session-based cart)
      return NextResponse.json({ items: [] });
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get cart items with product details
    const dbItems = await db
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
        minOrderQuantity: products.minOrderQuantity,
        maxOrderQuantity: products.maxOrderQuantity,
        badge: products.badge, // Include badge to check availability
      })
      .from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, session.user.id));

    // Filter out invalid items (deleted products are already filtered by INNER JOIN)
    // Remove items where product is out of stock or not available
    const validItems = dbItems.filter((item) => {
      // Product exists (guaranteed by INNER JOIN)
      // Check if product is available
      if (item.badge === "Out of Stock" || item.badge === "Not Available") {
        return false; // Filter out unavailable products
      }
      return true;
    });

    // If any items were filtered out, clean up the cart
    if (validItems.length < dbItems.length) {
      const validItemIds = new Set(validItems.map((item) => item.id));
      const invalidItemIds = dbItems
        .filter((item) => !validItemIds.has(item.id))
        .map((item) => item.id);

      // Remove invalid items from database
      if (invalidItemIds.length > 0) {
        await db
          .delete(cartItems)
          .where(
            and(
              eq(cartItems.userId, session.user.id),
              inArray(cartItems.id, invalidItemIds)
            )
          );
      }
    }

    // Transform to match CartItem interface
    const items = validItems.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.name,
      nameFa: item.nameFa,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      slug: item.slug,
      category: item.category,
      minOrderQuantity: item.minOrderQuantity,
      maxOrderQuantity: item.maxOrderQuantity,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// Update cart (sync)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    // Validate items before saving (remove invalid products)
    let validItems = items || [];
    if (validItems.length > 0) {
      // Fetch product details to validate
      const productIds = validItems.map((item: any) => item.productId);
      const dbProducts = await db
        .select({
          id: products.id,
          badge: products.badge,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      // Create set of valid product IDs (exist and available)
      const validProductIds = new Set(
        dbProducts
          .filter(
            (product) =>
              product.badge !== "Out of Stock" &&
              product.badge !== "Not Available"
          )
          .map((product) => product.id)
      );

      // Filter items to only include valid products
      validItems = validItems.filter((item: any) =>
        validProductIds.has(item.productId)
      );
    }

    // Delete existing cart items
    await db
      .delete(cartItems)
      .where(eq(cartItems.userId, session.user.id));

    // Insert new cart items (only valid ones)
    if (validItems.length > 0) {
      await db.insert(cartItems).values(
        validItems.map((item: any) => ({
          userId: session.user.id,
          productId: item.productId,
          quantity: item.quantity,
        }))
      );

      // Create or update cart reminder notification
      await getOrCreateCartReminder(session.user.id, validItems.length);
    } else {
      // Cart is empty, delete cart reminder
      await deleteCartReminder(session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}

