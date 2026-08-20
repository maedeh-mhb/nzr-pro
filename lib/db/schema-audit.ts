/**
 * Audit Trail Schema Extensions
 * This file contains schema definitions for comprehensive audit trail system
 */

import { pgTable, text, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users, permissions } from "./schema";

/**
 * Comprehensive audit trail table
 * Stores all admin actions with full context for rollback capability
 */
export const auditTrail = pgTable("audit_trail", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // e.g., "product_created", "order_status_changed"
  entityType: text("entity_type").notNull(), // e.g., "product", "order", "user"
  entityId: text("entity_id"), // ID of the affected entity
  description: text("description").notNull(), // Human-readable description
  descriptionFa: text("description_fa"), // Farsi description
  // Store the state before the action (for rollback)
  beforeState: jsonb("before_state"), // JSON object of previous state
  // Store the state after the action
  afterState: jsonb("after_state"), // JSON object of new state
  // Additional metadata
  metadata: jsonb("metadata"), // IP address, user agent, etc.
  // Rollback information
  canRollback: boolean("can_rollback").default(false).notNull(),
  rolledBack: boolean("rolled_back").default(false).notNull(),
  rolledBackAt: timestamp("rolled_back_at"),
  rolledBackBy: text("rolled_back_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/**
 * Permission audit log
 * Tracks all permission changes
 */
export const permissionAuditLog = pgTable("permission_audit_log", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(), // "permission_granted", "permission_revoked", "role_changed"
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").references(() => permissions.id, { onDelete: "set null" }),
  oldRole: text("old_role"), // Previous role
  newRole: text("new_role"), // New role
  oldPermissions: jsonb("old_permissions"), // Array of permission IDs
  newPermissions: jsonb("new_permissions"), // Array of permission IDs
  reason: text("reason"), // Optional reason for the change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

