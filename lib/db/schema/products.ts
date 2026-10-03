/**
 * Product and category related schemas
 */

import { pgTable, text, timestamp, decimal, integer, boolean , varchar } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";
import { productTypeEnum } from "./enums";
import { users } from "./users";
import { sellers } from "./system";

export const categories = pgTable("categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  nameFa: text("name_fa"),
  description: text("description"),
  descriptionFa: text("description_fa"),
  icon: text("icon"), // Optional icon name or emoji
  order: integer("order").default(0).notNull(), // For sorting
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const badges = pgTable("badges", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull().unique(), // English name (e.g., "Sale", "New Arrival")
  nameFa: text("name_fa"), // Farsi name
  color: text("color").notNull(), // Hex color for badge background (e.g., "#FF5733")
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  nameFa: text("name_fa"),
  shortDescription: text("short_description"),
  shortDescriptionFa: text("short_description_fa"),
  longDescription: text("long_description"),
  longDescriptionFa: text("long_description_fa"),
  ingredients: text("ingredients"),
  ingredientsFa: text("ingredients_fa"),
  tags: text("tags"), // Comma-separated tags
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").default(0).notNull(),
  category: text("category").notNull(), // Keep for backward compatibility, can reference categoryId later
  categoryId: text("category_id").references(() => categories.id, { onDelete: "set null" }),
  slug: text("slug").unique(),
  image: text("image"),
  audioUrl: text("audio_url"),
  ogImage: text("og_image"), // Open Graph image URL for social sharing
  badge: text("badge"), // None, Presale, Sale, New Arrival, Out of Stock, Not Available
  productType: productTypeEnum("product_type").default("economic").notNull(), // economic or featured
  minOrderQuantity: integer("min_order_quantity").default(1),
  maxOrderQuantity: integer("max_order_quantity"),
  weight: decimal("weight", { precision: 10, scale: 3 }), // Weight in kg
  volume: decimal("volume", { precision: 10, scale: 3 }), // Volume in liters
  unit: text("unit"), // "weight" | "volume"
  images: text("images"), // JSON array of extra image URLs (up to 2)
  categoryIds: text("category_ids"), // JSON array of category IDs for multi-category support
  rewardPoints: integer("reward_points"), // Reward points per item (null = no reward)
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"), // Comma-separated keywords
  createdAt: timestamp("created_at").defaultNow().notNull(),
  position: integer("position"), // Ordering position (nullable during rollout)
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  sellerId: varchar("seller_id", { length: 128 }).references(() => sellers.id),
});

export const reviews = pgTable("reviews", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  productId: text("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }), // Required - only registered users can review
  reviewerName: text("reviewer_name").notNull(), // Name of reviewer
  reviewText: text("review_text").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(), // Admin must verify before showing
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

