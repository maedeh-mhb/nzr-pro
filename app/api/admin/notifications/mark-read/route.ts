import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages, adminNotificationReads } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { notificationId, markAll, notificationIds } = body as {
      notificationId?: string;
      markAll?: boolean;
      notificationIds?: string[];
    };

    if (!notificationId && !markAll) {
      return NextResponse.json(
        { error: "Notification ID or markAll flag is required" },
        { status: 400 }
      );
    }

    // Mark contact message notifications as read in DB
    if (markAll) {
      await db
        .update(contactMessages)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(contactMessages.isRead, false));
    }

    if (notificationId && notificationId.startsWith("message_")) {
      const messageId = notificationId.replace("message_", "");
      await db
        .update(contactMessages)
        .set({ isRead: true, updatedAt: new Date() })
        .where(eq(contactMessages.id, messageId));
    }

    // Persist read state for ALL notification types in admin_notification_reads
    const idsToMark = markAll && notificationIds ? notificationIds : notificationId ? [notificationId] : [];

    if (idsToMark.length > 0) {
      // Insert only IDs that aren't already marked as read
      const existingReads = await db
        .select({ notificationId: adminNotificationReads.notificationId })
        .from(adminNotificationReads)
        .where(
          and(
            eq(adminNotificationReads.adminUserId, session.user.id),
            inArray(adminNotificationReads.notificationId, idsToMark)
          )
        );

      const existingIds = new Set(existingReads.map((r) => r.notificationId));
      const newIds = idsToMark.filter((id) => !existingIds.has(id));

      if (newIds.length > 0) {
        await db.insert(adminNotificationReads).values(
          newIds.map((id) => ({
            notificationId: id,
            adminUserId: session.user.id,
          }))
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return NextResponse.json(
      { error: "Failed to mark notification as read" },
      { status: 500 }
    );
  }
}
