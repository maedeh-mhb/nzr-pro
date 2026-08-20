import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orderNotes, users } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq, desc } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET - Fetch order notes
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;

    // Fetch order notes
    const notes = await db
      .select()
      .from(orderNotes)
      .where(eq(orderNotes.orderId, id))
      .orderBy(desc(orderNotes.createdAt));

    // Fetch user names for createdBy fields
    const userIds = new Set(notes.map((n) => n.createdBy));
    const usersMap = new Map();
    for (const userId of userIds) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        usersMap.set(userId, user);
      }
    }

    // Format notes with user names
    const formattedNotes = notes.map((note) => {
      const user = usersMap.get(note.createdBy);
      const createdByName = user
        ? `${user.name} ${user.surname || ""}`.trim()
        : "Unknown";

      return {
        id: note.id,
        note: note.note,
        createdBy: note.createdBy,
        createdByName,
        isInternal: note.isInternal,
        createdAt: note.createdAt,
      };
    });

    return NextResponse.json({ notes: formattedNotes });
  } catch (error) {
    console.error("Error fetching order notes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch order notes", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create order note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "edit_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const { id } = params;
    const body = await request.json();
    const { note, isInternal = true } = body;

    if (!note || typeof note !== "string" || note.trim() === "") {
      return NextResponse.json(
        { error: "Note is required" },
        { status: 400 }
      );
    }

    // Create note
    const [newNote] = await db
      .insert(orderNotes)
      .values({
        orderId: id,
        note: note.trim(),
        createdBy: authResult.session!.user.id,
        isInternal: Boolean(isInternal),
      })
      .returning();

    // Fetch user name
    const user = await db.query.users.findFirst({
      where: eq(users.id, authResult.session!.user.id),
    });
    const createdByName = user
      ? `${user.name} ${user.surname || ""}`.trim()
      : "Unknown";

    return NextResponse.json({
      note: {
        id: newNote.id,
        note: newNote.note,
        createdBy: newNote.createdBy,
        createdByName,
        isInternal: newNote.isInternal,
        createdAt: newNote.createdAt,
      },
    });
  } catch (error) {
    console.error("Error creating order note:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create order note", details: errorMessage },
      { status: 500 }
    );
  }
}

