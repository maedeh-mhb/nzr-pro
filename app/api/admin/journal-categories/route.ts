import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { journalCategories } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch all journal categories
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const categories = await db
      .select()
      .from(journalCategories)
      .orderBy(journalCategories.order);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching journal categories:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch journal categories", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create new journal category
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, nameFa, description, descriptionFa, order, isActive } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Missing required field: name" },
        { status: 400 }
      );
    }

    const newCategory = await db
      .insert(journalCategories)
      .values({
        name,
        nameFa: nameFa || null,
        description: description || null,
        descriptionFa: descriptionFa || null,
        order: order || 0,
        isActive: isActive !== undefined ? isActive : true,
      })
      .returning();

    return NextResponse.json({ category: newCategory[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating journal category:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create journal category", details: errorMessage },
      { status: 500 }
    );
  }
}

