import { db } from "@/lib/db";
import { cartItems, inventoryReservations, products } from "@/lib/db/schema";
import { eq, and, gte, lt, sql, isNull, inArray } from "drizzle-orm";
import { getActiveCartSince } from "@/lib/services/cartInventory";

/**
 * Reserve inventory for a product during checkout
 * @param productId - Product ID
 * @param quantity - Quantity to reserve
 * @param userId - User ID (null for guests)
 * @param sessionId - Session ID (for guests)
 * @param reservationDurationMinutes - How long to reserve (default: 15 minutes)
 * @returns Reservation ID or null if insufficient inventory
 */
export async function reserveInventory(
  productId: string,
  quantity: number,
  userId: string | null = null,
  sessionId: string | null = null,
  reservationDurationMinutes: number = 15
): Promise<string | null> {
  if (!userId && !sessionId) {
    throw new Error("Either userId or sessionId must be provided");
  }

  return await db.transaction(async (tx) => {
    // Lock product row to prevent race conditions
    const lockedProducts = await tx.execute(
      sql`SELECT * FROM products WHERE id = ${productId} FOR UPDATE`
    );

    const product = lockedProducts[0] as any;

    if (!product) {
      return null; // Product doesn't exist
    }

    // Check if product is available
    if (product.badge === "Out of Stock" || product.badge === "Not Available") {
      return null;
    }

    // Get current available quantity (product quantity minus existing reservations)
    const availableQuantity = parseFloat(product.quantity?.toString() || "999999");

    // Count existing active reservations for this product
    const now = new Date().toISOString();
    const activeReservations = await tx
      .select({
        totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.productId, productId),
          isNull(inventoryReservations.orderId), // Not yet converted to order
          sql`${inventoryReservations.expiresAt} > ${now}` // Not expired
        )
      );

    const totalReserved = parseInt(activeReservations[0]?.totalReserved?.toString() || "0");
    const actuallyAvailable = availableQuantity - totalReserved;

    if (quantity > actuallyAvailable) {
      return null; // Insufficient inventory
    }

    // Create reservation
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + reservationDurationMinutes);

    const [reservation] = await tx
      .insert(inventoryReservations)
      .values({
        userId: userId || null,
        sessionId: sessionId || null,
        productId,
        quantity,
        expiresAt,
      })
      .returning();

    return reservation.id;
  });
}

/**
 * Release a reservation (when order is created or reservation expires)
 * @param reservationId - Reservation ID
 */
export async function releaseReservation(reservationId: string): Promise<void> {
  await db
    .delete(inventoryReservations)
    .where(eq(inventoryReservations.id, reservationId));
}

/**
 * Convert reservation to order (mark reservation as used)
 * @param reservationId - Reservation ID
 * @param orderId - Order ID
 */
export async function convertReservationToOrder(
  reservationId: string,
  orderId: string
): Promise<void> {
  await db
    .update(inventoryReservations)
    .set({
      orderId,
      updatedAt: new Date(),
    })
    .where(eq(inventoryReservations.id, reservationId));
}

/**
 * Release all reservations for a user/session (cleanup on order creation)
 * @param userId - User ID (null for guests)
 * @param sessionId - Session ID (for guests)
 */
export async function releaseUserReservations(
  userId: string | null = null,
  sessionId: string | null = null
): Promise<void> {
  const conditions: any[] = [isNull(inventoryReservations.orderId)]; // Not yet converted

  if (userId) {
    conditions.push(eq(inventoryReservations.userId, userId));
  } else if (sessionId) {
    conditions.push(eq(inventoryReservations.sessionId, sessionId));
  } else {
    return; // Nothing to release
  }

  await db
    .delete(inventoryReservations)
    .where(and(...conditions));
}

/**
 * Clean up expired reservations (should be called by cron)
 * @returns Number of reservations cleaned up
 */
export async function cleanupExpiredReservations(): Promise<number> {
  const now = new Date();

  const expiredReservations = await db
    .select({ id: inventoryReservations.id })
    .from(inventoryReservations)
    .where(
      and(
        isNull(inventoryReservations.orderId), // Not converted to order
        lt(inventoryReservations.expiresAt, now) // Expired
      )
    );

  const count = expiredReservations.length;

  if (count > 0) {
    await db
      .delete(inventoryReservations)
      .where(
        and(
          isNull(inventoryReservations.orderId),
          lt(inventoryReservations.expiresAt, now)
        )
      );
  }

  return count;
}

/**
 * Get active reservations for a product
 * @param productId - Product ID
 * @returns Total reserved quantity
 */
export async function getActiveReservationsForProduct(productId: string): Promise<number> {
  const now = new Date().toISOString();

  const result = await db
    .select({
      totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
    })
    .from(inventoryReservations)
    .where(
      and(
        eq(inventoryReservations.productId, productId),
        isNull(inventoryReservations.orderId),
        sql`${inventoryReservations.expiresAt} > ${now}`
      )
    );

  return parseInt(result[0]?.totalReserved?.toString() || "0");
}

export async function getActiveReservationsForProducts(productIds: string[]): Promise<Map<string, number>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const now = new Date().toISOString();
  const results = await db
    .select({
      productId: inventoryReservations.productId,
      totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
    })
    .from(inventoryReservations)
    .where(
      and(
        inArray(inventoryReservations.productId, productIds),
        isNull(inventoryReservations.orderId),
        sql`${inventoryReservations.expiresAt} > ${now}`
      )
    )
    .groupBy(inventoryReservations.productId);

  return new Map(
    results.map((result) => [
      result.productId,
      Number(result.totalReserved) || 0,
    ])
  );
}

export async function syncGuestCartReservations(
  sessionId: string,
  items: Array<{ productId: string; quantity: number }>,
  reservationDurationMinutes: number = 24 * 60
): Promise<void> {
  const normalizedItems = Array.from(
    items.reduce((quantities, item) => {
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
      return quantities;
    }, new Map<string, number>())
  ).map(([productId, quantity]) => ({ productId, quantity }));
  const productIds = normalizedItems.map((item) => item.productId).sort();

  await db.transaction(async (tx) => {
    for (const productId of productIds) {
      await tx.execute(sql`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`);
    }

    const previousReservations = await tx
      .select({
        productId: inventoryReservations.productId,
        quantity: inventoryReservations.quantity,
      })
      .from(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.sessionId, sessionId),
          isNull(inventoryReservations.orderId)
        )
      );
    const previousByProduct = new Map<string, number>();
    for (const reservation of previousReservations) {
      previousByProduct.set(
        reservation.productId,
        (previousByProduct.get(reservation.productId) || 0) + reservation.quantity
      );
    }

    await tx
      .delete(inventoryReservations)
      .where(
        and(
          eq(inventoryReservations.sessionId, sessionId),
          isNull(inventoryReservations.orderId)
        )
      );

    const expiresAt = new Date(Date.now() + reservationDurationMinutes * 60 * 1000);
    const now = new Date().toISOString();

    for (const item of normalizedItems) {
      // Decreasing or keeping a quantity is always allowed, even if the product is out of stock
      if (item.quantity <= (previousByProduct.get(item.productId) || 0)) continue;

      const product = await tx.query.products.findFirst({
        where: eq(products.id, item.productId),
      });
      if (!product || product.badge === "Out of Stock" || product.badge === "Not Available") {
        throw new Error("Product is unavailable");
      }

      const [activeCartReservations, activeCheckoutReservations] = await Promise.all([
        tx
          .select({
            quantity: sql<number>`COALESCE(SUM(${cartItems.quantity}), 0)`,
          })
          .from(cartItems)
          .where(
            and(
              eq(cartItems.productId, item.productId),
              gte(cartItems.updatedAt, getActiveCartSince())
            )
          ),
        tx
          .select({
            quantity: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
          })
          .from(inventoryReservations)
          .where(
            and(
              eq(inventoryReservations.productId, item.productId),
              isNull(inventoryReservations.orderId),
              sql`${inventoryReservations.expiresAt} > ${now}`
            )
          ),
      ]);

      const availableQuantity =
        product.quantity -
        (Number(activeCartReservations[0]?.quantity) || 0) -
        (Number(activeCheckoutReservations[0]?.quantity) || 0);
      if (item.quantity > availableQuantity) {
        throw new Error("Requested quantity is no longer available");
      }
    }

    if (normalizedItems.length > 0) {
      await tx.insert(inventoryReservations).values(
        normalizedItems.map((item) => ({
          sessionId,
          productId: item.productId,
          quantity: item.quantity,
          expiresAt,
        }))
      );
    }
  });
}
