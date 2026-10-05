import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { inArray } from "drizzle-orm";
import { sanitizeProductId } from "@/lib/utils/sanitize";
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

    // Filter to only include available products (not out of stock or not available)
    const productStatuses = dbProducts.map((product) => ({
      id: product.id,
      quantity: product.quantity,
      badge: product.badge,
      available:
        product.quantity > 0 &&
        product.badge !== "Out of Stock" &&
        product.badge !== "Not Available",
    }));
    const validProductIds = productStatuses
      .filter((product) => product.available)
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
