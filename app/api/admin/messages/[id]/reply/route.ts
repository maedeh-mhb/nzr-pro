import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/services/notifications";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messageId = params.id;
    const body = await request.json();
    const { reply } = body;

    if (!reply || reply.trim() === "") {
      return NextResponse.json(
        { error: "Reply message is required" },
        { status: 400 }
      );
    }

    // Get the original message
    const message = await db.query.contactMessages.findFirst({
      where: eq(contactMessages.id, messageId),
    });

    if (!message) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }

    // Update message with reply
    await db
      .update(contactMessages)
      .set({
        reply: reply.trim(),
        replyAt: new Date(),
        isReadByUser: false, // User hasn't read the reply yet
        updatedAt: new Date(),
      })
      .where(eq(contactMessages.id, messageId));

    // Create notification for user if they have an account
    if (message.userId) {
      await createNotification({
        userId: message.userId,
        type: "message_reply",
        title: "New Reply to Your Message",
        titleFa: "پاسخ جدید به پیام شما",
        message: `You have received a reply to your message from ${message.name}.`,
        messageFa: `شما پاسخ جدیدی برای پیام ${message.name} دریافت کرده‌اید.`,
        notificationData: { messageId: messageId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error replying to message:", error);
    return NextResponse.json(
      { error: "Failed to reply to message" },
      { status: 500 }
    );
  }
}

