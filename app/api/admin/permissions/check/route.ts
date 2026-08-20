import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission, hasAnyPermission, hasAllPermissions } from "@/lib/services/permissions";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, permissionNames, checkType = "any" } = body;

    if (!userId || !permissionNames || !Array.isArray(permissionNames)) {
      return NextResponse.json(
        { error: "userId and permissionNames array are required" },
        { status: 400 }
      );
    }

    let result = false;

    if (checkType === "all") {
      result = await hasAllPermissions(userId, permissionNames);
    } else if (checkType === "any") {
      result = await hasAnyPermission(userId, permissionNames);
    } else if (permissionNames.length === 1) {
      result = await hasPermission(userId, permissionNames[0]);
    }

    return NextResponse.json({ hasPermission: result });
  } catch (error) {
    console.error("Error checking permission:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

