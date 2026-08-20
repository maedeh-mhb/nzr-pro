import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Define a type for the product response that matches frontend expectations
interface ProductResponse {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  longDescription: string | null;
  longDescriptionFa: string | null;
  ingredients: string | null;
  ingredientsFa: string | null;
  tags: string | null;
  price: string;
  quantity: number;
  image: string | null;
  ogImage: string | null;
  images: string[]; // Always an array in response
  badge: string | null;
  productType: "economic" | "featured" | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
  weight: string | null;
  volume: string | null;
  unit: string | null;
  rewardPoints: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  slug: string | null;
  category: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Handle both Promise and direct params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let slug = decodeURIComponent(resolvedParams.slug);

    if (!slug) {
      return NextResponse.json(
        { error: "Product slug is required" },
        { status: 400 }
      );
    }

    // Normalize slug: remove leading/trailing slashes and spaces
    slug = slug.replace(/^\/+|\/+$/g, "").trim();

    // Find product by slug (with or without leading slash) or by id (for backward compatibility)
    const product = await db
      .select()
      .from(products)
      .where(
        or(
          eq(products.slug, slug),
          eq(products.slug, `/${slug}`),
          eq(products.slug, `${slug}/`),
          eq(products.slug, `/${slug}/`),
          eq(products.id, slug)
        )
      )
      .limit(1);

    if (!product || product.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Parse the images field if it's a JSON string
    const productData: ProductResponse = { ...product[0] } as any;
    if (productData.images && typeof productData.images === 'string') {
      try {
        productData.images = JSON.parse(productData.images);
      } catch (error) {
        // If parsing fails, set to empty array
        console.error('Failed to parse images JSON:', error);
        productData.images = [];
      }
    } else if (!productData.images) {
      // Ensure images is always an array (empty if null/undefined)
      productData.images = [];
    }

    return NextResponse.json({ product: productData });
  } catch (error) {
    console.error("Error fetching product:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch product", details: errorMessage },
      { status: 500 }
    );
  }
}

