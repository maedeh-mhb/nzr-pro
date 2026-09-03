import { db } from "@/lib/db";
import { journalCategories, journalPosts } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

export async function getArticleBySlug(slug: string) {
  const normalizedSlug = decodeURIComponent(slug).replace(/^\/+|\/+$/g, "").trim();

  const result = await db
    .select()
    .from(journalPosts)
    .where(and(eq(journalPosts.slug, normalizedSlug), eq(journalPosts.isPublished, true)))
    .limit(1);

  const post = result[0];
  if (!post) return null;

  let categoryName: string | null = null;
  let categoryNameFa: string | null = null;
  if (post.categoryId) {
    const category = await db
      .select({ name: journalCategories.name, nameFa: journalCategories.nameFa })
      .from(journalCategories)
      .where(eq(journalCategories.id, post.categoryId))
      .limit(1);
    categoryName = category[0]?.name ?? null;
    categoryNameFa = category[0]?.nameFa ?? null;
  }

  return {
    ...post,
    categoryName,
    categoryNameFa,
    pdfUrl: post.pdfUrl ?? null,
  };
}
