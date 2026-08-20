import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categories, socialLinks } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/auth";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { cache, cacheKeys, cacheTTL } from "@/lib/utils/cache";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Check cache first
    const cacheKey = cacheKeys.categories();
    const cached = cache.get(cacheKey);
    if (cached) {
      return successResponse({ categories: cached });
    }

    // Get all categories ordered by order field
    const allCategories = await db
      .select()
      .from(categories)
      .orderBy(categories.order);

    // Cache the result
    cache.set(cacheKey, allCategories, cacheTTL.medium);

    return successResponse({ categories: allCategories });
  } catch (error) {
    return handleApiError(error, "Failed to fetch categories", "خطا در دریافت دسته‌بندی‌ها");
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { name, nameFa, description, descriptionFa, icon, order, isActive } = body;

    if (!name) {
      return errorResponse("Category name is required", "نام دسته‌بندی الزامی است", 400);
    }

    // Get max order value to set default
    const maxOrderResult = await db
      .select({ maxOrder: categories.order })
      .from(categories)
      .orderBy(categories.order)
      .limit(1);

    const newOrder = order !== undefined ? order : (maxOrderResult[0]?.maxOrder ?? 0) + 1;

    const newCategory = await db
      .insert(categories)
      .values({
        name,
        nameFa: nameFa || null,
        description: description || null,
        descriptionFa: descriptionFa || null,
        icon: icon || null,
        order: newOrder,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    // Auto-create category exclusive social link
    await db.insert(socialLinks).values({
      nameEn: name,
      nameFa: nameFa || name,
      url: "https://example.com", // Placeholder URL - admin will update it
      icon: icon || null,
      categoryId: newCategory[0].id,
      order: newOrder,
    });

    // Invalidate categories cache
    cache.delete(cacheKeys.categories());

    return successResponse({ category: newCategory[0] });
  } catch (error) {

    return handleApiError(error, "Failed to create category", "خطا در ایجاد دسته‌بندی");
  }
}

