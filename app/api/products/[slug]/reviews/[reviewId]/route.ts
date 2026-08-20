import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PUT - Update review (only if not verified)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; reviewId: string }> | { slug: string; reviewId: string } }
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const { reviewId } = resolvedParams;
    const userId = session.user.id;

    // Find the review
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if user owns this review
    if (review.userId !== userId) {
      return NextResponse.json(
        { error: "You can only edit your own reviews" },
        { status: 403 }
      );
    }

    // Check if review is already verified (cannot edit after verification)
    if (review.isVerified) {
      return NextResponse.json(
        { error: "Cannot edit a review that has been verified by admin" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { reviewerName, reviewText } = body;

    if (!reviewerName || !reviewText) {
      return NextResponse.json(
        { error: "Reviewer name and review text are required" },
        { status: 400 }
      );
    }

    // Update review
    const [updated] = await db
      .update(reviews)
      .set({
        reviewerName: reviewerName.trim(),
        reviewText: reviewText.trim(),
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, reviewId))
      .returning();

    return NextResponse.json({ review: updated });
  } catch (error) {
    console.error("Error updating review:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update review", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete review (only if not verified)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; reviewId: string }> | { slug: string; reviewId: string } }
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

    const resolvedParams = params instanceof Promise ? await params : params;
    const { reviewId } = resolvedParams;
    const userId = session.user.id;

    // Find the review
    const review = await db.query.reviews.findFirst({
      where: eq(reviews.id, reviewId),
    });

    if (!review) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    // Check if user owns this review
    if (review.userId !== userId) {
      return NextResponse.json(
        { error: "You can only delete your own reviews" },
        { status: 403 }
      );
    }

    // Check if review is already verified (cannot delete after verification)
    if (review.isVerified) {
      return NextResponse.json(
        { error: "Cannot delete a review that has been verified by admin" },
        { status: 400 }
      );
    }

    // Delete review
    await db.delete(reviews).where(eq(reviews.id, reviewId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting review:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete review", details: errorMessage },
      { status: 500 }
    );
  }
}

