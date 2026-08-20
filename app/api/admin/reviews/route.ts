import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews, products, users } from "@/lib/db/schema";
import { eq, desc, or, and, ilike, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch all reviews (for admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // "all", "verified", "unverified"
    const search = searchParams.get("search") || "";

    // Build where conditions
    let whereConditions: any[] = [];

    if (filter === "verified") {
      whereConditions.push(eq(reviews.isVerified, true));
    } else if (filter === "unverified") {
      whereConditions.push(eq(reviews.isVerified, false));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(reviews.reviewerName, `%${search}%`),
          ilike(reviews.reviewText, `%${search}%`)
        )
      );
    }

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

    // Fetch reviews first (no joins = no duplicates)
    // Use DISTINCT to ensure no duplicates even if database has them
    const allReviewsRaw = await db
      .select({
        id: reviews.id,
        productId: reviews.productId,
        userId: reviews.userId,
        reviewerName: reviews.reviewerName,
        reviewText: reviews.reviewText,
        isVerified: reviews.isVerified,
        createdAt: reviews.createdAt,
        updatedAt: reviews.updatedAt,
      })
      .from(reviews)
      .where(whereClause)
      .orderBy(desc(reviews.createdAt));

    // Get unique product and user IDs
    const productIds = [...new Set(allReviewsRaw.map((r) => r.productId).filter(Boolean))];
    const userIds = [...new Set(allReviewsRaw.map((r) => r.userId).filter(Boolean))];

    // Fetch all products and users in batch using inArray
    const productsMap = new Map();
    if (productIds.length > 0) {
      const productsData = await db
        .select({
          id: products.id,
          name: products.name,
          nameFa: products.nameFa,
          slug: products.slug,
        })
        .from(products)
        .where(inArray(products.id, productIds));

      productsData.forEach((product) => {
        productsMap.set(product.id, product);
      });
    }

    const usersMap = new Map();
    if (userIds.length > 0) {
      const usersData = await db
        .select({
          id: users.id,
          name: users.name,
          surname: users.surname,
          email: users.email,
        })
        .from(users)
        .where(inArray(users.id, userIds));

      usersData.forEach((user) => {
        usersMap.set(user.id, user);
      });
    }

    // Combine reviews with product and user info
    // Deduplicate by review ID AND by content (userId + productId + reviewText) to catch true duplicates
    const reviewsMap = new Map();
    const contentMap = new Map<string, string>(); // Track content signatures to detect duplicates
    
    allReviewsRaw.forEach((review) => {
      // Create a content signature: userId + productId + reviewText hash
      const contentSignature = `${review.userId}_${review.productId}_${review.reviewText.substring(0, 50)}`;
      
      // Only add if we haven't seen this ID or this exact content before
      if (!reviewsMap.has(review.id) && !contentMap.has(contentSignature)) {
        const reviewData = {
          id: review.id,
          productId: review.productId,
          userId: review.userId,
          reviewerName: review.reviewerName,
          reviewText: review.reviewText,
          isVerified: review.isVerified,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
          product: productsMap.get(review.productId) || null,
          user: usersMap.get(review.userId) || null,
        };
        
        reviewsMap.set(review.id, reviewData);
        contentMap.set(contentSignature, review.id);
      }
    });

    // Convert map back to array and maintain order by createdAt
    const allReviews = Array.from(reviewsMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    return NextResponse.json({ reviews: allReviews });
  } catch (error) {
    console.error("Error fetching reviews:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch reviews", details: errorMessage },
      { status: 500 }
    );
  }
}

