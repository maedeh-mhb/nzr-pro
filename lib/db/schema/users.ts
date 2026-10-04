/**
 * User and authentication related schemas
 */

import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { userRoleEnum } from "./enums";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  surname: text("surname"),
  email: text("email").unique(),
  phone: text("phone").unique(),
  emailVerified: timestamp("email_verified"),
  phoneVerified: timestamp("phone_verified"),
  image: text("image"),
  password: text("password"),
  role: userRoleEnum("role").default("user").notNull(),
  mustChangePassword: boolean("must_change_password").default(false).notNull(),
  // Address fields
  address: text("address"),
  city: text("city"),
  state: text("state"), // Province
  zipCode: text("zip_code"), // Post code
  country: text("country"),
  // User-specific payment method overrides (null = use global settings, true/false = override)
  cardToCardEnabled: boolean("card_to_card_enabled"),
  onlinePaymentEnabled: boolean("online_payment_enabled"),
  payAfterDeliveryEnabled: boolean("pay_after_delivery_enabled"),
  paypalEnabled: boolean("paypal_enabled"),
  // Reward points
  totalPoints: integer("total_points").default(0).notNull(), // Total accumulated reward points
  // Password reset
  resetToken: text("reset_token"), // Password reset token
  resetTokenExpiry: timestamp("reset_token_expiry"), // Token expiration timestamp
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  provider: text("provider").notNull(),
  providerAccountId: text("provider_account_id").notNull(),
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires").notNull(),
});

export const verificationTokens = pgTable("verification_tokens", {
  identifier: text("identifier").notNull(),
  token: text("token").notNull(),
  expires: timestamp("expires").notNull(),
});
