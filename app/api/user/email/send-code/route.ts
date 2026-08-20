import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, emailOtpCodes, contactSettings } from "@/lib/db/schema";
import { eq, and, gte, lt, sql } from "drizzle-orm";
import { createHash, randomInt } from "crypto";
import { sendVerificationEmail } from "@/lib/services/email";
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

    // Fetch user to get email
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "USER_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error: "Email address is required. Please add an email address to your profile first.",
          code: "EMAIL_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Check if email is already verified (prevent re-verification)
    if (user.emailVerified) {
      return NextResponse.json(
        {
          error: "Email address is already verified.",
          code: "EMAIL_ALREADY_VERIFIED",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    // Clean up expired OTPs for this user (housekeeping)
    await db
      .delete(emailOtpCodes)
      .where(
        and(
          eq(emailOtpCodes.userId, userId),
          lt(emailOtpCodes.expiresAt, now)
        )
      );

    // Rate limiting: Check if unexpired unused OTP exists
    const existingOTPs = await db.query.emailOtpCodes.findMany({
      where: and(
        eq(emailOtpCodes.userId, userId),
        eq(emailOtpCodes.used, false),
        gte(emailOtpCodes.expiresAt, now)
      ),
      orderBy: (emailOtpCodes, { desc }) => [desc(emailOtpCodes.createdAt)],
    });

    // Allow re-requesting if the last OTP was created more than 1 minute ago
    // This prevents immediate spam but allows retries after failures
    if (existingOTPs.length > 0) {
      const mostRecentOTP = existingOTPs[0];
      const timeSinceLastOTP = now.getTime() - mostRecentOTP.createdAt.getTime();
      const oneMinute = 60 * 1000; // 1 minute in milliseconds

      if (timeSinceLastOTP < oneMinute) {
        return NextResponse.json(
          {
            error: "Please wait before requesting a new verification code.",
            code: "RATE_LIMIT_EXCEEDED",
          },
          { status: 429 }
        );
      }
      // If more than 1 minute has passed, we'll delete all old unexpired OTPs and create a new one
    }

    // Rate limiting: Check max 3 unexpired OTPs per hour
    // Only count OTPs that are still valid (not expired) to allow retries after failures
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentUnexpiredOTPs = await db
      .select({ count: sql<number>`count(*)` })
      .from(emailOtpCodes)
      .where(
        and(
          eq(emailOtpCodes.userId, userId),
          eq(emailOtpCodes.used, false),
          gte(emailOtpCodes.createdAt, oneHourAgo),
          gte(emailOtpCodes.expiresAt, now) // Only count unexpired OTPs
        )
      );

    const otpCount = Number(recentUnexpiredOTPs[0]?.count || 0);
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
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes

    // Fetch contact settings for email template
    const contactSettingsData = await db
      .select()
      .from(contactSettings)
      .limit(1);

    const contactInfo = contactSettingsData[0] || {};

    // Send verification email first
    const emailResult = await sendVerificationEmail({
      to: user.email,
      name: user.name || "User",
      verificationCode: otp,
      telegram: contactInfo.telegram || null,
      instagram: contactInfo.instagram || null,
      whatsapp: contactInfo.whatsapp || null,
      address: contactInfo.address || null,
      addressFa: contactInfo.addressFa || null,
      email: contactInfo.email || null,
      language: "en", // Default to English, can be enhanced later with user preference
    });

    // Only save OTP to database if email was sent successfully
    if (!emailResult.success) {
      console.error("Email sending failed:", emailResult.error);
      return NextResponse.json(
        {
          error: "Failed to send verification code. Please try again later.",
          code: "OTP_SEND_FAILED",
        },
        { status: 500 }
      );
    }

    // Delete any existing unexpired OTPs for this user (user requested a new code)
    // This ensures we only have one active OTP at a time
    if (existingOTPs.length > 0) {
      await db
        .delete(emailOtpCodes)
        .where(
          and(
            eq(emailOtpCodes.userId, userId),
            eq(emailOtpCodes.used, false),
            gte(emailOtpCodes.expiresAt, now)
          )
        );
    }

    // Save OTP to database only after successful email send
    await db.insert(emailOtpCodes).values({
      userId: userId,
      email: user.email,
      otpHash: otpHash,
      expiresAt: expiresAt,
      used: false,
    });

    return NextResponse.json({
      success: true,
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Error sending email OTP:", error);
    return NextResponse.json(
      {
        error: "An error occurred while sending the verification code.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

