import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalPosts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { slugify, generateUniqueSlug } from "@/lib/utils/slugify";
export const dynamic = "force-dynamic";

// PUT - Update journal post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const postId = params.id;
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
      readTime,
      slug,
      isPublished,
      publishDate,
    } = body;

    // Check if post exists
    const existingPost = await db
      .select()
      .from(journalPosts)
      .where(eq(journalPosts.id, postId))
      .limit(1);

    if (existingPost.length === 0) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Handle slug update
    let finalSlug = existingPost[0].slug || "";
    if (slug !== undefined && slug !== existingPost[0].slug) {
      if (slug.trim()) {
        finalSlug = slugify(slug.trim());
        // Check if new slug already exists (excluding current post)
        const slugExists = await db
          .select()
          .from(journalPosts)
          .where(eq(journalPosts.slug, finalSlug))
          .limit(1);
        if (slugExists.length > 0 && slugExists[0].id !== postId) {
          finalSlug = await generateUniqueSlug(finalSlug, async (s) => {
            const existing = await db
              .select()
              .from(journalPosts)
              .where(eq(journalPosts.slug, s))
              .limit(1);
            return existing.length > 0 && existing[0].id !== postId;
          });
        }
      } else if (title) {
        // Generate slug from title if slug is empty
        finalSlug = await generateUniqueSlug(title, async (s) => {
          const existing = await db
            .select()
            .from(journalPosts)
            .where(eq(journalPosts.slug, s))
            .limit(1);
          return existing.length > 0 && existing[0].id !== postId;
        });
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title;
    if (titleFa !== undefined) updateData.titleFa = titleFa || null;
    if (excerpt !== undefined) updateData.excerpt = excerpt || null;
    if (excerptFa !== undefined) updateData.excerptFa = excerptFa || null;
    if (content !== undefined) updateData.content = content || null;
    if (contentFa !== undefined) updateData.contentFa = contentFa || null;
    if (image !== undefined) updateData.image = image || null;
    if (categoryId !== undefined) updateData.categoryId = categoryId || null;
    if (authorName !== undefined) updateData.authorName = authorName;
    if (readTime !== undefined) updateData.readTime = parseInt(readTime) || 1;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    if (publishDate !== undefined) {
      if (publishDate === null || publishDate === "") {
        updateData.publishDate = null;
      } else {
        try {
          const date = new Date(publishDate);
          if (!isNaN(date.getTime())) {
            updateData.publishDate = date;
          } else {
            console.error("Invalid publishDate value:", publishDate);
          }
        } catch (error) {
          console.error("Error parsing publishDate:", error, publishDate);
        }
      }
    }
    if (finalSlug) updateData.slug = finalSlug;
    if (body.ogImage !== undefined) updateData.ogImage = body.ogImage || null;
    if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl || null;

    const updatedPost = await db
      .update(journalPosts)
      .set(updateData)
      .where(eq(journalPosts.id, postId))
      .returning();

    // Serialize the response properly, especially dates
    const serializedPost = {
      ...updatedPost[0],
      publishDate: updatedPost[0].publishDate ? (updatedPost[0].publishDate instanceof Date ? updatedPost[0].publishDate.toISOString() : updatedPost[0].publishDate) : null,
    };

    return NextResponse.json({ post: serializedPost });
  } catch (error) {
    console.error("Error updating journal post:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update journal post", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete journal post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const postId = params.id;

    await db.delete(journalPosts).where(eq(journalPosts.id, postId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting journal post:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete journal post", details: errorMessage },
      { status: 500 }
    );
  }
}

