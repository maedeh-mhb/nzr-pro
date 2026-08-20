import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { eq, desc, and, isNull, count as drizzleCount } from "drizzle-orm";
import { paginatedResponse } from "@/lib/utils/apiResponse";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get pagination params
    const searchParams = request.nextUrl.searchParams;
    let page = parseInt(searchParams.get("page") || "1", 10);
    let limit = parseInt(searchParams.get("limit") || "10", 10);

    // Validate pagination params
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    // Get total count (only parent messages)
    const totalResult = await db
      .select({ count: drizzleCount() })
      .from(contactMessages)
      .where(
        and(
          eq(contactMessages.userId, userId),
          isNull(contactMessages.parentMessageId)
        )
      );
    const total = totalResult[0]?.count || 0;

    // Calculate offset and fetch paginated messages
    const offset = (page - 1) * limit;
    const userMessages = await db
      .select()
      .from(contactMessages)
      .where(
        and(
          eq(contactMessages.userId, userId),
          isNull(contactMessages.parentMessageId) // Only get parent messages
        )
      )
      .orderBy(desc(contactMessages.createdAt))
      .offset(offset)
      .limit(limit);

    const messages = userMessages.map((msg) => ({
      id: msg.id,
      subject: msg.subject,
      message: msg.message,
      reply: msg.reply,
      replyAt: msg.replyAt,
      isReadByUser: msg.isReadByUser,
      createdAt: msg.createdAt,
    }));

    return paginatedResponse(messages, page, limit, total);
  } catch (error) {
    console.error("Error fetching user messages:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch messages", details: errorMessage },
      { status: 500 }
    );
  }
}

