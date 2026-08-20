import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuditTrail, getAuditEntry } from "@/lib/services/auditTrail";
export const dynamic = "force-dynamic";

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
    const adminId = searchParams.get("adminId") || undefined;
    const action = searchParams.get("action") as any;
    const entityType = searchParams.get("entityType") as any;
    const entityId = searchParams.get("entityId") || undefined;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const search = searchParams.get("search") || undefined;
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const entryId = searchParams.get("entryId");

    // Get single entry
    if (entryId) {
      const result = await getAuditEntry(entryId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to fetch entry" },
          { status: 404 }
        );
      }
      return NextResponse.json(result.entry);
    }

    // Get list of entries
    const result = await getAuditTrail({
      adminId,
      action,
      entityType,
      entityId,
      startDate,
      endDate,
      search,
      limit,
      offset,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

