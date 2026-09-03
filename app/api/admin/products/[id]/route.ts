import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

// GET - Get single product
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "view_products");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const productId = params.id;

    const product = await db.query.products.findFirst({
      where: eq(products.id, productId),
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch product", details: errorMessage },
      { status: 500 }
    );
  }
}

// PUT - Update product
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_products");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const productId = params.id;
    const body = await request.json();

    // Check if product exists
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.id, productId))
      .limit(1);

    if (existingProduct.length === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const currentProduct = existingProduct[0];
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Update provided fields
    if (body.name !== undefined) updateData.name = body.name;
    if (body.nameFa !== undefined) updateData.nameFa = body.nameFa || null;
    if (body.shortDescription !== undefined) updateData.shortDescription = body.shortDescription || null;
    if (body.shortDescriptionFa !== undefined) updateData.shortDescriptionFa = body.shortDescriptionFa || null;
    if (body.longDescription !== undefined) updateData.longDescription = body.longDescription || null;
    if (body.longDescriptionFa !== undefined) updateData.longDescriptionFa = body.longDescriptionFa || null;
    if (body.ingredients !== undefined) updateData.ingredients = body.ingredients || null;
    if (body.ingredientsFa !== undefined) updateData.ingredientsFa = body.ingredientsFa || null;
    if (body.tags !== undefined) updateData.tags = body.tags || null;
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.sellerId !== undefined) updateData.sellerId = body.sellerId;
    if (body.quantity !== undefined) {
      const newQuantity = parseInt(body.quantity) || 0;
      updateData.quantity = newQuantity;

      // Auto-update badge to "Out of Stock" if quantity becomes 0
      // Only if admin hasn't manually set a badge (badge is None or null)
      if (newQuantity === 0 && (!currentProduct.badge || currentProduct.badge === "None")) {
        updateData.badge = "Out of Stock";
      }
      // Auto-remove "Out of Stock" badge if quantity becomes > 0 and badge was auto-set
      // Only if current badge is "Out of Stock" (meaning it was auto-set)
      else if (newQuantity > 0 && currentProduct.badge === "Out of Stock") {
        // Only remove if it was likely auto-set (we can't be 100% sure, but if quantity was 0 and badge is Out of Stock, it's likely auto-set)
        // Actually, let's be conservative - only auto-remove if we're sure it was auto-set
        // We'll leave it to admin to manually change if they want
        // But we can check: if quantity was 0 before and badge is Out of Stock, it's likely auto-set
        if (currentProduct.quantity === 0) {
          updateData.badge = "None";
        }
      }
    }
    if (body.categoryId !== undefined) updateData.categoryId = body.categoryId || null;
    if (body.categoryIds !== undefined) {
      const ids: string[] = Array.isArray(body.categoryIds) ? body.categoryIds : (body.categoryIds ? JSON.parse(body.categoryIds) : []);
      updateData.categoryIds = ids.length > 0 ? JSON.stringify(ids) : null;
      // Keep categoryId in sync with first selected
      if (ids.length > 0) updateData.categoryId = ids[0];
    }
    if (body.category !== undefined) updateData.category = body.category;
    if (body.slug !== undefined) updateData.slug = body.slug || null;
    if (body.image !== undefined) updateData.image = body.image || null;
    if (body.audioUrl !== undefined) updateData.audioUrl = body.audioUrl || null;
    if (body.ogImage !== undefined) updateData.ogImage = body.ogImage || null;
    if (body.badge !== undefined) updateData.badge = body.badge || "None";
    if (body.productType !== undefined) updateData.productType = body.productType || null;
    if (body.minOrderQuantity !== undefined) updateData.minOrderQuantity = body.minOrderQuantity || 1;
    if (body.maxOrderQuantity !== undefined) updateData.maxOrderQuantity = body.maxOrderQuantity || null;
    if (body.weight !== undefined) updateData.weight = body.weight ? String(body.weight) : null;
    if (body.volume !== undefined) updateData.volume = body.volume ? String(body.volume) : null;
    if (body.unit !== undefined) updateData.unit = body.unit || null;
    if (body.images !== undefined) updateData.images = body.images || null;
    if (body.rewardPoints !== undefined) updateData.rewardPoints = body.rewardPoints && body.rewardPoints > 0 ? body.rewardPoints : null;
    if (body.seoTitle !== undefined) updateData.seoTitle = body.seoTitle || null;
    if (body.seoDescription !== undefined) updateData.seoDescription = body.seoDescription || null;
    if (body.seoKeywords !== undefined) updateData.seoKeywords = body.seoKeywords || null;

    const updatedProduct = await db
      .update(products)
      .set(updateData)
      .where(eq(products.id, productId))
      .returning();

    return NextResponse.json({ product: updatedProduct[0] });
  } catch (error) {
    console.error("Error updating product:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update product", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete product
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "delete_products");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const productId = params.id;

    await db.delete(products).where(eq(products.id, productId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete product", details: errorMessage },
      { status: 500 }
    );
  }
}

