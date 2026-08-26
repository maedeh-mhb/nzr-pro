/**
 * API request body validation schemas
 */

import { z } from "zod";
import {
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  optionalNameSchema,
  optionalTextSchema,
  urlSchema,
  positiveIntegerSchema,
  nonNegativeIntegerSchema,
} from "./common";

// Signup schema
export const signupSchema = z.object({
  name: optionalNameSchema,
  email: emailSchema,
  password: passwordSchema,
  phone: phoneSchema,
});

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  phone: z.string().regex(/^09\d{9}$/, "Phone must be 11 digits starting with 09"),
  message: z.string().max(2000, "Message exceeds maximum length of 2000").trim(),
  captcha: z.string().min(1, "CAPTCHA is required"),
});

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token is required"),
  password: passwordSchema,
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: passwordSchema,
});

// Product creation/update schema (basic - can be extended)
export const productSchema = z.object({
  name: nameSchema,
  nameFa: optionalTextSchema(200),
  shortDescription: optionalTextSchema(500),
  shortDescriptionFa: optionalTextSchema(500),
  longDescription: optionalTextSchema(5000),
  longDescriptionFa: optionalTextSchema(5000),
  price: z.string().or(z.number()).transform((val) => {
    if (typeof val === "string") {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) throw new Error("Price must be a positive number");
      return num.toString();
    }
    if (val < 0) throw new Error("Price must be a positive number");
    return val.toString();
  }),
  quantity: nonNegativeIntegerSchema,
  category: z.string().min(1, "Category is required"),
  slug: optionalTextSchema(200),
  image: urlSchema,
  badge: z
    .enum(["None", "Presale", "Sale", "New Arrival", "Out of Stock", "Not Available"])
    .optional()
    .nullable(),
  productType: z.enum(["economic", "featured"]).optional().nullable(),
  minOrderQuantity: positiveIntegerSchema,
  maxOrderQuantity: positiveIntegerSchema,
});

