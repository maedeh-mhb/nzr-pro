import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { eq, and, or } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const messageId = params.id;

    // Verify the message belongs to the user
    const message = await db
      .select()
      .from(contactMessages)
      .where(eq(contactMessages.id, messageId))
      .limit(1);

    if (message.length === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    if (message[0].userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Delete the message and any replies (cascade delete)
    await db
      .delete(contactMessages)
      .where(
        or(
          eq(contactMessages.id, messageId),
          eq(contactMessages.parentMessageId, messageId)
        )
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting message:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete message", details: errorMessage },
      { status: 500 }
    );
  }
}

