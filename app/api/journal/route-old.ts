import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalPosts, journalCategories } from "@/lib/db/schema";
import { eq, desc, inArray, and, ilike, or } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";

export async function GET(request: NextRequest) {
  try {
    // Basic rate limiting for public journal endpoint
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(null, ipAddress);
    const rate = checkRateLimit(identifier, 60, 60 * 1000); // 60 requests per minute
    if (!rate.allowed) {
      const err = getRateLimitError(rate.resetTime);
      return NextResponse.json({ error: err.error, retryAfter: err.retryAfter }, { status: err.status });
    }
    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get("category") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    let limit = parseInt(searchParams.get("limit") || "0", 10);

    if (search.length > 500) {
      return NextResponse.json(
        { error: "Search query too long (max 500 characters)" },
        { status: 400 }
      );
    }
    if (isNaN(limit) || limit < 0) limit = 0;
    if (limit > 100) limit = 100;

    // Build conditions
    const conditions = [eq(journalPosts.isPublished, true)];

    // Apply search filter if provided
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(journalPosts.title, searchTerm),
          ilike(journalPosts.titleFa, searchTerm),
          ilike(journalPosts.excerpt, searchTerm),
          ilike(journalPosts.excerptFa, searchTerm)
        )!
      );
    }

    // Apply category filter if provided
    if (category) {
      conditions.push(eq(journalPosts.categoryId, category));
    }

    // Get all published journal posts, ordered by creation date (newest first)
    let query = db
      .select()
      .from(journalPosts)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .orderBy(desc(journalPosts.createdAt));

    let allPosts;
    if (limit > 0) {
      allPosts = await query.limit(limit);
    } else {
      allPosts = await query;
    }

    // Fetch categories for posts that have categoryId
    const categoryIds = allPosts
      .map((post) => post.categoryId)
      .filter((id): id is string => id !== null);

    let categoriesMap: Record<string, { name: string | null; nameFa: string | null }> = {};
    if (categoryIds.length > 0) {
      const categories = await db
        .select()
        .from(journalCategories)
        .where(inArray(journalCategories.id, categoryIds));

      categoriesMap = categories.reduce((acc, cat) => {
        acc[cat.id] = { name: cat.name, nameFa: cat.nameFa };
        return acc;
      }, {} as Record<string, { name: string | null; nameFa: string | null }>);
    }

    // Map posts with category names
    const posts = allPosts.map((post) => ({
      id: post.id,
      title: post.title,
      titleFa: post.titleFa,
      excerpt: post.excerpt,
      excerptFa: post.excerptFa,
      image: post.image,
      categoryId: post.categoryId,
      categoryName: post.categoryId ? categoriesMap[post.categoryId]?.name || null : null,
      categoryNameFa: post.categoryId ? categoriesMap[post.categoryId]?.nameFa || null : null,
      authorName: post.authorName,
      readTime: post.readTime,
      slug: post.slug,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));

    return NextResponse.json({ posts }, { status: 200 });
  } catch (error) {
    console.error("Error fetching journal posts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch journal posts", details: errorMessage },
      { status: 500 }
    );
  }
}

