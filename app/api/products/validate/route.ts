import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { sanitizeProductId } from "@/lib/utils/sanitize";
import { getActiveCartReservations } from "@/lib/services/cartInventory";
import { getActiveReservationsForProducts } from "@/lib/services/inventoryReservation";
export const dynamic = "force-dynamic";

// Validate multiple products by IDs
// Returns availability and stock for products used by the cart and visible product cards.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "Product IDs are required" },
        { status: 400 }
      );
    }

    // Parse and sanitize product IDs
    const productIds = idsParam
      .split(",")
      .map((id) => sanitizeProductId(id.trim()))
      .filter((id) => id !== "");

    if (productIds.length === 0) {
      return NextResponse.json({ validProductIds: [] });
    }

    // Fetch products and filter for valid ones (exist and available)
    const dbProducts = await db
      .select({
        id: products.id,
        badge: products.badge,
        quantity: products.quantity,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    const productIdsToCheck = dbProducts.map((product) => product.id);
    const [cartReservations, checkoutReservations] = await Promise.all([
      getActiveCartReservations(productIdsToCheck),
      getActiveReservationsForProducts(productIdsToCheck),
    ]);

    const productStatuses = dbProducts.map((product) => {
      const availableQuantity = Math.max(
        0,
        product.quantity -
          (cartReservations.get(product.id) || 0) -
          (checkoutReservations.get(product.id) || 0)
      );

      return {
        id: product.id,
        quantity: availableQuantity,
        badge: product.badge,
        available:
          availableQuantity > 0 &&
          product.badge !== "Out of Stock" &&
          product.badge !== "Not Available",
      };
    });
    // Keep a customer's own cart intact when its quantity consumes the final unit.
    // The API's availability status is used to disable new additions, while this
    // list is used by CartContext to remove only products that are intrinsically unavailable.
    const validProductIds = productStatuses
      .filter(
        (product) =>
          product.badge !== "Out of Stock" &&
          product.badge !== "Not Available"
      )
      .map((product) => product.id);

    return NextResponse.json({ validProductIds, productStatuses });
  } catch (error) {
    console.error("Error validating products:", error);
    return NextResponse.json(
      { error: "Failed to validate products" },
      { status: 500 }
    );
  }
}
