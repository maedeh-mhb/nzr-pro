/**
 * Permission Audit Log Service
 */

import { db } from "@/lib/db";
import { permissionAuditLog } from "@/lib/db/schema-audit";
import { desc, eq, and, gte, lte } from "drizzle-orm";

export type PermissionAction = "permission_granted" | "permission_revoked" | "role_changed";

interface CreatePermissionAuditParams {
  adminId: string;
  action: PermissionAction;
  userId: string;
  permissionId?: string;
  oldRole?: string;
  newRole?: string;
  oldPermissions?: string[];
  newPermissions?: string[];
  reason?: string;
}

/**
 * Create a permission audit log entry
 */
export async function createPermissionAuditEntry({
  adminId,
  action,
  userId,
  permissionId,
  oldRole,
  newRole,
  oldPermissions,
  newPermissions,
  reason,
}: CreatePermissionAuditParams) {
  try {
    await db.insert(permissionAuditLog).values({
      adminId,
      action,
      userId,
      permissionId,
      oldRole,
      newRole,
      oldPermissions: oldPermissions ? JSON.stringify(oldPermissions) : null,
      newPermissions: newPermissions ? JSON.stringify(newPermissions) : null,
      reason,
    });

    return { success: true };
  } catch (error) {
    console.error("Error creating permission audit entry:", error);
    return { success: false, error };
  }
}

/**
 * Get permission audit log entries
 */
export async function getPermissionAuditLog({
  adminId,
  userId,
  action,
  startDate,
  endDate,
  limit = 50,
  offset = 0,
}: {
  adminId?: string;
  userId?: string;
  action?: PermissionAction;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions = [];

    if (adminId) {
      conditions.push(eq(permissionAuditLog.adminId, adminId));
    }
    if (userId) {
      conditions.push(eq(permissionAuditLog.userId, userId));
    }
    if (action) {
      conditions.push(eq(permissionAuditLog.action, action));
    }
    if (startDate) {
      conditions.push(gte(permissionAuditLog.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(permissionAuditLog.createdAt, endDate));
    }

    const entries = await db
      .select()
      .from(permissionAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(permissionAuditLog.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select()
      .from(permissionAuditLog)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      success: true,
      entries: entries.map((entry) => ({
        ...entry,
        oldPermissions: entry.oldPermissions
          ? JSON.parse(entry.oldPermissions as string)
          : null,
        newPermissions: entry.newPermissions
          ? JSON.parse(entry.newPermissions as string)
          : null,
      })),
      total: total.length,
    };
  } catch (error) {
    console.error("Error fetching permission audit log:", error);
    return { success: false, error, entries: [], total: 0 };
  }
}

