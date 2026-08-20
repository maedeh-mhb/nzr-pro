import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { eq, desc, lt } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET: Fetch all contact messages (with pagination/infinite scroll)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");
    const limit = parseInt(searchParams.get("limit") || "20");

    let messages: any[];
    if (cursor) {
      // Get the cursor message to find its createdAt timestamp
      const cursorMessage = await db
        .select()
        .from(contactMessages)
        .where(eq(contactMessages.id, cursor))
        .limit(1);

      if (cursorMessage.length > 0) {
        // Get messages created before the cursor message's timestamp
        messages = await db
          .select()
          .from(contactMessages)
          .where(lt(contactMessages.createdAt, cursorMessage[0].createdAt))
          .orderBy(desc(contactMessages.createdAt))
          .limit(limit + 1);
      } else {
        messages = [];
      }
    } else {
      messages = await db
        .select()
        .from(contactMessages)
        .orderBy(desc(contactMessages.createdAt))
        .limit(limit + 1);
    }

    const hasMore = messages.length > limit;
    const data = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? data[data.length - 1].id : null;

    return NextResponse.json({
      messages: data,
      nextCursor,
      hasMore,
    });
  } catch (error) {
    console.error("Error fetching contact messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact messages" },
      { status: 500 }
    );
  }
}

