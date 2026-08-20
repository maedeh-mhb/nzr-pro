import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { rollbackAuditEntry } from "@/lib/services/auditTrail";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { entryId } = body;

    if (!entryId) {
      return NextResponse.json(
        { error: "Entry ID is required" },
        { status: 400 }
      );
    }

    const adminId = (session.user as any)?.id;
    const result = await rollbackAuditEntry(entryId, adminId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to rollback entry" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      beforeState: result.beforeState,
      entityType: result.entityType,
      entityId: result.entityId,
    });
  } catch (error) {
    console.error("Error rolling back audit entry:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

