import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, ilike, or, and, isNull, count as drizzleCount, sql, desc } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
import { paginatedResponse } from "@/lib/utils/apiResponse";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Basic rate limiting for public products endpoint
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(null, ipAddress);
    const rate = checkRateLimit(identifier, 60, 60 * 1000); // 60 requests per minute
    if (!rate.allowed) {
      const err = getRateLimitError(rate.resetTime);
      return NextResponse.json({ error: err.error, retryAfter: err.retryAfter }, { status: err.status });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = (searchParams.get("search") || "").trim();
    const category = searchParams.get("category") || "";
    const badge = searchParams.get("badge") || "";
    const productType = searchParams.get("productType") || "";
    let limit = parseInt(searchParams.get("limit") || "50", 10);
    let page = parseInt(searchParams.get("page") || "1", 10);

    // Validate search length and limit
    if (search.length > 500) {
      return NextResponse.json(
        { error: "Search query too long (max 500 characters)" },
        { status: 400 }
      );
    }
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;
    if (isNaN(page) || page < 1) page = 1;

    const conditions = [];

    // Apply search filter if provided (include all fields)
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      // Use sql template to cast enum to text for ilike
      conditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.nameFa, searchTerm),
          ilike(products.shortDescription, searchTerm),
          ilike(products.shortDescriptionFa, searchTerm),
          ilike(products.longDescription, searchTerm),
          ilike(products.longDescriptionFa, searchTerm),
          ilike(products.ingredients, searchTerm),
          ilike(products.ingredientsFa, searchTerm),
          ilike(products.tags, searchTerm),
          ilike(products.category, searchTerm),
          ilike(products.slug, searchTerm),
          ilike(products.badge, searchTerm),
          ilike(products.seoTitle, searchTerm),
          ilike(products.seoDescription, searchTerm),
          ilike(products.seoKeywords, searchTerm)
        )!
      );
    }

    // Apply category filter if provided — check both single categoryId and multi-category JSON array
    if (category && category.trim()) {
      const cat = category.trim();
      conditions.push(
        or(
          eq(products.categoryId, cat),
          sql`${products.categoryIds}::text like ${"%\"" + cat + "\"%"}`
        )!
      );
    }

    // Apply badge filter if provided
    if (badge.trim()) {
      if (badge === "None") {
        // Filter for products with no badge (null)
        conditions.push(isNull(products.badge));
      } else {
        // Filter for specific badge value
        conditions.push(eq(products.badge, badge));
      }
    }

    // Apply productType filter if provided
    if (productType.trim()) {
      const allowedTypes = ["economic", "featured"] as const;
      if (!allowedTypes.includes(productType as any)) {
        return NextResponse.json(
          { error: "Invalid productType. Allowed: economic, featured" },
          { status: 400 }
        );
      }
      conditions.push(eq(products.productType, productType as "economic" | "featured"));
    }

    // Build query with conditions
    const whereClause = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    const positionOrder = sql`COALESCE(${products.position}, 2147483647)`;
    const queryBuilder = db.select().from(products);
    const query = whereClause
      ? queryBuilder.where(whereClause).orderBy(positionOrder, desc(products.createdAt))
      : queryBuilder.orderBy(positionOrder, desc(products.createdAt));

    // Get total count for pagination
    const totalQueryBuilder = db.select({ count: drizzleCount() }).from(products);
    const totalQuery = whereClause
      ? totalQueryBuilder.where(whereClause)
      : totalQueryBuilder;

    const totalResult = await totalQuery;
    const total = totalResult[0]?.count || 0;

    // Calculate offset and fetch paginated products
    const offset = (page - 1) * limit;
    // Fetch products with all fields, including minOrderQuantity and maxOrderQuantity
    const allProductsRaw = await query.offset(offset).limit(limit);
    // Map to include only necessary fields for frontend
    const allProducts = allProductsRaw.map((product: any) => {
      // Parse images if it's a JSON string
      let imagesArray: string[] = [];
      if (product.images && typeof product.images === 'string') {
        try {
          imagesArray = JSON.parse(product.images);
        } catch (error) {
          console.error('Failed to parse images JSON:', error);
          imagesArray = [];
        }
      } else if (Array.isArray(product.images)) {
        imagesArray = product.images;
      }
      
      return {
        id: product.id,
        name: product.name,
        nameFa: product.nameFa,
        shortDescription: product.shortDescription,
        shortDescriptionFa: product.shortDescriptionFa,
        price: product.price,
        image: product.image,
        images: imagesArray,
        quantity: product.quantity ?? 0,
        badge: product.badge,
        productType: product.productType,
        slug: product.slug,
        category: product.category,
        minOrderQuantity: product.minOrderQuantity ?? null,
        maxOrderQuantity: product.maxOrderQuantity ?? null,
        weight: product.weight ?? null,
        volume: product.volume ?? null,
        unit: product.unit ?? null,
      };
    });

    return paginatedResponse(allProducts, page, limit, total);
  } catch (error) {
    console.error("Error fetching products:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch products", details: errorMessage },
      { status: 500 }
    );
  }
}

