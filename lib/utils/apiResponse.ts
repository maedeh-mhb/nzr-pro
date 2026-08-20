/**
 * Standardized API response format utilities
 */

import { NextResponse } from "next/server";

/**
 * Standard API response format
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errorFa?: string;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Create a success response
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create an error response
 */
export function errorResponse(
  error: string,
  errorFa?: string,
  status: number = 400
): NextResponse<ApiResponse> {
  const response: ApiResponse = {
    success: false,
    error,
  };

  if (errorFa) {
    response.errorFa = errorFa;
  }

  return NextResponse.json(response, { status });
}

/**
 * Create a paginated response
 */
export function paginatedResponse<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message?: string
): NextResponse<ApiResponse<T[]>> {
  const totalPages = Math.ceil(total / limit);
  const hasNext = page < totalPages;
  const hasPrev = page > 1;

  const response: ApiResponse<T[]> = {
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext,
      hasPrev,
    },
  };

  if (message) {
    response.message = message;
  }

  return NextResponse.json(response);
}

/**
 * Create a validation error response from Zod errors
 */
export function validationErrorResponse(
  errors: any, // ZodError
  status: number = 400
): NextResponse<ApiResponse> {
  // Format Zod errors into a readable message
  const errorMessages = errors.errors?.map((err: any) => {
    const path = err.path?.join(".") || "field";
    return `${path}: ${err.message}`;
  }) || ["Validation failed"];

  const errorMessage = errorMessages.join(", ");

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      errorFa: "خطا در اعتبارسنجی داده‌ها",
    },
    { status }
  );
}

