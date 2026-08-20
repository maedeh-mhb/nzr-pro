import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sellers, products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const seller = await db.query.sellers.findFirst({
      where: eq(sellers.id, params.id),
    });

    if (!seller) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({ seller });
  } catch (error) {
    console.error("Error fetching seller:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      nameEn, 
      nameFa, 
      status
    } = body;

    const updatedSeller = await db
      .update(sellers)
      .set({
        nameEn: nameEn !== undefined ? nameEn : undefined,
        nameFa: nameFa !== undefined ? nameFa : undefined,
        status: status !== undefined ? status : undefined,
        updatedAt: new Date(),
      })
      .where(eq(sellers.id, params.id))
      .returning();

    if (updatedSeller.length === 0) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({ seller: updatedSeller[0] });
  } catch (error) {
    console.error("Error updating seller:", error);
    return NextResponse.json(
      { error: "Failed to update seller" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if any products use this seller
    const productsWithSeller = await db
      .select()
      .from(products)
      .where(eq(products.sellerId, params.id))
      .limit(1);

    if (productsWithSeller.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete seller with associated products. Reassign products first." },
        { status: 400 }
      );
    }

    const deletedSeller = await db
      .delete(sellers)
      .where(eq(sellers.id, params.id))
      .returning();

    if (deletedSeller.length === 0) {
      return NextResponse.json({ error: "Seller not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting seller:", error);
    return NextResponse.json(
      { error: "Failed to delete seller" },
      { status: 500 }
    );
  }
}
