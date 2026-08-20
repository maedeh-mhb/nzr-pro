/**
 * Validation helper functions
 */

import { z } from "zod";

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

