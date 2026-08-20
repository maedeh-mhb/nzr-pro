/**
 * System settings and configuration schemas
 */

import { pgTable, text, timestamp, decimal, integer, boolean, AnyPgColumn } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { categories } from "./products";

export const settings = pgTable("settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  key: text("key").notNull().unique(),
  value: text("value"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const shippingSettings = pgTable("shipping_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  adminProvince: text("admin_province"),
  adminCity: integer("admin_city"), // City ID
  priceAdminProvince: decimal("price_admin_province", { precision: 10, scale: 2 }),
  priceNeighboringProvinces: decimal("price_neighboring_provinces", { precision: 10, scale: 2 }),
  priceOtherProvinces: decimal("price_other_provinces", { precision: 10, scale: 2 }),
  weight1: decimal("weight_1", { precision: 10, scale: 2 }),
  weight1Multiplier: decimal("weight_1_multiplier", { precision: 10, scale: 2 }),
  weight2: decimal("weight_2", { precision: 10, scale: 2 }),
  weight2Multiplier: decimal("weight_2_multiplier", { precision: 10, scale: 2 }),
  weight3: decimal("weight_3", { precision: 10, scale: 2 }),
  weight3Multiplier: decimal("weight_3_multiplier", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const heroSettings = pgTable("hero_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  titleEn: text("title_en"),
  titleFa: text("title_fa"),
  descriptionEn: text("description_en"),
  descriptionFa: text("description_fa"),
  buttonTextEn: text("button_text_en"),
  buttonTextFa: text("button_text_fa"),
  buttonLink: text("button_link"),
  backgroundImageUrl: text("background_image_url"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const socialLinks = pgTable("social_links", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nameEn: text("name_en").notNull(), // English name, e.g., "Facebook"
  nameFa: text("name_fa").notNull(), // Farsi name, e.g., "فیسبوک"
  url: text("url").notNull(),
  icon: text("icon"), // Optional: icon name (e.g., "FaLink", "FaInstagram")
  categoryId: text("category_id").references(() => categories.id, { onDelete: "cascade" }), // Null for user links, category ID for category links
  order: integer("order").default(0).notNull(), // For sorting
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const permissions = pgTable("permissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(), // e.g., "view_users", "edit_users"
  descriptionEn: text("description_en").notNull(),
  descriptionFa: text("description_fa").notNull(),
  category: text("category").notNull(), // e.g., "users", "products", "orders", "settings"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userPermissions = pgTable("user_permissions", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  permissionId: text("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactSettings = pgTable("contact_settings", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  telegram: text("telegram"),
  instagram: text("instagram"),
  whatsapp: text("whatsapp"),
  rubika: text("rubika"),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  addressFa: text("address_fa"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  parentMessageId: text("parent_message_id").references((): AnyPgColumn => contactMessages.id, { onDelete: "cascade" }), // For replies
  reply: text("reply"), // Admin's reply
  replyAt: timestamp("reply_at"), // When admin replied
  isReadByUser: boolean("is_read_by_user").default(false).notNull(), // Whether user has read the reply
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// lib/db/schema/system.ts
// Add this to the existing file after the existing tables

export const sellers = pgTable("sellers", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  nameEn: text("name_en").notNull(),
  nameFa: text("name_fa").notNull(),
  status: text("status").notNull().default("active"), // active, inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const midPageBanner = pgTable("mid_page_banner", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  titleEn: text("title_en"),
  titleFa: text("title_fa"),
  descriptionEn: text("description_en"),
  descriptionFa: text("description_fa"),
  buttonTextEn: text("button_text_en"),
  buttonTextFa: text("button_text_fa"),
  buttonLink: text("button_link"),
  backgroundImageUrl: text("background_image_url"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const instructionsPage = pgTable("instructions_page", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  titleEn: text("title_en"),
  titleFa: text("title_fa"),
  contentEn: text("content_en"),
  contentFa: text("content_fa"),
  audioUrl: text("audio_url"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const instructionCards = pgTable("instruction_cards", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  titleEn: text("title_en").notNull(),
  titleFa: text("title_fa").notNull(),
  imageUrl: text("image_url").notNull(),
  contentEn: text("content_en"),
  contentFa: text("content_fa"),
  audioUrl: text("audio_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const homeNote = pgTable("home_note", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  contentEn: text("content_en"),
  contentFa: text("content_fa"),
  isEnabled: boolean("is_enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
