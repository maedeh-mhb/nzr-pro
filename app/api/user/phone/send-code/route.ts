import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, otpCodes } from "@/lib/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { randomInt } from "crypto";
import { validateCsrfToken } from "@/lib/utils/csrf";
export const dynamic = "force-dynamic";

// Generate 6-digit OTP (100000-999999)
function generateOTP(): string {
  return randomInt(100000, 999999).toString();
}

// Hash OTP using SHA-256
function hashOTP(otp: string): string {
  return createHash("sha256").update(otp).digest("hex");
}

// Validate phone format (09XXXXXXXXX)
function isValidPhoneFormat(phone: string): boolean {
  const phoneDigits = phone.replace(/\D/g, "");
  return phoneDigits.length === 11 && phoneDigits.startsWith("09");
}

// Send SMS via s.api.ir
async function sendSMS(phone: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const apiToken = process.env.SMS_API_TOKEN;
    const apiBaseUrl = process.env.SMS_API_BASE_URL || "https://s.api.ir/api/sw1/SmsOTP";
    const templateId = process.env.SMS_OTP_TEMPLATE_ID;

    if (!apiToken || !templateId) {
      console.error("SMS API configuration missing");
      return { success: false, error: "SMS service not configured" };
    }

    const response = await fetch(apiBaseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        mobile: phone,
        code: code,
        template: templateId,
      }),
    });

    // Check HTTP status
    if (!response.ok) {
      const errorText = await response.text();
      console.error("SMS API HTTP error:", response.status, errorText);
      return { success: false, error: `SMS API returned status ${response.status}` };
    }

    // Parse and validate response
    let responseData;
    try {
      responseData = await response.json();
    } catch (parseError) {
      console.error("SMS API response parse error:", parseError);
      return { success: false, error: "Invalid response from SMS API" };
    }

    // Check success flag
    if (responseData.success !== true) {
      console.error("SMS API returned failure:", responseData);
      return { success: false, error: responseData.error || "SMS sending failed" };
    }

    return { success: true };
  } catch (error) {
    console.error("SMS API request error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // CSRF validation: accept token from header or JSON body
    let csrfToken = request.headers.get("x-csrf-token") || null;
    if (!csrfToken) {
      try {
        const maybeBody = await request.clone().json();
        csrfToken = maybeBody?.csrfToken || null;
      } catch { }
    }

    const csrfValid = await validateCsrfToken(request, csrfToken);
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid CSRF token", code: "CSRF_INVALID" },
        { status: 403 }
      );
    }

    // Fetch user to get phone number
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!user.phone) {
      return NextResponse.json(
        {
          error: "Phone number is required. Please add a phone number to your profile first.",
          code: "PHONE_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!isValidPhoneFormat(user.phone)) {
      return NextResponse.json(
        {
          error: "Invalid phone number format. Phone must be 11 digits starting with 09.",
          code: "INVALID_PHONE_FORMAT",
        },
        { status: 400 }
      );
    }

    // Check if phone is already verified (prevent re-verification)
    if (user.phoneVerified) {
      return NextResponse.json(
        {
          error: "Phone number is already verified and cannot be changed.",
          code: "PHONE_ALREADY_VERIFIED",
        },
        { status: 400 }
      );
    }

    // Rate limiting: Check if unexpired unused OTP exists
    const now = new Date();
    const existingOTP = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.used, false),
        gte(otpCodes.expiresAt, now)
      ),
      orderBy: (otpCodes, { desc }) => [desc(otpCodes.createdAt)],
    });

    if (existingOTP) {
      return NextResponse.json(
        {
          error: "Please wait before requesting a new verification code.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Rate limiting: Check max 3 OTPs per hour
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentOTPs = await db
      .select({ count: sql<number>`count(*)` })
      .from(otpCodes)
      .where(
        and(
          eq(otpCodes.userId, userId),
          gte(otpCodes.createdAt, oneHourAgo)
        )
      );

    const otpCount = Number(recentOTPs[0]?.count || 0);
    if (otpCount >= 3) {
      return NextResponse.json(
        {
          error: "Too many verification requests. Please try again later.",
          code: "RATE_LIMIT_EXCEEDED",
        },
        { status: 429 }
      );
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);
    const expiresAt = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes

    // Save OTP to database
    await db.insert(otpCodes).values({
      userId: userId,
      phone: user.phone,
      otpHash: otpHash,
      expiresAt: expiresAt,
      used: false,
    });

    // Send SMS
    const smsResult = await sendSMS(user.phone, otp);

    if (!smsResult.success) {
      // Log error but don't expose internal details
      console.error("SMS sending failed:", smsResult.error);
      return NextResponse.json(
        {
          error: "Failed to send verification code. Please try again later.",
          code: "OTP_SEND_FAILED",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Error sending OTP:", error);
    return NextResponse.json(
      {
        error: "An error occurred while sending verification code.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
