import { pgTable, varchar, text, boolean, timestamp, decimal } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

export const vendors = pgTable("vendors", {
  id: varchar("id", { length: 128 })
    .primaryKey()
    .$defaultFn(() => createId()),
  name: varchar("name", { length: 255 }).notNull(),
  nameFa: varchar("name_fa", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  addressFa: text("address_fa"),
  contactPerson: varchar("contact_person", { length: 255 }),
  contactPersonFa: varchar("contact_person_fa", { length: 255 }),
  isActive: boolean("is_active").default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});