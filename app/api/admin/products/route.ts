import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products, sellers } from "@/lib/db/schema";
import { ilike, or, eq, count, desc, sql } from "drizzle-orm";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { paginatedResponse, successResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { parsePaginationParams } from "@/lib/utils/pagination";
import { cache, cacheKeys, cacheTTL } from "@/lib/utils/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateUniqueSlug } from "@/lib/utils/slugify";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdminWithPermissions(request, "view_products");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const { page, limit, offset } = parsePaginationParams(searchParams);

    // Build query conditions
    let whereConditions: any[] = [];

    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(
        or(
          ilike(products.name, searchTerm),
          ilike(products.nameFa, searchTerm),
          ilike(products.category, searchTerm),
          ilike(products.shortDescription, searchTerm)
        )!
      );
    }

    // Only use cache if no search filter is applied
    const cacheKey = search ? null : cacheKeys.products(`${page}-${limit}`);
    if (cacheKey) {
      const cached = cache.get(cacheKey) as { data: any[]; total: number } | undefined;
      if (cached) {
        return paginatedResponse(cached.data, page, limit, cached.total);
      }
    }

    // Get total count
    let countQuery = db.select({ count: count() }).from(products);
    if (whereConditions.length > 0) {
      countQuery = countQuery.where(whereConditions[0]) as any;
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Get paginated products
    const positionOrder = sql`COALESCE(${products.position}, 2147483647)`;
    let query = db.select().from(products).orderBy(positionOrder, desc(products.createdAt));
    if (whereConditions.length > 0) {
      query = query.where(whereConditions[0]) as any;
    }

    const allProducts = await query.limit(limit).offset(offset);

    // Cache the result if no search filter
    if (cacheKey) {
      cache.set(cacheKey, { data: allProducts, total }, cacheTTL.short);
    }

    return paginatedResponse(allProducts, page, limit, total);
  } catch (error) {
    return handleApiError(error, "Failed to fetch products", "خطا در دریافت محصولات");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdminWithPermissions(request, ["create_products", "edit_products"], { requireAll: false });
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      name,
      nameFa,
      shortDescription,
      shortDescriptionFa,
      longDescription,
      longDescriptionFa,
      ingredients,
      ingredientsFa,
      tags,
      price,
      quantity,
      categoryId,
      categoryIds,
      category,
      slug,
      image,
      audioUrl,
      ogImage,
      badge,
      minOrderQuantity,
      maxOrderQuantity,
      weight,
      rewardPoints,
      seoTitle,
      seoDescription,
      seoKeywords,
      sellerId,
    } = body;
    const { volume, unit, images } = body;

    // Derive category and categoryId from categoryIds if provided
    const resolvedCategoryIds: string[] = Array.isArray(categoryIds) ? categoryIds : (categoryId ? [categoryId] : []);
    const resolvedCategoryId = resolvedCategoryIds[0] || categoryId || null;

    if (!name || !price || !category) {
      return NextResponse.json(
        { error: "Name, price, and category are required" },
        { status: 400 }
      );
    }

    const productType = body.productType || "economic";
    if (productType !== "economic" && productType !== "featured") {
      return NextResponse.json(
        { error: "Product type must be 'economic' or 'featured'" },
        { status: 400 }
      );
    }

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller is required" },
        { status: 400 }
      );
    }

    // Verify seller exists
    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.id, sellerId),
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Invalid seller" },
        { status: 400 }
      );
    }

    
    // Generate a Persian slug from the Persian product name when no slug is provided.
    let productSlug = slug?.trim();
    if (!productSlug) {
      productSlug = await generateUniqueSlug(nameFa || name, async (candidate) => {
        const existing = await db
          .select({ id: products.id })
          .from(products)
          .where(eq(products.slug, candidate))
          .limit(1);

        return existing.length > 0;
      });
    } else {
      // Normalize slug: remove leading/trailing slashes and spaces
      productSlug = productSlug.replace(/^\/+|\/+$/g, "").trim();
    }

    const newProduct = await db
      .insert(products)
      .values({
        name,
        nameFa: nameFa || null,
        shortDescription: shortDescription || null,
        shortDescriptionFa: shortDescriptionFa || null,
        longDescription: longDescription || null,
        longDescriptionFa: longDescriptionFa || null,
        ingredients: ingredients || null,
        ingredientsFa: ingredientsFa || null,
        tags: tags || null,
        price: String(price),
        quantity: quantity || 0,
        category,
        categoryId: resolvedCategoryId,
        categoryIds: resolvedCategoryIds.length > 0 ? JSON.stringify(resolvedCategoryIds) : null,
        slug: productSlug,
        image: image || null,
        audioUrl: audioUrl || null,
        ogImage: ogImage || null,
        badge: badge || "None",
        productType: productType as "economic" | "featured",
        minOrderQuantity: minOrderQuantity || 1,
        maxOrderQuantity: maxOrderQuantity || null,
        weight: weight ? String(weight) : null,
        volume: volume ? String(volume) : null,
        unit: unit || null,
        images: images || null,
        rewardPoints: rewardPoints && rewardPoints > 0 ? rewardPoints : null,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        seoKeywords: seoKeywords || null,
        sellerId: sellerId,
      })
      .returning();

    return NextResponse.json({ product: newProduct[0] });
  } catch (error) {
    console.error("Error creating product:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create product", details: errorMessage },
      { status: 500 }
    );
  }
}
