import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { cartItems, products, inventoryReservations } from "@/lib/db/schema";
import { eq, and, inArray, sql, isNull } from "drizzle-orm";
import { validateOrigin, getOriginValidationError } from "@/lib/utils/validateOrigin";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
import { validateCsrfToken } from "@/lib/utils/csrf";
import { sanitizeProductId, sanitizeCartItemId } from "@/lib/utils/sanitize";
import { reserveInventory, releaseUserReservations, getActiveReservationsForProduct } from "@/lib/services/inventoryReservation";
import { API_ERRORS } from "@/lib/utils/apiErrors";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate request origin
    if (!validateOrigin(request)) {
      const error = getOriginValidationError();
      return NextResponse.json({ error: error.error }, { status: error.status });
    }

    // 2. Rate limiting
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(userId, ipAddress);

    const rateLimit = checkRateLimit(identifier, 20, 60 * 60 * 1000); // 20 requests per hour
    if (!rateLimit.allowed) {
      const error = getRateLimitError(rateLimit.resetTime);
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        {
          status: error.status,
          headers: {
            "Retry-After": error.retryAfter.toString(),
          },
        }
      );
    }

    // 3. CSRF protection
    const body = await request.json();
    const { cartItemIds, guestItems, csrfToken } = body;

    const csrfValid = await validateCsrfToken(request, csrfToken);
    if (!csrfValid) {
      const error = API_ERRORS.INVALID_CSRF;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 403 }
      );
    }

    // 4. Input sanitization
    if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      console.error("[Checkout Validate] No cart item IDs provided", {
        cartItemIds,
        userId,
        hasGuestItems: !!guestItems,
      });
      const error = API_ERRORS.NO_ITEMS_SELECTED;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    // Sanitize cart item IDs - accept both CUID2 and guest format IDs
    // Don't filter empty strings, as we'll use the original IDs as fallback
    const sanitizedCartItemIds = cartItemIds.map((id: any) => {
      // Try to sanitize
      const sanitized = sanitizeCartItemId(id);
      // If sanitization fails, still use the original ID (it might be valid but our regex doesn't match)
      return sanitized || String(id).substring(0, 100);
    });

    if (sanitizedCartItemIds.length === 0) {
      const error = API_ERRORS.NO_ITEMS_SELECTED;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    // Fetch cart items from database (for logged-in users) or validate guest items
    let itemsToValidate: any[] = [];

    if (userId) {
      // Fetch cart items from DB
      const dbCartItems = await db
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
        .where(
          and(
            eq(cartItems.userId, userId),
            inArray(cartItems.id, sanitizedCartItemIds)
          )
        );

      itemsToValidate = dbCartItems.map((item) => ({
        id: item.id,
        productId: item.productId,
        name: item.name,
        nameFa: item.nameFa,
        price: item.price,
        image: item.image,
        quantity: item.quantity,
        slug: item.slug,
        category: item.category,
      }));
    } else {
      // For guests, use provided guestItems (from localStorage)
      if (!guestItems || !Array.isArray(guestItems)) {
        const error = API_ERRORS.GUEST_ITEMS_REQUIRED;
        return NextResponse.json(
          { error: error.error, errorFa: error.errorFa },
          { status: 400 }
        );
      }

      // Filter to only selected items and sanitize
      // For guest items, we need to match IDs from the cart
      itemsToValidate = guestItems
        .filter((item: any) => {
          if (!item || !item.id) {
            return false;
          }
          // Check if this item's ID is in the selected cart item IDs
          // Use direct comparison since both should be in the same format
          const isIncluded = sanitizedCartItemIds.includes(String(item.id));
          return isIncluded;
        })
        .map((item: any) => ({
          ...item,
          id: String(item.id),
          productId: sanitizeProductId(item.productId) || String(item.productId),
        }));

    }

    if (itemsToValidate.length === 0) {
      console.error("[Checkout Validate] No valid items found after filtering", {
        userId,
        sanitizedCartItemIds,
        guestItemsProvided: !!guestItems,
      });
      const error = API_ERRORS.NO_VALID_ITEMS_FOUND;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    // Validate each item with row-level locking to prevent race conditions
    // This ensures inventory is checked atomically, preventing issues where inventory
    // changes between validation and order placement
    const validationResult = await db.transaction(async (tx) => {
      const validatedItems: any[] = [];
      const removedItems: string[] = [];
      const updatedItems: any[] = [];
      let hasChanges = false;

      for (const item of itemsToValidate) {
        // CRITICAL: Use SELECT FOR UPDATE to lock the product row
        // This prevents other transactions from modifying the product until this transaction completes
        // This ensures accurate inventory checking and prevents race conditions
        const lockedProducts = await tx.execute(
          sql`SELECT * FROM products WHERE id = ${item.productId} FOR UPDATE`
        );

        const product = lockedProducts[0] as any;

        if (!product) {
          // Product deleted
          removedItems.push(item.id);
          hasChanges = true;
          continue;
        }

        // Check if product is available (badge check) with locked row
        if (product.badge === "Out of Stock" || product.badge === "Not Available") {
          removedItems.push(item.id);
          hasChanges = true;
          continue;
        }

        // Check price changes with locked row
        const currentPrice = parseFloat(String(product.price));
        const cartPrice = parseFloat(String(item.price));

        if (Math.abs(currentPrice - cartPrice) > 0.01) {
          // Price changed
          updatedItems.push({
            id: item.id,
            oldPrice: item.price,
            newPrice: product.price,
          });
          hasChanges = true;
        }

        // Check quantity against available stock (accounting for existing reservations)
        const requestedQuantity = item.quantity;
        const totalQuantity = parseFloat(product.quantity?.toString() || "999999"); // Assume unlimited if not set

        // Get active reservations for this product (using transaction context)
        const now = new Date().toISOString();
        const activeReservationsResult = await tx
          .select({
            totalReserved: sql<number>`COALESCE(SUM(${inventoryReservations.quantity}), 0)`,
          })
          .from(inventoryReservations)
          .where(
            and(
              eq(inventoryReservations.productId, product.id),
              isNull(inventoryReservations.orderId),
              sql`${inventoryReservations.expiresAt} > ${now}`
            )
          );
        const activeReservations = parseInt(activeReservationsResult[0]?.totalReserved?.toString() || "0");
        const availableQuantity = totalQuantity - activeReservations;

        if (requestedQuantity > availableQuantity) {
          // Quantity exceeds available stock
          updatedItems.push({
            id: item.id,
            oldQuantity: item.quantity,
            newQuantity: Math.max(0, availableQuantity),
          });
          hasChanges = true;
        }

        // Add validated item with current data
        validatedItems.push({
          id: item.id,
          productId: product.id,
          name: product.name,
          nameFa: product.nameFa,
          price: product.price,
          image: product.image,
          quantity: Math.min(requestedQuantity, availableQuantity),
          slug: product.slug,
          category: product.category,
        });
      }

      return {
        validatedItems,
        removedItems,
        updatedItems,
        hasChanges,
      };
    });

    const { validatedItems, removedItems, updatedItems, hasChanges } = validationResult;

    // If there are changes, return updated cart
    if (hasChanges) {
      return NextResponse.json({
        valid: false,
        changes: {
          removedItems,
          updatedItems,
        },
        updatedCart: validatedItems,
      });
    }

    // All items valid - now reserve inventory
    // First, release any existing reservations for this user/session
    const sessionId = request.headers.get("x-session-id") || null;
    await releaseUserReservations(userId, sessionId);

    // Reserve inventory for each validated item
    const reservationIds: string[] = [];
    for (const item of validatedItems) {
      try {
        const reservationId = await reserveInventory(
          item.productId,
          item.quantity,
          userId,
          sessionId,
          15 // 15 minutes reservation
        );
        if (reservationId) {
          reservationIds.push(reservationId);
        } else {
          // Reservation failed - inventory became unavailable
          const error = API_ERRORS.INVENTORY_UNAVAILABLE;
          return NextResponse.json({
            valid: false,
            error: error.error,
            errorFa: error.errorFa,
            updatedCart: validatedItems.filter((i) => i.productId !== item.productId),
          });
        }
      } catch (error) {
        console.error("Error reserving inventory:", error);
        // Release any reservations we created
        for (const rid of reservationIds) {
          await releaseUserReservations(userId, sessionId);
        }
        const reserveError = API_ERRORS.FAILED_TO_RESERVE;
        return NextResponse.json({
          valid: false,
          error: reserveError.error,
          errorFa: reserveError.errorFa,
        });
      }
    }

    // All items valid and reserved
    return NextResponse.json({
      valid: true,
      items: validatedItems,
      reservationIds, // Return reservation IDs for order creation
    });
  } catch (error) {
    console.error("Error validating checkout:", error);
    const validateError = API_ERRORS.FAILED_TO_VALIDATE;
    return NextResponse.json(
      { error: validateError.error, errorFa: validateError.errorFa },
      { status: 500 }
    );
  }
}

