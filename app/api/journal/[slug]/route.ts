import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { journalPosts, journalCategories } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 15+ uses Promise)
    const resolvedParams = params instanceof Promise ? await params : params;
    const slug = resolvedParams.slug;

    if (!slug) {
      return NextResponse.json({ error: "Slug is required" }, { status: 400 });
    }

    // Normalize slug (remove leading/trailing slashes)
    const normalizedSlug = slug.replace(/^\/|\/$/g, "");

    // Get the journal post by slug
    const postResult = await db
      .select()
      .from(journalPosts)
      .where(and(eq(journalPosts.slug, normalizedSlug), eq(journalPosts.isPublished, true)))
      .limit(1);

    if (postResult.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    const post = postResult[0];

    // Fetch category if categoryId exists
    let categoryName: string | null = null;
    let categoryNameFa: string | null = null;
    if (post.categoryId) {
      const categoryResult = await db
        .select()
        .from(journalCategories)
        .where(eq(journalCategories.id, post.categoryId))
        .limit(1);
      if (categoryResult.length > 0) {
        categoryName = categoryResult[0].name;
        categoryNameFa = categoryResult[0].nameFa;
      }
    }

    return NextResponse.json({
      post: {
        id: post.id,
        title: post.title,
        titleFa: post.titleFa,
        excerpt: post.excerpt,
        excerptFa: post.excerptFa,
        content: post.content,
        contentFa: post.contentFa,
        image: post.image,
        categoryId: post.categoryId,
        categoryName,
        categoryNameFa,
        authorName: post.authorName,
        readTime: post.readTime,
        slug: post.slug,
        pdfUrl: post.pdfUrl ?? null,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error fetching journal post:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? error.stack : String(error);
    console.error("Error details:", errorDetails);
    return NextResponse.json(
      { error: "Failed to fetch journal post", details: errorMessage },
      { status: 500 }
    );
  }
}

