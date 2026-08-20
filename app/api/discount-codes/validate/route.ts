import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateDiscountCode } from "@/lib/services/discountCodes";
import { validateOrigin, getOriginValidationError } from "@/lib/utils/validateOrigin";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
import { validateCsrfToken } from "@/lib/utils/csrf";
import { sanitizeDiscountCode, sanitizeNumber } from "@/lib/utils/sanitize";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // 1. Validate request origin
    if (!validateOrigin(request)) {
      const error = getOriginValidationError();
      return NextResponse.json({ error: error.error }, { status: error.status });
    }

    // 2. Rate limiting
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id || null;
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(userId, ipAddress);
    
    const rateLimit = checkRateLimit(identifier, 10, 60 * 60 * 1000); // 10 validations per hour
    if (!rateLimit.allowed) {
      const error = getRateLimitError(rateLimit.resetTime);
      return NextResponse.json(
        { error: error.error },
        { 
          status: error.status,
          headers: {
            "Retry-After": error.retryAfter.toString(),
          },
        }
      );
    }

    // 3. CSRF protection
    const body = await request.json();
    const { code, cartTotal, shippingCost = 0, csrfToken } = body;
    
    const csrfValid = await validateCsrfToken(request, csrfToken);
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid or missing CSRF token" },
        { status: 403 }
      );
    }

    // 4. Input sanitization
    if (!code || cartTotal === undefined) {
      return NextResponse.json(
        { error: "Code and cart total are required" },
        { status: 400 }
      );
    }

    const sanitizedCode = sanitizeDiscountCode(code);
    const sanitizedCartTotal = sanitizeNumber(cartTotal);
    const sanitizedShippingCost = sanitizeNumber(shippingCost);

    if (!sanitizedCode) {
      return NextResponse.json(
        { error: "Invalid discount code format" },
        { status: 400 }
      );
    }

    // Get user ID if logged in
    const userIdForValidation = userId || undefined;

    // Validate the discount code (using sanitized values)
    const validation = await validateDiscountCode({
      code: sanitizedCode,
      userId: userIdForValidation,
      cartTotal: sanitizedCartTotal,
      shippingCost: sanitizedShippingCost,
    });

    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          message: validation.message,
        },
        { status: 200 } // Return 200 even if invalid, so frontend can handle it
      );
    }

    return NextResponse.json({
      valid: true,
      discount_type: validation.discount_type,
      discount_amount: validation.discount_amount,
      free_shipping: validation.discount_type === "free_shipping",
      message: validation.message,
      codeId: validation.codeId,
    });
  } catch (error) {
    console.error("Error validating discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to validate discount code", details: errorMessage },
      { status: 500 }
    );
  }
}

