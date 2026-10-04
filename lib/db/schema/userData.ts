/**
 * User data and activity related schemas
 */

import { pgTable, text, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { products } from "./products";
import { orders } from "./orders";

export const addresses = pgTable("addresses", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(), // User-defined name for the address
  provinceId: integer("province_id").notNull(), // ID from provinces JSON
  cityId: integer("city_id").notNull(), // ID from cities JSON
  address: text("address").notNull(), // Full address text
  postalCode: text("postal_code").notNull(), // 10-digit postal code
  country: text("country").notNull().default("Iran"), // Fixed to Iran
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const otpCodes = pgTable("otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  phone: text("phone").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const registrationOtpCodes = pgTable("registration_otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  phone: text("phone").notNull(),
  otpHash: text("otp_hash").notNull(),
  verificationTokenHash: text("verification_token_hash"),
  expiresAt: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailOtpCodes = pgTable("email_otp_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  otpHash: text("otp_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // credit, debit
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  orderId: text("order_id"), // Reference to orders - handled via foreign key constraint in database
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  titleFa: text("title_fa"),
  message: text("message").notNull(),
  messageFa: text("message_fa"),
  type: text("type").notNull(), // cart_reminder, order_pending, order_shipped, order_delivered, etc.
  isRead: boolean("is_read").default(false),
  dismissed: boolean("dismissed").default(false).notNull(),
  notificationData: text("notification_data"), // JSON string for metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const adminNotificationReads = pgTable("admin_notification_reads", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  notificationId: text("notification_id").notNull(),
  adminUserId: text("admin_user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userActivities = pgTable("user_activities", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // phone_verified, order_placed, address_added, etc.
  activityData: text("activity_data"), // JSON string for minimal metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const adminActivities = pgTable("admin_activities", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  adminId: text("admin_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: text("activity_type").notNull(), // product_created, product_updated, order_status_changed, etc.
  activityData: text("activity_data"), // JSON string for minimal metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const wishlist = pgTable("wishlist", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cartItems = pgTable("cart_items", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const rewardHistory = pgTable("reward_history", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  orderId: text("order_id").notNull(), // Reference to orders - handled via foreign key constraint in database
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  productName: text("product_name").notNull(), // Store product name at time of reward
  points: integer("points").notNull(), // Points earned (reward per item × quantity)
  quantity: integer("quantity").notNull(), // Quantity purchased
  rewardPerItem: integer("reward_per_item").notNull(), // Reward points per item
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const inventoryReservations = pgTable("inventory_reservations", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "cascade" }), // Nullable for guest reservations
  sessionId: text("session_id"), // For guest reservations (session-based)
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(), // Reserved quantity
  expiresAt: timestamp("expires_at").notNull(), // Reservation expiration (typically 15-30 minutes)
  orderId: text("order_id"), // Reference to orders - handled via foreign key constraint in database
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
