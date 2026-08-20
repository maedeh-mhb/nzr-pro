/**
 * Journal/blog related schemas
 */

import { pgTable, text, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const journalCategories = pgTable("journal_categories", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  name: text("name").notNull(),
  nameFa: text("name_fa"),
  description: text("description"),
  descriptionFa: text("description_fa"),
  order: integer("order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const journalPosts = pgTable("journal_posts", {
  id: text("id").primaryKey().$defaultFn(() => createId()),
  title: text("title").notNull(),
  titleFa: text("title_fa"),
  excerpt: text("excerpt"),
  excerptFa: text("excerpt_fa"),
  content: text("content"),
  contentFa: text("content_fa"),
  image: text("image"),
  categoryId: text("category_id").references(() => journalCategories.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  authorNameFa: text("author_name_fa"),
  readTime: integer("read_time").notNull(), // in minutes
  slug: text("slug").unique(),
  publishDate: timestamp("publish_date"), // Publish date (can be in the future)
  isPublished: boolean("is_published").default(false).notNull(),
  // SEO fields
  seoTitle: text("seo_title"),
  seoTitleFa: text("seo_title_fa"),
  seoDescription: text("seo_description"),
  seoDescriptionFa: text("seo_description_fa"),
  seoKeywords: text("seo_keywords"), // Comma-separated keywords
  seoKeywordsFa: text("seo_keywords_fa"), // Comma-separated keywords in Farsi
  ogImage: text("og_image"), // Open Graph image URL
  pdfUrl: text("pdf_url"), // Downloadable PDF file URL
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

