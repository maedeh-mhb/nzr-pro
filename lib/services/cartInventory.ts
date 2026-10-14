import { db } from "@/lib/db";
import { cartItems } from "@/lib/db/schema";
import { and, gte, inArray, ne, sql } from "drizzle-orm";

export const ACTIVE_CART_DURATION_MS = 24 * 60 * 60 * 1000;

export function getActiveCartSince(): Date {
  return new Date(Date.now() - ACTIVE_CART_DURATION_MS);
}

export async function getActiveCartReservations(
  productIds: string[],
  excludeUserId?: string | null
): Promise<Map<string, number>> {
  if (productIds.length === 0) {
    return new Map();
  }

  const conditions = [
    inArray(cartItems.productId, productIds),
    gte(cartItems.updatedAt, getActiveCartSince()),
  ];

  if (excludeUserId) {
    conditions.push(ne(cartItems.userId, excludeUserId));
  }

  const reservations = await db
    .select({
      productId: cartItems.productId,
      quantity: sql<number>`COALESCE(SUM(${cartItems.quantity}), 0)`,
    })
    .from(cartItems)
    .where(and(...conditions))
    .groupBy(cartItems.productId);

  return new Map(
    reservations.map((reservation) => [
      reservation.productId,
      Number(reservation.quantity) || 0,
    ])
  );
}
