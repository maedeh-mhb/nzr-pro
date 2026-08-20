/**
 * Common field validation schemas
 */

import { z } from "zod";

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

