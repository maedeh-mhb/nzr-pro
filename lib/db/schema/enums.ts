/**
 * Database enum definitions
 */

import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["user", "admin", "superadmin"]);
export const productTypeEnum = pgEnum("product_type", ["economic", "featured"]);
export const discountCodeTypeEnum = pgEnum("discount_code_type", ["global", "personal"]);
export const discountTypeEnum = pgEnum("discount_type", ["percentage", "fixed_amount", "free_shipping"]);

