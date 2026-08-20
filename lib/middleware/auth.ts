/**
 * Centralized authorization middleware utilities
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Session } from "next-auth";
import { hasAllPermissions, hasAnyPermission } from "@/lib/services/permissions";

function getRequiredPermissionsForRoute(request: NextRequest): string[] | null {
  const pathname = request.nextUrl?.pathname || new URL(request.url || "http://localhost").pathname;
  const method = request.method || "GET";

  if (pathname.startsWith("/api/admin/users")) {
    if (method === "POST") return ["create_users"];
    if (method === "PUT" || method === "PATCH") return ["edit_users"];
    if (method === "DELETE") return ["delete_users"];
    return ["view_users"];
  }

  if (pathname.startsWith("/api/admin/products")) {
    if (method === "POST") return ["create_products"];
    if (method === "PUT" || method === "PATCH" || method === "DELETE") return ["edit_products"];
    return ["view_products"];
  }

  if (pathname.startsWith("/api/admin/orders")) {
    if (method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE") {
      return ["edit_orders"];
    }
    return ["view_orders"];
  }

  if (
    pathname.startsWith("/api/admin/settings") ||
    pathname.startsWith("/api/admin/permissions") ||
    pathname.startsWith("/api/admin/contact-settings") ||
    pathname.startsWith("/api/admin/bank-settings") ||
    pathname.startsWith("/api/admin/home-note") ||
    pathname.startsWith("/api/admin/mid-page-banner") ||
    pathname.startsWith("/api/admin/instructions-page") ||
    pathname.startsWith("/api/admin/about-us")
  ) {
    return ["manage_site_settings"];
  }

  return null;
}

export type UserRole = "user" | "admin" | "superadmin";

interface AuthResult {
  authorized: boolean;
  session: Session | null;
  userRole: UserRole | null;
  response?: NextResponse;
}

/**
 * Require authentication (any logged-in user)
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      authorized: false,
      session: null,
      userRole: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const userRole = (session.user as any)?.role as UserRole;

  return {
    authorized: true,
    session,
    userRole,
  };
}

/**
 * Require admin role (admin or superadmin)
 */
export async function requireAdmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authorized) {
    return authResult;
  }

  if (authResult.userRole !== "admin" && authResult.userRole !== "superadmin") {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  if (authResult.userRole === "superadmin") {
    return authResult;
  }

  const requiredPermissions = getRequiredPermissionsForRoute(request);
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return authResult;
  }

  const userId = getUserId(authResult.session);
  if (!userId) {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const hasRequiredPermission = await hasAnyPermission(userId, requiredPermissions);
  if (!hasRequiredPermission) {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Require superadmin role (only superadmin)
 */
export async function requireSuperadmin(request: NextRequest): Promise<AuthResult> {
  const authResult = await requireAuth(request);

  if (!authResult.authorized) {
    return authResult;
  }

  if (authResult.userRole !== "superadmin") {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Require admin role and one of the specified permissions.
 */
export async function requireAdminWithPermissions(
  request: NextRequest,
  requiredPermissions: string | string[],
  options?: { requireAll?: boolean }
): Promise<AuthResult> {
  const authResult = await requireAdmin(request);

  if (!authResult.authorized || !authResult.session) {
    return authResult;
  }

  if (authResult.userRole === "superadmin") {
    return authResult;
  }

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  if (permissions.length === 0) {
    return authResult;
  }

  const userId = getUserId(authResult.session);
  if (!userId) {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  const hasRequiredPermission = options?.requireAll
    ? await hasAllPermissions(userId, permissions)
    : await hasAnyPermission(userId, permissions);

  if (!hasRequiredPermission) {
    return {
      authorized: false,
      session: authResult.session,
      userRole: authResult.userRole,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return authResult;
}

/**
 * Get user ID from session
 */
export function getUserId(session: Session | null): string | null {
  if (!session?.user) {
    return null;
  }
  return (session.user as any)?.id || null;
}

/**
 * Check if user has specific role
 */
export function hasRole(session: Session | null, role: UserRole): boolean {
  if (!session?.user) {
    return false;
  }
  const userRole = (session.user as any)?.role as UserRole;
  return userRole === role;
}

