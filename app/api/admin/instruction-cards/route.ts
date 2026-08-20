import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { instructionCards } from "@/lib/db/schema/system";
import { eq, asc } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const cards = await db
      .select()
      .from(instructionCards)
      .orderBy(asc(instructionCards.sortOrder));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Error fetching instruction cards:", error);
    return NextResponse.json({ error: "Failed to fetch cards" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { titleEn, titleFa, imageUrl, contentEn, contentFa, audioUrl, sortOrder, isEnabled } = body;

    if (!titleEn || !titleFa || !imageUrl) {
      return NextResponse.json({ error: "Title and image are required" }, { status: 400 });
    }

    const [card] = await db.insert(instructionCards).values({
      titleEn,
      titleFa,
      imageUrl,
      contentEn: contentEn || null,
      contentFa: contentFa || null,
      audioUrl: audioUrl || null,
      sortOrder: sortOrder ?? 0,
      isEnabled: isEnabled ?? true,
    }).returning();

    return NextResponse.json({ card }, { status: 201 });
  } catch (error) {
    console.error("Error creating instruction card:", error);
    return NextResponse.json({ error: "Failed to create card" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, titleEn, titleFa, imageUrl, contentEn, contentFa, audioUrl, sortOrder, isEnabled } = body;

    if (!id) return NextResponse.json({ error: "Card ID is required" }, { status: 400 });

    const [card] = await db
      .update(instructionCards)
      .set({
        titleEn,
        titleFa,
        imageUrl,
        contentEn: contentEn || null,
        contentFa: contentFa || null,
        audioUrl: audioUrl || null,
        sortOrder: sortOrder ?? 0,
        isEnabled: isEnabled ?? true,
        updatedAt: new Date(),
      })
      .where(eq(instructionCards.id, id))
      .returning();

    return NextResponse.json({ card });
  } catch (error) {
    console.error("Error updating instruction card:", error);
    return NextResponse.json({ error: "Failed to update card" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Card ID is required" }, { status: 400 });

    await db.delete(instructionCards).where(eq(instructionCards.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting instruction card:", error);
    return NextResponse.json({ error: "Failed to delete card" }, { status: 500 });
  }
}
