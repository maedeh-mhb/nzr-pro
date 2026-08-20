/**
 * Payment and discount code related schemas
 */

import { pgTable, text, timestamp, decimal, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { discountCodeTypeEnum, discountTypeEnum } from "./enums";
import { users } from "./users";

export const paymentSettings = pgTable("payment_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  // Card to Card Transfer
  cardToCardEnabled: boolean("card_to_card_enabled").default(false).notNull(),
  // Online Payment
  onlinePaymentEnabled: boolean("online_payment_enabled").default(false).notNull(),
  onlinePaymentProvider: text("online_payment_provider"), // e.g., "stripe", "paypal", etc.
  onlinePaymentApiKey: text("online_payment_api_key"),
  onlinePaymentSecretKey: text("online_payment_secret_key"),
  onlinePaymentMerchantId: text("online_payment_merchant_id"),
  // Pay After Delivery
  payAfterDeliveryEnabled: boolean("pay_after_delivery_enabled").default(false).notNull(),
  payAfterDeliveryMaxAmount: decimal("pay_after_delivery_max_amount", { precision: 10, scale: 2 }),
  payAfterDeliveryRequireVerification: boolean("pay_after_delivery_require_verification").default(false),
  // PayPal
  paypalEnabled: boolean("paypal_enabled").default(false).notNull(),
  paypalClientId: text("paypal_client_id"),
  paypalSecretKey: text("paypal_secret_key"),
  paypalMode: text("paypal_mode"), // "sandbox" or "live"
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bankSettings = pgTable("bank_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  bankName: text("bank_name").notNull(),
  cardNumber: text("card_number").notNull(), // 16-digit card number
  cardHolder: text("card_holder").notNull(),
  iban: text("iban"), // Optional
  order: integer("order").default(0).notNull(), // For sorting
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const discountCodes = pgTable("discount_codes", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  code: text("code").notNull().unique(),
  type: discountCodeTypeEnum("type").notNull(), // global or personal
  discountType: discountTypeEnum("discount_type").notNull(), // percentage, fixed_amount, free_shipping
  discountValue: decimal("discount_value", { precision: 10, scale: 2 }), // null for free_shipping
  minPurchaseAmount: decimal("min_purchase_amount", { precision: 10, scale: 2 }),
  maxDiscountAmount: decimal("max_discount_amount", { precision: 10, scale: 2 }), // only for percentage
  usageLimit: integer("usage_limit"), // total times code can be used
  usageCount: integer("usage_count").default(0).notNull(),
  userLimit: integer("user_limit"), // times a single user can use it
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isRewardGenerated: boolean("is_reward_generated").default(false).notNull(), // True if generated from reward point conversion
  description: text("description"), // English description
  descriptionFa: text("description_fa"), // Farsi description
  createdBy: text("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const discountCodeUsers = pgTable("discount_code_users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  discountCodeId: text("discount_code_id")
    .notNull()
    .references(() => discountCodes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const discountCodeUsages = pgTable("discount_code_usages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  discountCodeId: text("discount_code_id")
    .notNull()
    .references(() => discountCodes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" }), // nullable for guest orders
  orderId: text("order_id").notNull(), // Reference to orders - handled via foreign key constraint in database
  discountAmount: decimal("discount_amount", { precision: 10, scale: 2 }).notNull(),
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

