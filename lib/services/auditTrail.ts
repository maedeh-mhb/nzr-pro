/**
 * Comprehensive Audit Trail Service
 */

import { db } from "@/lib/db";
import { auditTrail } from "@/lib/db/schema-audit";
import { eq, desc, and, gte, lte, like, or } from "drizzle-orm";

export type AuditAction =
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "order_created"
  | "order_updated"
  | "order_status_changed"
  | "order_cancelled"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "permission_granted"
  | "permission_revoked"
  | "role_changed"
  | "settings_updated"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "journal_post_created"
  | "journal_post_updated"
  | "journal_post_deleted"
  | "discount_code_created"
  | "discount_code_updated"
  | "discount_code_deleted"
  | "inventory_updated"
  | "refund_created"
  | "refund_processed"
  | "refund_rejected";

export type EntityType =
  | "product"
  | "order"
  | "user"
  | "permission"
  | "role"
  | "settings"
  | "category"
  | "journal_post"
  | "discount_code"
  | "inventory"
  | "refund";

interface CreateAuditEntryParams {
  adminId: string;
  action: AuditAction;
  entityType: EntityType;
  entityId?: string;
  description: string;
  descriptionFa?: string;
  beforeState?: Record<string, any>;
  afterState?: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  canRollback?: boolean;
}

/**
 * Create an audit trail entry
 */
export async function createAuditEntry({
  adminId,
  action,
  entityType,
  entityId,
  description,
  descriptionFa,
  beforeState,
  afterState,
  metadata,
  canRollback = false,
}: CreateAuditEntryParams) {
  try {
    const [entry] = await db
      .insert(auditTrail)
      .values({
        adminId,
        action,
        entityType,
        entityId,
        description,
        descriptionFa,
        beforeState: beforeState ? JSON.stringify(beforeState) : null,
        afterState: afterState ? JSON.stringify(afterState) : null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        canRollback,
      })
      .returning();

    return { success: true, entry };
  } catch (error) {
    console.error("Error creating audit entry:", error);
    return { success: false, error };
  }
}

/**
 * Get audit trail entries with filtering
 */
export async function getAuditTrail({
  adminId,
  action,
  entityType,
  entityId,
  startDate,
  endDate,
  search,
  limit = 50,
  offset = 0,
}: {
  adminId?: string;
  action?: AuditAction;
  entityType?: EntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  try {
    const conditions = [];

    if (adminId) {
      conditions.push(eq(auditTrail.adminId, adminId));
    }
    if (action) {
      conditions.push(eq(auditTrail.action, action));
    }
    if (entityType) {
      conditions.push(eq(auditTrail.entityType, entityType));
    }
    if (entityId) {
      conditions.push(eq(auditTrail.entityId, entityId));
    }
    if (startDate) {
      conditions.push(gte(auditTrail.createdAt, startDate));
    }
    if (endDate) {
      conditions.push(lte(auditTrail.createdAt, endDate));
    }
    if (search) {
      conditions.push(
        or(
          like(auditTrail.description, `%${search}%`),
          like(auditTrail.descriptionFa, `%${search}%`),
          like(auditTrail.entityId, `%${search}%`)
        )!
      );
    }

    const entries = await db
      .select()
      .from(auditTrail)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditTrail.createdAt))
      .limit(limit)
      .offset(offset);

    const total = await db
      .select()
      .from(auditTrail)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      success: true,
      entries: entries.map((entry) => ({
        ...entry,
        beforeState: entry.beforeState ? JSON.parse(entry.beforeState as string) : null,
        afterState: entry.afterState ? JSON.parse(entry.afterState as string) : null,
        metadata: entry.metadata ? JSON.parse(entry.metadata as string) : null,
      })),
      total: total.length,
    };
  } catch (error) {
    console.error("Error fetching audit trail:", error);
    return { success: false, error, entries: [], total: 0 };
  }
}

/**
 * Get a single audit entry by ID
 */
export async function getAuditEntry(id: string) {
  try {
    const [entry] = await db
      .select()
      .from(auditTrail)
      .where(eq(auditTrail.id, id))
      .limit(1);

    if (!entry) {
      return { success: false, error: "Entry not found" };
    }

    return {
      success: true,
      entry: {
        ...entry,
        beforeState: entry.beforeState ? JSON.parse(entry.beforeState as string) : null,
        afterState: entry.afterState ? JSON.parse(entry.afterState as string) : null,
        metadata: entry.metadata ? JSON.parse(entry.metadata as string) : null,
      },
    };
  } catch (error) {
    console.error("Error fetching audit entry:", error);
    return { success: false, error };
  }
}

/**
 * Rollback an action (if possible)
 */
export async function rollbackAuditEntry(
  entryId: string,
  rolledBackBy: string
) {
  try {
    const entryResult = await getAuditEntry(entryId);
    if (!entryResult.success || !entryResult.entry) {
      return { success: false, error: "Entry not found" };
    }

    const entry = entryResult.entry;

    if (!entry.canRollback) {
      return { success: false, error: "This action cannot be rolled back" };
    }

    if (entry.rolledBack) {
      return { success: false, error: "This action has already been rolled back" };
    }

    if (!entry.beforeState) {
      return { success: false, error: "No previous state available for rollback" };
    }

    // Mark as rolled back
    await db
      .update(auditTrail)
      .set({
        rolledBack: true,
        rolledBackAt: new Date(),
        rolledBackBy,
      })
      .where(eq(auditTrail.id, entryId));

    // Return the before state for the caller to restore
    return {
      success: true,
      beforeState: entry.beforeState,
      entityType: entry.entityType,
      entityId: entry.entityId,
    };
  } catch (error) {
    console.error("Error rolling back audit entry:", error);
    return { success: false, error };
  }
}

