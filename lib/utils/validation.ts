/**
 * Zod validation schemas for API endpoints
 */

import { z } from "zod";
import { isPersianName } from "@/lib/utils/nameValidation";

/**
 * Common field schemas
 */
export const emailSchema = z
  .string()
  .email("Invalid email format")
  .min(1, "Email is required")
  .max(255, "Email is too long")
  .toLowerCase()
  .trim();

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100, "Password is too long");

export const phoneSchema = z.preprocess(
  (val) => {
    if (typeof val === "string" && val.trim() === "") return undefined;
    return val;
  },
  z
    .string()
    .regex(/^09\d{9}$/, "Phone must be 11 digits starting with 09")
    .optional()
    .nullable()
);

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .trim();

export const optionalNameSchema = z
  .string()
  .max(100, "Name is too long")
  .trim()
  .optional()
  .nullable();

export const textSchema = (maxLength: number = 500) =>
  z.string().max(maxLength, `Text exceeds maximum length of ${maxLength}`).trim();

export const optionalTextSchema = (maxLength: number = 500) =>
  z.string().max(maxLength, `Text exceeds maximum length of ${maxLength}`).trim().optional().nullable();

export const urlSchema = z
  .string()
  .url("Invalid URL format")
  .optional()
  .nullable();

export const positiveIntegerSchema = z
  .number()
  .int("Must be an integer")
  .positive("Must be a positive number")
  .optional()
  .nullable();

export const nonNegativeIntegerSchema = z
  .number()
  .int("Must be an integer")
  .nonnegative("Must be zero or positive")
  .optional()
  .nullable();

export const decimalSchema = z
  .number()
  .nonnegative("Must be zero or positive")
  .optional()
  .nullable();

/**
 * API Request Body Schemas
 */

// Signup schema
export const signupSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name is too long")
    .refine(isPersianName, "Name must be written in Persian"),
  surname: z
    .string()
    .trim()
    .min(1, "Family name is required")
    .max(100, "Family name is too long")
    .refine(isPersianName, "Family name must be written in Persian"),
  email: z
    .union([emailSchema, z.literal("")])
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
  password: passwordSchema,
  phone: z.string().regex(/^09\d{9}$/, "Phone must be 11 digits starting with 09"),
});

// Contact form schema
export const contactFormSchema = z.object({
  name: nameSchema,
  phone: z.string().regex(/^09\d{9}$/, "Phone must be 11 digits starting with 09"),
  message: textSchema(2000),
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

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)), // Max 100 items per page
  search: z.string().optional().default(""),
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

/**
 * Helper function to parse and validate request body
 */
export function parseRequestBody<T>(schema: z.ZodSchema<T>, body: unknown): {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  errors?: z.ZodError;
} {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    return {
      success: false,
      error: "Validation failed",
      errors: result.error,
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}

/**
 * Helper function to validate query parameters
 */
export function parseQueryParams<T>(schema: z.ZodSchema<T>, searchParams: URLSearchParams): {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  errors?: z.ZodError;
} {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  
  const result = schema.safeParse(params);
  
  if (!result.success) {
    return {
      success: false,
      error: "Invalid query parameters",
      errors: result.error,
    };
  }
  
  return {
    success: true,
    data: result.data,
  };
}
