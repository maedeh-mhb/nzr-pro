import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAuditTrail } from "@/lib/services/auditTrail";
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
    const format = searchParams.get("format") || "csv";
    const adminId = searchParams.get("adminId") || undefined;
    const action = searchParams.get("action") as any;
    const entityType = searchParams.get("entityType") as any;
    const startDate = searchParams.get("startDate")
      ? new Date(searchParams.get("startDate")!)
      : undefined;
    const endDate = searchParams.get("endDate")
      ? new Date(searchParams.get("endDate")!)
      : undefined;
    const search = searchParams.get("search") || undefined;

    // Get all entries (no limit for export)
    const result = await getAuditTrail({
      adminId,
      action,
      entityType,
      startDate,
      endDate,
      search,
      limit: 10000,
      offset: 0,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to fetch audit trail" },
        { status: 500 }
      );
    }

    if (format === "csv") {
      // Generate CSV
      const headers = [
        "ID",
        "Admin ID",
        "Action",
        "Entity Type",
        "Entity ID",
        "Description",
        "Can Rollback",
        "Rolled Back",
        "Created At",
      ];

      const rows = result.entries.map((entry) => [
        entry.id,
        entry.adminId,
        entry.action,
        entry.entityType,
        entry.entityId || "",
        entry.description,
        entry.canRollback ? "Yes" : "No",
        entry.rolledBack ? "Yes" : "No",
        entry.createdAt.toISOString(),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");

      // Add BOM for Excel compatibility
      const csvWithBOM = "\uFEFF" + csvContent;

      return new NextResponse(csvWithBOM, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-trail-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    // JSON format
    return NextResponse.json({
      entries: result.entries,
      total: result.total,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error exporting audit trail:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

