import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { products } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch all reviews (including unverified) for a product
// Used by logged-in users to see their own unverified review
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Require authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Handle both Promise and direct params (Next.js 14+ compatibility)
    const resolvedParams = params instanceof Promise ? await params : params;
    let slug = decodeURIComponent(resolvedParams.slug);

    // Normalize slug: remove leading/trailing slashes and spaces
    slug = slug.replace(/^\/+|\/+$/g, "").trim();

    // Find product by slug
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

    const productId = product[0].id;
    const userId = session.user.id;

    // Fetch all reviews for this product (including unverified)
    // But only return the user's own review if it's unverified
    const allReviews = await db
      .select()
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(reviews.createdAt);

    // Filter to only return user's own unverified review
    const userUnverifiedReview = allReviews.find(
      (r) => r.userId === userId && !r.isVerified
    );

    return NextResponse.json({
      reviews: userUnverifiedReview ? [userUnverifiedReview] : [],
    });
  } catch (error) {
    console.error("Error fetching all reviews:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: errorMessage },
      { status: 500 }
    );
  }
}

