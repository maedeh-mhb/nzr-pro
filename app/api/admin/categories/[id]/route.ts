import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { categories, socialLinks, products } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, nameFa, description, descriptionFa, icon, order, isActive } = body;

    const updatedCategory = await db
      .update(categories)
      .set({
        name: name !== undefined ? name : undefined,
        nameFa: nameFa !== undefined ? nameFa : undefined,
        description: description !== undefined ? description : undefined,
        descriptionFa: descriptionFa !== undefined ? descriptionFa : undefined,
        icon: icon !== undefined ? icon : undefined,
        order: order !== undefined ? order : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      })
      .where(eq(categories.id, params.id))
      .returning();

    if (updatedCategory.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const category = updatedCategory[0];

    // Update corresponding category exclusive social link (sync name from category)
    const categoryLink = await db
      .select()
      .from(socialLinks)
      .where(eq(socialLinks.categoryId, category.id))
      .limit(1);

    if (categoryLink.length > 0) {
      await db
        .update(socialLinks)
        .set({
          nameEn: category.name,
          nameFa: category.nameFa || category.name,
          icon: category.icon || null,
          updatedAt: new Date(),
        })
        .where(eq(socialLinks.id, categoryLink[0].id));
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error updating category:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update category", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const deletedCategory = await db
      .delete(categories)
      .where(eq(categories.id, params.id))
      .returning();

    if (deletedCategory.length === 0) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Remove the deleted category from any product primary category references
    const primaryRefResult = await db
      .update(products)
      .set({ categoryId: null })
      .where(eq(products.categoryId, params.id))
      .execute();

    // Remove the deleted category ID from any product categoryIds array JSON
    const categoryIdsResult = await db.execute(sql`
      UPDATE products
      SET category_ids = CASE
        WHEN jsonb_array_length(category_ids::jsonb - ${params.id}) = 0
          THEN NULL
        ELSE (category_ids::jsonb - ${params.id})::text
      END
      WHERE category_ids IS NOT NULL
        AND category_ids::jsonb ? ${params.id}
    `);

    // Delete corresponding category exclusive social link (cascade delete should handle this, but we do it explicitly)
    await db
      .delete(socialLinks)
      .where(eq(socialLinks.categoryId, params.id));

    return NextResponse.json({
      success: true,
      productPrimaryCleanupCount: (primaryRefResult as any)?.rowCount ?? 0,
      productCategoryIdsCleanupCount: (categoryIdsResult as any)?.rowCount ?? 0,
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete category", details: errorMessage },
      { status: 500 }
    );
  }
}

