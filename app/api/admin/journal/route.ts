import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalPosts, journalCategories } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { slugify, generateUniqueSlug } from "@/lib/utils/slugify";
export const dynamic = "force-dynamic";

// GET - Fetch all journal posts (for admin)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allPosts = await db
      .select()
      .from(journalPosts)
      .orderBy(journalPosts.createdAt);

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
      content: post.content,
      contentFa: post.contentFa,
      image: post.image,
      categoryId: post.categoryId,
      categoryName: post.categoryId ? categoriesMap[post.categoryId]?.name || null : null,
      categoryNameFa: post.categoryId ? categoriesMap[post.categoryId]?.nameFa || null : null,
      authorName: post.authorName,
      authorNameFa: post.authorNameFa,
      readTime: post.readTime,
      slug: post.slug,
      publishDate: post.publishDate ? (post.publishDate instanceof Date ? post.publishDate.toISOString() : post.publishDate) : null,
      isPublished: post.isPublished,
      seoTitle: post.seoTitle,
      seoTitleFa: post.seoTitleFa,
      seoDescription: post.seoDescription,
      seoDescriptionFa: post.seoDescriptionFa,
      seoKeywords: post.seoKeywords,
      seoKeywordsFa: post.seoKeywordsFa,
      ogImage: post.ogImage,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
    }));

    return NextResponse.json({ posts });
  } catch (error) {
    console.error("Error fetching journal posts:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch journal posts", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create new journal post
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      titleFa,
      excerpt,
      excerptFa,
      content,
      contentFa,
      image,
      categoryId,
      authorName,
      authorNameFa,
      readTime,
      slug,
      publishDate,
      isPublished,
      seoTitle,
      seoTitleFa,
      seoDescription,
      seoDescriptionFa,
      seoKeywords,
      seoKeywordsFa,
      ogImage,
      pdfUrl,
    } = body;

    if (!title || !authorName || !readTime) {
      return NextResponse.json(
        { error: "Missing required fields: title, authorName, readTime" },
        { status: 400 }
      );
    }

    // Generate slug if not provided
    let finalSlug = slug?.trim() || "";
    if (!finalSlug) {
      finalSlug = await generateUniqueSlug(title, async (s) => {
        const existing = await db
          .select()
          .from(journalPosts)
          .where(eq(journalPosts.slug, s))
          .limit(1);
        return existing.length > 0;
      });
    } else {
      // Normalize provided slug
      finalSlug = slugify(finalSlug);
      // Check if slug already exists
      const existing = await db
        .select()
        .from(journalPosts)
        .where(eq(journalPosts.slug, finalSlug))
        .limit(1);
      if (existing.length > 0) {
        finalSlug = await generateUniqueSlug(finalSlug, async (s) => {
          const existing = await db
            .select()
            .from(journalPosts)
            .where(eq(journalPosts.slug, s))
            .limit(1);
          return existing.length > 0;
        });
      }
    }

    const newPost = await db
      .insert(journalPosts)
      .values({
        title,
        titleFa: titleFa || null,
        excerpt: excerpt || null,
        excerptFa: excerptFa || null,
        content: content || null,
        contentFa: contentFa || null,
        image: image || null,
        categoryId: categoryId || null,
        authorName,
        authorNameFa: authorNameFa || null,
        readTime: parseInt(readTime) || 1,
        slug: finalSlug,
        publishDate: publishDate ? new Date(publishDate) : null,
        isPublished: isPublished || false,
        seoTitle: seoTitle || null,
        seoTitleFa: seoTitleFa || null,
        seoDescription: seoDescription || null,
        seoDescriptionFa: seoDescriptionFa || null,
        seoKeywords: seoKeywords || null,
        seoKeywordsFa: seoKeywordsFa || null,
        ogImage: ogImage || null,
        pdfUrl: pdfUrl || null,
      })
      .returning();

    return NextResponse.json({ post: newPost[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating journal post:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create journal post", details: errorMessage },
      { status: 500 }
    );
  }
}

