/**
 * Permissions Management Service
 */

import { db } from "@/lib/db";
import { users, permissions, userPermissions } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export type UserRole = "user" | "admin" | "superadmin";

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permissionName: string
): Promise<boolean> {
  try {
    // Get user role
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    // Superadmin has all permissions
    if (user.role === "superadmin") {
      return true;
    }

    // Get permission
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, permissionName))
      .limit(1);

    if (!permission) {
      return false;
    }

    // Check if user has this permission
    const [userPermission] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permission.id)
        )
      )
      .limit(1);

    return !!userPermission;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissionNames: string[]
): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    if (user.role === "superadmin") {
      return true;
    }

    // Get all permissions
    const allPermissions = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.name, permissionNames));

    if (allPermissions.length === 0) {
      return false;
    }

    const permissionIds = allPermissions.map((p) => p.id);

    // Check if user has any of these permissions
    const userPerms = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          inArray(userPermissions.permissionId, permissionIds)
        )
      )
      .limit(1);

    return userPerms.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissionNames: string[]
): Promise<boolean> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return false;
    }

    if (user.role === "superadmin") {
      return true;
    }

    // Get all permissions
    const allPermissions = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.name, permissionNames));

    if (allPermissions.length !== permissionNames.length) {
      return false;
    }

    const permissionIds = allPermissions.map((p) => p.id);

    // Check if user has all of these permissions
    const userPerms = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          inArray(userPermissions.permissionId, permissionIds)
        )
      );

    return userPerms.length === permissionNames.length;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false;
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return [];
    }

    if (user.role === "superadmin") {
      // Return all permissions for superadmin
      const allPermissions = await db.select().from(permissions);
      return allPermissions.map((p) => p.name);
    }

    // Get user's permissions
    const userPerms = await db
      .select({
        permissionName: permissions.name,
      })
      .from(userPermissions)
      .innerJoin(permissions, eq(userPermissions.permissionId, permissions.id))
      .where(eq(userPermissions.userId, userId));

    return userPerms.map((p) => p.permissionName);
  } catch (error) {
    return [];
  }
}

/**
 * Grant permission to user
 */
export async function grantPermission(
  userId: string,
  permissionName: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get permission
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, permissionName))
      .limit(1);

    if (!permission) {
      return { success: false, error: "Permission not found" };
    }

    // Check if already granted
    const [existing] = await db
      .select()
      .from(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permission.id)
        )
      )
      .limit(1);

    if (existing) {
      return { success: true }; // Already granted
    }

    // Get old permissions for audit
    const oldPerms = await getUserPermissions(userId);

    // Grant permission
    await db.insert(userPermissions).values({
      userId,
      permissionId: permission.id,
    });

    // Log audit if adminId provided
    if (adminId) {
      const { createPermissionAuditEntry } = await import("./permissionAudit");
      await createPermissionAuditEntry({
        adminId,
        action: "permission_granted",
        userId,
        permissionId: permission.id,
        oldPermissions: oldPerms,
        newPermissions: [...oldPerms, permissionName],
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error granting permission:", error);
    return { success: false, error: "Failed to grant permission" };
  }
}

/**
 * Revoke permission from user
 */
export async function revokePermission(
  userId: string,
  permissionName: string,
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get permission
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, permissionName))
      .limit(1);

    if (!permission) {
      return { success: false, error: "Permission not found" };
    }

    // Get old permissions for audit
    const oldPerms = await getUserPermissions(userId);

    // Revoke permission
    await db
      .delete(userPermissions)
      .where(
        and(
          eq(userPermissions.userId, userId),
          eq(userPermissions.permissionId, permission.id)
        )
      );

    // Log audit if adminId provided
    if (adminId) {
      const { createPermissionAuditEntry } = await import("./permissionAudit");
      await createPermissionAuditEntry({
        adminId,
        action: "permission_revoked",
        userId,
        permissionId: permission.id,
        oldPermissions: oldPerms,
        newPermissions: oldPerms.filter((p) => p !== permissionName),
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error revoking permission:", error);
    return { success: false, error: "Failed to revoke permission" };
  }
}

/**
 * Set user permissions (replace all existing)
 */
export async function setUserPermissions(
  userId: string,
  permissionNames: string[],
  adminId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get all permissions
    const allPermissions = await db
      .select()
      .from(permissions)
      .where(inArray(permissions.name, permissionNames));

    if (allPermissions.length !== permissionNames.length) {
      return { success: false, error: "Some permissions not found" };
    }

    // Get old permissions for audit
    const oldPerms = await getUserPermissions(userId);

    // Delete existing permissions
    await db.delete(userPermissions).where(eq(userPermissions.userId, userId));

    // Insert new permissions
    if (allPermissions.length > 0) {
      await db.insert(userPermissions).values(
        allPermissions.map((p) => ({
          userId,
          permissionId: p.id,
        }))
      );
    }

    // Log audit if adminId provided
    if (adminId) {
      const { createPermissionAuditEntry } = await import("./permissionAudit");
      await createPermissionAuditEntry({
        adminId,
        action: "permission_granted", // Using granted as it's a bulk operation
        userId,
        oldPermissions: oldPerms,
        newPermissions: permissionNames,
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Error setting user permissions:", error);
    return { success: false, error: "Failed to set permissions" };
  }
}

/**
 * Get all permissions grouped by category
 */
export async function getPermissionsByCategory() {
  try {
    const allPermissions = await db
      .select()
      .from(permissions)
      .orderBy(permissions.category, permissions.name);

    const grouped: Record<string, typeof allPermissions> = {};
    for (const perm of allPermissions) {
      if (!grouped[perm.category]) {
        grouped[perm.category] = [];
      }
      grouped[perm.category].push(perm);
    }

    return grouped;
  } catch (error) {
    console.error("Error getting permissions by category:", error);
    return {};
  }
}

