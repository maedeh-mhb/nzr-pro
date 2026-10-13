/**
 * Order related schemas
 */

import { pgTable, text, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

export const orders = pgTable("orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }), // Nullable for guest orders
  orderNumber: text("order_number").notNull().unique(),
  status: text("status").notNull().default("pending"), // pending, processing, delivered, cancelled
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method"), // e.g., "card_to_card", "online_payment", "paypal", "pay_after_delivery"
  paymentVerified: timestamp("payment_verified"), // When admin verified payment (for card_to_card)
  zibalTrackId: text("zibal_track_id"), // Zibal transaction track ID for online payments
  shippingMethod: text("shipping_method").default("iranian_post"), // "iranian_post" or "courier"
  shippingStatus: text("shipping_status"), // "pending", "preparing", "shipped", "in_transit", "delivered", null
  trackingCode: text("tracking_code"), // Tracking code for shipped orders
  discountCodeId: text("discount_code_id"), // Reference to discountCodes - handled via foreign key constraint in database
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }),
  invoiceRequested: boolean("invoice_requested").default(false).notNull(), // Whether user requested invoice
  // Shipping address snapshot (for registered users - guests use guestOrders table)
  shippingProvinceId: integer("shipping_province_id"),
  shippingCityId: integer("shipping_city_id"),
  shippingAddress: text("shipping_address"),
  shippingPostalCode: text("shipping_postal_code"),
  deliveryConfirmedByUser: timestamp("delivery_confirmed_by_user"), // When user confirmed delivery
  deliveryConfirmedAt: timestamp("delivery_confirmed_at"), // When delivery was confirmed (auto-set when deliveryConfirmedByUser is set)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const orderItems = pgTable("order_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: text("product_id").notNull(),
  productName: text("product_name").notNull(),
  productNameFa: text("product_name_fa"), // Add Farsi name column
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull().default(1),
  fulfilledQuantity: integer("fulfilled_quantity").default(0).notNull(), // How many items have been fulfilled/shipped
});

export const orderStatusHistory = pgTable("order_status_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  status: text("status").notNull(), // The status that was set
  changedBy: text("changed_by"), // Admin user ID or "system"
  changedByType: text("changed_by_type").notNull().default("system"), // "admin", "system", "user"
  previousStatus: text("previous_status"), // Previous status before change
  notes: text("notes"), // Optional notes about the change
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const orderNotes = pgTable("order_notes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  note: text("note").notNull(), // The note content
  createdBy: text("created_by").notNull(), // Admin user ID
  isInternal: boolean("is_internal").default(true).notNull(), // true = internal (admin only), false = visible to customer
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const refunds = pgTable("refunds", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // Refund amount
  reason: text("reason").notNull(), // Reason for refund
  status: text("status").notNull().default("pending"), // pending, processed, rejected
  createdBy: text("created_by").notNull(), // Admin user ID who created the refund
  processedBy: text("processed_by"), // Admin user ID who processed the refund
  processedAt: timestamp("processed_at"), // When refund was processed
  notes: text("notes"), // Additional notes
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const idempotencyKeys = pgTable("idempotency_keys", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"), // Optional: clean up old keys after 24 hours
});

export const guestOrders = pgTable("guest_orders", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  orderId: text("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" })
    .unique(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email"),
  guestPhone: text("guest_phone").notNull(),
  provinceId: integer("province_id").notNull(), // ID from provinces JSON
  cityId: integer("city_id").notNull(), // ID from cities JSON
  address: text("address").notNull(), // Complete address text
  postalCode: text("postal_code"), // 10-digit postal code
  editTokenHash: text("edit_token_hash"),
  editExpiresAt: timestamp("edit_expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
