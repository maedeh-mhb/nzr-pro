import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema/products";
import { journalPosts } from "@/lib/db/schema/journal";
import { eq } from "drizzle-orm";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir";

function getValidDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${BASE_URL}/products`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/how-to-use`,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/about`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/contact`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/instructions`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/privacy`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      changeFrequency: "yearly",
      priority: 0.5,
    },
  ];

  const productUrls: MetadataRoute.Sitemap = [];
  const journalUrls: MetadataRoute.Sitemap = [];

  try {
    const allProducts = await db
      .select({ slug: products.slug, updatedAt: products.updatedAt, createdAt: products.createdAt })
      .from(products);

    for (const product of allProducts) {
      if (!product?.slug) continue;

      productUrls.push({
        url: `${BASE_URL}/products/${product.slug}`,
        lastModified: getValidDate(product.updatedAt || product.createdAt),
        changeFrequency: "weekly",
        priority: 0.8,
      });
    }
  } catch (error) {
    console.error("Sitemap products error:", error);
  }

  try {
    const allPosts = await db
      .select({ slug: journalPosts.slug, updatedAt: journalPosts.updatedAt, createdAt: journalPosts.createdAt })
      .from(journalPosts)
      .where(eq(journalPosts.isPublished, true));

    for (const post of allPosts) {
      if (!post?.slug) continue;

        journalUrls.push({
          url: `${BASE_URL}/how-to-use/${post.slug}`,
        lastModified: getValidDate(post.updatedAt || post.createdAt),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  } catch (error) {
    console.error("Sitemap journal error:", error);
  }

  return [...staticPages, ...productUrls, ...journalUrls];
}
