import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema/products";
import { journalPosts } from "@/lib/db/schema/journal";
import { and, eq, isNull, lte, or } from "drizzle-orm";
import { logger } from "@/lib/utils/logger";
import { notifySitemapFailure } from "@/lib/seo/sitemapAlert";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir";

const LOCALES = ["fa", "en"] as const;

function localizedUrl(path: string, locale: (typeof LOCALES)[number]): string {
  return `${BASE_URL}/${locale}${path === "/" ? "" : path}`;
}

function getValidDate(value: unknown): Date | undefined {
  if (!value) return undefined;

  const date = new Date(value as string | number | Date);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPageDefinitions = [
    ["/", "daily", 1],
    ["/products", "daily", 0.9],
    ["/how-to-use", "weekly", 0.8],
    ["/about", "monthly", 0.7],
    ["/contact", "monthly", 0.7],
    ["/instructions", "monthly", 0.7],
    ["/privacy", "yearly", 0.5],
    ["/terms", "yearly", 0.5],
  ] as const;

  const staticPages: MetadataRoute.Sitemap = staticPageDefinitions.flatMap(([path, changeFrequency, priority]) =>
    LOCALES.map((locale) => ({
      url: localizedUrl(path, locale),
      changeFrequency,
      priority,
    }))
  );

  const productUrls: MetadataRoute.Sitemap = [];
  const journalUrls: MetadataRoute.Sitemap = [];

  try {
    const allProducts = await db
      .select({ slug: products.slug, updatedAt: products.updatedAt, createdAt: products.createdAt })
      .from(products);

    for (const product of allProducts) {
      const slug = product?.slug?.trim();
      if (!slug) continue;

      for (const locale of LOCALES) {
        productUrls.push({
          url: localizedUrl(`/products/${encodeURIComponent(slug)}`, locale),
          lastModified: getValidDate(product.updatedAt || product.createdAt),
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch (error) {
    logger.error("Sitemap product URLs generation failed", error, {
      type: "sitemap_generation_error",
      section: "products",
      baseUrl: BASE_URL,
    });
    void notifySitemapFailure("products", error).catch((alertError) => {
      logger.error("Sitemap product alert failed", alertError, { type: "sitemap_alert_error" });
    });
  }

  try {
    const allPosts = await db
      .select({ slug: journalPosts.slug, updatedAt: journalPosts.updatedAt, createdAt: journalPosts.createdAt })
      .from(journalPosts)
      .where(
        and(
          eq(journalPosts.isPublished, true),
          or(isNull(journalPosts.publishDate), lte(journalPosts.publishDate, new Date()))
        )
      );

    for (const post of allPosts) {
      const slug = post?.slug?.trim();
      if (!slug) continue;

      for (const locale of LOCALES) {
        journalUrls.push({
          url: localizedUrl(`/how-to-use/${encodeURIComponent(slug)}`, locale),
          lastModified: getValidDate(post.updatedAt || post.createdAt),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (error) {
    logger.error("Sitemap article URLs generation failed", error, {
      type: "sitemap_generation_error",
      section: "articles",
      baseUrl: BASE_URL,
    });
    void notifySitemapFailure("articles", error).catch((alertError) => {
      logger.error("Sitemap article alert failed", alertError, { type: "sitemap_alert_error" });
    });
  }

  logger.info("Sitemap generated", {
    type: "sitemap_generation",
    staticPages: staticPages.length,
    productUrls: productUrls.length,
    articleUrls: journalUrls.length,
  });

  return [...staticPages, ...productUrls, ...journalUrls];
}
