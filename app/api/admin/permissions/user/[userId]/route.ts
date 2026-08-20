import { NextRequest, NextResponse } from "next/server";
import { requireSuperadmin } from "@/lib/middleware/auth";
import {
  getUserPermissions,
  grantPermission,
  revokePermission,
  setUserPermissions,
} from "@/lib/services/permissions";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await requireSuperadmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const permissions = await getUserPermissions(params.userId);
    return NextResponse.json({ permissions });
  } catch (error) {
    console.error("Error getting user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await requireSuperadmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const session = authResult.session;
    const body = await request.json();
    const { action, permissionName, permissionNames } = body;
    const adminId = (session?.user as any)?.id;

    if (action === "grant" && permissionName) {
      const result = await grantPermission(params.userId, permissionName, adminId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "revoke" && permissionName) {
      const result = await revokePermission(params.userId, permissionName, adminId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    if (action === "set" && permissionNames) {
      const result = await setUserPermissions(params.userId, permissionNames, adminId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        );
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid action or missing parameters" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error managing user permissions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

