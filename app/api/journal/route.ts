import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalPosts, journalCategories } from "@/lib/db/schema";
import { eq, desc, inArray, and, ilike, or } from "drizzle-orm";
import {
  checkRateLimit,
  getRateLimitIdentifier,
  extractIpAddress,
  getRateLimitError,
} from "@/lib/utils/rateLimiter";
export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function GET(request: NextRequest) {
  try {
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(null, ipAddress);
    const rate = checkRateLimit(identifier, 60, 60 * 1000);
    if (!rate.allowed) {
      const err = getRateLimitError(rate.resetTime);
      return NextResponse.json(
        { error: err.error, retryAfter: err.retryAfter },
        { status: err.status }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const category = (searchParams.get("category") || "").trim();
    const search = (searchParams.get("search") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limitParam = parseInt(searchParams.get("limit") || "12", 10);
    const limit = isNaN(limitParam) || limitParam < 1 ? PAGE_SIZE : Math.min(limitParam, 100);
    const offset = (page - 1) * limit;

    if (search.length > 500) {
      return NextResponse.json(
        { error: "Search query too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const conditions = [eq(journalPosts.isPublished, true)];

    if (search) {
      const searchTerm = `%${search}%`;
      conditions.push(
        or(
          ilike(journalPosts.title, searchTerm),
          ilike(journalPosts.titleFa, searchTerm),
          ilike(journalPosts.excerpt, searchTerm),
          ilike(journalPosts.excerptFa, searchTerm)
        )!
      );
    }

    if (category) {
      conditions.push(eq(journalPosts.categoryId, category));
    }

    const whereClause =
      conditions.length === 1 ? conditions[0] : and(...conditions);

    // Fetch limit+1 to detect hasMore without an extra COUNT query
    const rawPosts = await db
      .select()
      .from(journalPosts)
      .where(whereClause)
      .orderBy(desc(journalPosts.createdAt))
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rawPosts.length > limit;
    const pagePosts = rawPosts.slice(0, limit);

    const categoryIds = pagePosts
      .map((post) => post.categoryId)
      .filter((id): id is string => id !== null);

    let categoriesMap: Record<string, { name: string; nameFa: string | null }> = {};
    if (categoryIds.length > 0) {
      const cats = await db
        .select()
        .from(journalCategories)
        .where(inArray(journalCategories.id, categoryIds));
      categoriesMap = cats.reduce(
        (acc, cat) => {
          acc[cat.id] = { name: cat.name, nameFa: cat.nameFa };
          return acc;
        },
        {} as Record<string, { name: string; nameFa: string | null }>
      );
    }

    const posts = pagePosts.map((post) => ({
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

    return NextResponse.json({ posts, page, limit, hasMore }, { status: 200 });
  } catch (error) {
    console.error("Error fetching journal posts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch journal posts", details: errorMessage },
      { status: 500 }
    );
  }
}
