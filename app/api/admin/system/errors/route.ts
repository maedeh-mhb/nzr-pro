import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";

// In-memory error log (in production, use a proper logging service)
const errorLog: Array<{
  id: string;
  message: string;
  stack?: string;
  timestamp: Date;
  url?: string;
  method?: string;
  userId?: string;
  severity: "error" | "warning" | "info";
}> = [];

// Keep only last 1000 errors
const MAX_ERRORS = 1000;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const severity = searchParams.get("severity") as "error" | "warning" | "info" | null;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);

    let filtered = [...errorLog];

    if (severity) {
      filtered = filtered.filter((e) => e.severity === severity);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const paginated = filtered.slice(offset, offset + limit);

    return NextResponse.json({
      errors: paginated,
      total: filtered.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching error log:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Endpoint to log errors (can be called from error handlers)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, url, method, userId, severity = "error" } = body;

    const errorEntry = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      message: message || "Unknown error",
      stack,
      timestamp: new Date(),
      url,
      method,
      userId,
      severity,
    };

    errorLog.unshift(errorEntry);

    // Keep only last MAX_ERRORS
    if (errorLog.length > MAX_ERRORS) {
      errorLog.splice(MAX_ERRORS);
    }

    return NextResponse.json({ success: true, id: errorEntry.id });
  } catch (error) {
    console.error("Error logging error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

