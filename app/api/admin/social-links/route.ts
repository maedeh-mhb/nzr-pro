import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { socialLinks, categories } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq, isNull } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Get all social links (separate user links and category links)
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_social_links");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get all categories
    const allCategories = await db.select().from(categories);

    // Get all existing social links
    const existingLinks = await db
      .select()
      .from(socialLinks)
      .orderBy(socialLinks.order);

    // Create a map of category links by categoryId
    const categoryLinksMap = new Map(
      existingLinks
        .filter(link => link.categoryId)
        .map(link => [link.categoryId, link])
    );

    // Sync category links: auto-create for categories that don't have links
    for (const category of allCategories) {
      if (!categoryLinksMap.has(category.id)) {
        // Create a new category link
        try {
          const newLink = await db.insert(socialLinks).values({
            nameEn: category.name,
            nameFa: category.nameFa || category.name,
            url: "https://example.com", // Placeholder URL - admin will update it
            icon: category.icon || null,
            categoryId: category.id,
            order: category.order || 0,
          }).returning();
        } catch (createError) {
          console.error("Error creating category link for category", category.name, ":", createError);
          // Continue with other categories even if one fails
        }
      }
    }

    // Delete category links for categories that no longer exist
    const existingCategoryIds = new Set(allCategories.map(cat => cat.id));
    const categoryLinksToDelete = existingLinks.filter(
      link => link.categoryId && !existingCategoryIds.has(link.categoryId)
    );

    for (const link of categoryLinksToDelete) {
      await db.delete(socialLinks).where(eq(socialLinks.id, link.id));
    }

    // Get updated links (user links and category links)
    const updatedLinks = await db
      .select()
      .from(socialLinks)
      .orderBy(socialLinks.order);

    // Separate user links and category links
    const userLinks = updatedLinks.filter(link => !link.categoryId);
    const categoryLinks = updatedLinks.filter(link => link.categoryId);

    return NextResponse.json({
      userLinks,
      categoryLinks,
    });
  } catch (error) {
    console.error("Error fetching social links:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch social links", details: errorMessage },
      { status: 500 }
    );
  }
}

// Create or update user social links (category links are managed separately)
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_social_links");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { links } = body;

    if (!Array.isArray(links)) {
      return NextResponse.json(
        { error: "Links must be an array" },
        { status: 400 }
      );
    }

    // Get existing user links only (exclude category links)
    const existingUserLinks = await db
      .select()
      .from(socialLinks)
      .where(isNull(socialLinks.categoryId));

    // Create a map of existing user links by ID
    const existingLinksMap = new Map(existingUserLinks.map(link => [link.id, link]));

    // Process each link (only user links, category links are filtered out)
    for (let i = 0; i < links.length; i++) {
      const link = links[i];

      // Skip category links (they should have categoryId)
      if (link.categoryId) {
        continue;
      }

      if (!link.nameEn || !link.nameFa || !link.url) {
        continue; // Skip invalid links
      }

      if (link.id && existingLinksMap.has(link.id)) {
        // Update existing link
        await db
          .update(socialLinks)
          .set({
            nameEn: link.nameEn,
            nameFa: link.nameFa,
            url: link.url,
            icon: link.icon || null,
            categoryId: null, // Ensure it's a user link
            order: i,
            updatedAt: new Date(),
          })
          .where(eq(socialLinks.id, link.id));
      } else {
        // Create new link
        await db.insert(socialLinks).values({
          nameEn: link.nameEn,
          nameFa: link.nameFa,
          url: link.url,
          icon: link.icon || null,
          categoryId: null, // User link
          order: i,
        });
      }
    }

    // Delete user links that are no longer in the array
    const submittedIds = links
      .filter(link => link.id && !link.categoryId) // Only user links
      .map(link => link.id);

    const linksToDelete = existingUserLinks.filter(
      link => !submittedIds.includes(link.id)
    );

    for (const link of linksToDelete) {
      await db.delete(socialLinks).where(eq(socialLinks.id, link.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving social links:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to save social links", details: errorMessage },
      { status: 500 }
    );
  }
}

// Update category link (URL and icon only, name comes from category)
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_social_links");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { links } = body; // Array of category links with { id, url, icon }

    if (!Array.isArray(links)) {
      return NextResponse.json(
        { error: "Links must be an array" },
        { status: 400 }
      );
    }

    // Get all categories to sync names
    const allCategories = await db.select().from(categories);
    const categoriesMap = new Map(allCategories.map(cat => [cat.id, cat]));

    // Update each category link
    for (const link of links) {
      if (!link.id || !link.categoryId) {
        continue; // Skip invalid links
      }

      const category = categoriesMap.get(link.categoryId);
      if (!category) {
        continue; // Category doesn't exist, skip
      }

      // Update category link (name comes from category, only update URL and icon)
      await db
        .update(socialLinks)
        .set({
          nameEn: category.name, // Sync name from category
          nameFa: category.nameFa || category.name, // Sync name from category
          url: link.url || "",
          icon: link.icon || null,
          updatedAt: new Date(),
        })
        .where(eq(socialLinks.id, link.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating category links:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update category links", details: errorMessage },
      { status: 500 }
    );
  }
}

