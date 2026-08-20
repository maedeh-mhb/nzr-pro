import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { products } from "@/lib/db/schema";
import { eq, or, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
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

    // Get session to check if user has an unverified review
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;

    // Fetch verified reviews for this product
    const verifiedReviews = await db
      .select()
      .from(reviews)
      .where(
        and(
          eq(reviews.productId, productId),
          eq(reviews.isVerified, true)
        )
      )
      .orderBy(reviews.createdAt);

    // If user is logged in, also fetch their own unverified review (if exists)
    let userUnverifiedReview = null;
    if (userId) {
      userUnverifiedReview = await db.query.reviews.findFirst({
        where: and(
          eq(reviews.productId, productId),
          eq(reviews.userId, userId),
          eq(reviews.isVerified, false)
        ),
      });
    }

    // Combine verified reviews with user's unverified review
    // User's unverified review should appear in the list as if it's verified
    const allReviews = [...verifiedReviews];
    if (userUnverifiedReview) {
      // Add user's unverified review to the list (it will appear as a normal review)
      allReviews.push(userUnverifiedReview);
      // Sort by createdAt to maintain chronological order
      allReviews.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    }

    return NextResponse.json({ 
      reviews: allReviews,
      userUnverifiedReview: userUnverifiedReview || null, // Also return separately for easy access
    });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> | { slug: string } }
) {
  try {
    // Require authentication - only registered users can review
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required. Please log in to write a review." },
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
    const body = await request.json();
    const { reviewerName, reviewText } = body;

    if (!reviewerName || !reviewText) {
      return NextResponse.json(
        { error: "Reviewer name and review text are required" },
        { status: 400 }
      );
    }

    // Check if user already has a review for this product
    const existingReview = await db.query.reviews.findFirst({
      where: and(
        eq(reviews.productId, productId),
        eq(reviews.userId, userId)
      ),
    });

    if (existingReview) {
      return NextResponse.json(
        { error: "You have already submitted a review for this product." },
        { status: 400 }
      );
    }

    // Create new review (unverified by default)
    const newReview = await db
      .insert(reviews)
      .values({
        productId,
        userId,
        reviewerName: reviewerName.trim(),
        reviewText: reviewText.trim(),
        isVerified: false, // Admin must verify
      })
      .returning();

    return NextResponse.json({ review: newReview[0] });
  } catch (error) {
    console.error("Error creating review:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create review", details: errorMessage },
      { status: 500 }
    );
  }
}

