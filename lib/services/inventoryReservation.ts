import { db } from "@/lib/db";
import { inventoryReservations, products } from "@/lib/db/schema";
import { eq, and, lt, sql, or, isNull } from "drizzle-orm";

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

