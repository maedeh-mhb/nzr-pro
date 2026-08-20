/**
 * Centralized error handler utilities
 */

import { NextResponse } from "next/server";
import { ApiResponse, errorResponse } from "./apiResponse";

/**
 * Handle errors and return appropriate response
 */
export function handleApiError(
  error: unknown,
  defaultMessage: string = "An error occurred",
  defaultMessageFa: string = "خطایی رخ داد"
): NextResponse<ApiResponse> {
  // Log error for debugging (in production, use proper logging service)
  console.error("API Error:", error);

  // If it's already a NextResponse, return it
  if (error instanceof NextResponse) {
    return error;
  }

  // If it's a known error with message, use it
  if (error instanceof Error) {
    // Don't expose internal error messages in production
    const message = process.env.NODE_ENV === "production" 
      ? defaultMessage 
      : error.message;

    return errorResponse(
      message,
      defaultMessageFa,
      500
    );
  }

  // Unknown error type
  return errorResponse(
    defaultMessage,
    defaultMessageFa,
    500
  );
}

/**
 * Async handler wrapper to catch errors
 */
export function withErrorHandler<T>(
  handler: () => Promise<NextResponse<T>>
): Promise<NextResponse<T | ApiResponse>> {
  return handler().catch((error) => {
    return handleApiError(error) as NextResponse<T | ApiResponse>;
  });
}

/**
 * Create error handler for specific endpoints
 */
export function createErrorHandler(
  defaultMessage: string,
  defaultMessageFa: string
) {
  return (error: unknown) => {
    return handleApiError(error, defaultMessage, defaultMessageFa);
  };
}

