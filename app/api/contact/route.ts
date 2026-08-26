import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactMessages } from "@/lib/db/schema";
import { contactFormSchema, parseRequestBody } from "@/lib/utils/validation";
import { successResponse, validationErrorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
export const dynamic = "force-dynamic";

// POST: Submit contact form
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    // Rate limit contact form submissions (userId or IP)
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(session?.user?.id || null, ipAddress);
    const rate = checkRateLimit(identifier, 5, 60 * 1000); // 5 submissions per minute
    if (!rate.allowed) {
      const err = getRateLimitError(rate.resetTime);
      return NextResponse.json({ success: false, error: err.error, retryAfter: err.retryAfter }, { status: err.status });
    }
    const body = await request.json();

    // Validate request body with Zod
    const validation = parseRequestBody(contactFormSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { name, phone, message, captcha } = validation.data;

    // Verify CAPTCHA
    const storedCaptcha = request.cookies.get("captcha")?.value;
    if (!storedCaptcha || storedCaptcha !== captcha) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid CAPTCHA. Please try again.",
          errorFa: "کد امنیتی نامعتبر است. لطفاً دوباره تلاش کنید."
        },
        { status: 400 }
      );
    }

    // Normalize phone number (remove non-digits)
    const normalizedPhone = phone ? String(phone).replace(/\D/g, "") : null;

    // Create contact message
    await db
      .insert(contactMessages)
      .values({
        userId: session?.user?.id || null,
        name,
        phone: normalizedPhone,
        message,
        isRead: false,
      })
      .returning();

    // Clear CAPTCHA cookie after successful submission
    const response = successResponse(
      null,
      "Your message has been sent successfully!"
    );
    response.cookies.delete("captcha");

    return response;
  } catch (error) {
    return handleApiError(error, "Failed to submit contact form", "خطا در ارسال پیام");
  }
}

