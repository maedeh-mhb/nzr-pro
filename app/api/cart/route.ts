import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, inventoryReservations, products, users } from "@/lib/db/schema";
import { eq, and, gte, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { getOrCreateCartReminder, deleteCartReminder } from "@/lib/services/notifications";
import { getActiveCartSince } from "@/lib/services/cartInventory";
export const dynamic = "force-dynamic";

class CartInventoryError extends Error {}

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
        stockQuantity: products.quantity,
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
      if (item.stockQuantity <= 0 || item.badge === "Out of Stock" || item.badge === "Not Available") {
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

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const normalizedItems = items.map((item: unknown) => {
      const candidate = item as { productId?: unknown; quantity?: unknown };
      const productId = typeof candidate.productId === "string" ? candidate.productId : "";
      const quantity = Number(candidate.quantity);

      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw new CartInventoryError("Invalid cart item");
      }

      return { productId, quantity };
    });

    await db.transaction(async (tx) => {
      const existingItems = await tx
        .select({ productId: cartItems.productId, quantity: cartItems.quantity })
        .from(cartItems)
        .where(eq(cartItems.userId, session.user.id));
      const existingByProduct = new Map(
        existingItems.map((existing) => [existing.productId, existing.quantity])
      );

      for (const item of normalizedItems) {
        // Decreasing or keeping a quantity is always allowed, even if the product is out of stock
        if (item.quantity <= (existingByProduct.get(item.productId) || 0)) continue;

        const lockedProducts = await tx.execute(
          sql`SELECT id, quantity, badge FROM products WHERE id = ${item.productId} FOR UPDATE`
        );
        const product = lockedProducts[0] as
          | { id: string; quantity: number; badge: string | null }
          | undefined;

        if (!product || product.badge === "Out of Stock" || product.badge === "Not Available") {
          throw new CartInventoryError("Product is unavailable");
        }

        const activeCartReservations = await tx
          .select({
            quantity: sql<number>`COALESCE(SUM(${cartItems.quantity}), 0)`,
          })
          .from(cartItems)
          .where(
            and(
              eq(cartItems.productId, item.productId),
              ne(cartItems.userId, session.user.id),
              gte(cartItems.updatedAt, getActiveCartSince())
            )
          );
        const checkoutReservations = await tx
          .select({
            quantity: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
          })
          .from(inventoryReservations)
          .where(
            and(
              eq(inventoryReservations.productId, item.productId),
              or(
                isNull(inventoryReservations.userId),
                ne(inventoryReservations.userId, session.user.id)
              ),
              isNull(inventoryReservations.orderId),
              sql`${inventoryReservations.expiresAt} > ${new Date().toISOString()}`
            )
          );
        const availableQuantity =
          product.quantity -
          (Number(activeCartReservations[0]?.quantity) || 0) -
          (Number(checkoutReservations[0]?.quantity) || 0);

        if (item.quantity > availableQuantity) {
          throw new CartInventoryError("Requested quantity is no longer available");
        }
      }

      await tx.delete(cartItems).where(eq(cartItems.userId, session.user.id));

      if (normalizedItems.length > 0) {
        await tx.insert(cartItems).values(
          normalizedItems.map((item) => ({
            userId: session.user.id,
            productId: item.productId,
            quantity: item.quantity,
          }))
        );
      }
    });

    if (normalizedItems.length > 0) {
      await getOrCreateCartReminder(session.user.id, normalizedItems.length);
    } else {
      await deleteCartReminder(session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating cart:", error);
    if (error instanceof CartInventoryError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}
