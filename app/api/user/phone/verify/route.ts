import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, otpCodes } from "@/lib/db/schema";
import { eq, and, gte } from "drizzle-orm";
import { createHash } from "crypto";
import { createActivity } from "@/lib/services/activities";
import { validateCsrfToken } from "@/lib/utils/csrf";
export const dynamic = "force-dynamic";

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
    const body = await request.json();
    const { code, csrfToken: bodyCsrf } = body;

    // CSRF validation (accept header or body token)
    const headerCsrf = request.headers.get("x-csrf-token");
    const csrfToken = headerCsrf || bodyCsrf || null;
    const csrfValid = await validateCsrfToken(request, csrfToken);
    if (!csrfValid) {
      return NextResponse.json(
        { error: "Invalid CSRF token", code: "CSRF_INVALID" },
        { status: 403 }
      );
    }

    // Validate code format
    if (!code || typeof code !== "string" || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json(
        {
          error: "Invalid verification code format. Please enter a 6-digit code.",
          code: "INVALID_CODE_FORMAT",
        },
        { status: 400 }
      );
    }

    // Fetch user
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
          error: "Phone number not found. Please add a phone number to your profile first.",
          code: "PHONE_REQUIRED",
        },
        { status: 400 }
      );
    }

    // Hash the provided OTP
    const codeHash = hashOTP(code);

    // Find matching unexpired unused OTP for this user
    const now = new Date();
    const otpRecord = await db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.otpHash, codeHash),
        eq(otpCodes.used, false),
        gte(otpCodes.expiresAt, now)
      ),
      orderBy: (otpCodes, { desc }) => [desc(otpCodes.createdAt)],
    });

    if (!otpRecord) {
      // Check if OTP exists but is expired
      const expiredOTP = await db.query.otpCodes.findFirst({
        where: and(
          eq(otpCodes.userId, userId),
          eq(otpCodes.otpHash, codeHash),
          eq(otpCodes.used, false)
        ),
      });

      if (expiredOTP) {
        return NextResponse.json(
          {
            error: "Verification code has expired. Please request a new code.",
            code: "OTP_EXPIRED",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: "Invalid verification code. Please check and try again.",
          code: "OTP_INVALID",
        },
        { status: 400 }
      );
    }

    // Verify phone matches user's phone
    if (otpRecord.phone !== user.phone) {
      return NextResponse.json(
        {
          error: "Phone number mismatch.",
          code: "PHONE_MISMATCH",
        },
        { status: 400 }
      );
    }

    // Mark OTP as used
    await db
      .update(otpCodes)
      .set({ used: true })
      .where(eq(otpCodes.id, otpRecord.id));

    // Update user's phoneVerified status
    await db
      .update(users)
      .set({
        phoneVerified: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Create activity
    await createActivity({
      userId,
      activityType: "phone_verified",
      activityData: { verified: true },
    });

    return NextResponse.json({
      success: true,
      message: "Phone number verified successfully",
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return NextResponse.json(
      {
        error: "An error occurred while verifying the code.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}
