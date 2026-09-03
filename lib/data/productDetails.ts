import { db } from "@/lib/db";
import { products } from "@/lib/db/schema/products";
import { eq, or } from "drizzle-orm";

export async function getProductBySlug(slug: string) {
  const normalizedSlug = decodeURIComponent(slug).replace(/^\/+|\/+$/g, "").trim();

  const result = await db
    .select()
    .from(products)
    .where(or(eq(products.slug, normalizedSlug), eq(products.id, normalizedSlug)))
    .limit(1);

  const product = result[0];
  if (!product) return null;

  let images: string[] = [];
  if (product.images) {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed)) images = parsed.filter((image): image is string => typeof image === "string");
    } catch {
      images = [];
    }
  }

  return { ...product, images };
}
