import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET: Fetch single contact message
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const message = await db
      .select({
        id: contactMessages.id,
        userId: contactMessages.userId,
        name: contactMessages.name,
        email: contactMessages.email,
        phone: contactMessages.phone,
        subject: contactMessages.subject,
        message: contactMessages.message,
        isRead: contactMessages.isRead,
        reply: contactMessages.reply,
        replyAt: contactMessages.replyAt,
        createdAt: contactMessages.createdAt,
        updatedAt: contactMessages.updatedAt,
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(contactMessages)
      .leftJoin(users, eq(contactMessages.userId, users.id))
      .where(eq(contactMessages.id, params.id))
      .limit(1);

    if (message.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(message[0]);
  } catch (error) {
    console.error("Error fetching contact message:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact message" },
      { status: 500 }
    );
  }
}

// PATCH: Update contact message (mark as read, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { isRead } = body;

    const [updated] = await db
      .update(contactMessages)
      .set({
        isRead: isRead !== undefined ? isRead : undefined,
        updatedAt: new Date(),
      })
      .where(eq(contactMessages.id, params.id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating contact message:", error);
    return NextResponse.json(
      { error: "Failed to update contact message" },
      { status: 500 }
    );
  }
}

// DELETE: Delete contact message
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db
      .delete(contactMessages)
      .where(eq(contactMessages.id, params.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting contact message:", error);
    return NextResponse.json(
      { error: "Failed to delete contact message" },
      { status: 500 }
    );
  }
}

