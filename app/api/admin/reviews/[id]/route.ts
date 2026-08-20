import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { reviews } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PATCH - Update review (verify/reject)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;
    const body = await request.json();
    const { isVerified } = body;

    if (typeof isVerified !== "boolean") {
      return NextResponse.json(
        { error: "isVerified must be a boolean" },
        { status: 400 }
      );
    }

    // Update review
    const [updated] = await db
      .update(reviews)
      .set({
        isVerified,
        updatedAt: new Date(),
      })
      .where(eq(reviews.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

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

// DELETE - Delete review
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const resolvedParams = params instanceof Promise ? await params : params;
    const { id } = resolvedParams;

    // Delete review
    await db.delete(reviews).where(eq(reviews.id, id));

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

