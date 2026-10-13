import { NextRequest, NextResponse } from "next/server";
import { createHash, randomInt } from "crypto";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { phoneLoginOtpCodes, users } from "@/lib/db/schema";
import { sendSmsTemplate } from "@/lib/services/sms";
import { validateCsrfToken } from "@/lib/utils/csrf";

export const dynamic = "force-dynamic";

const genericResponse = {
  success: true,
  message: "If an account exists for this phone number, a code has been sent.",
};

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(request: NextRequest) {
  let phase = "reading request";
  try {
    const body = await request.json();
    const csrfToken = request.headers.get("x-csrf-token") || body?.csrfToken;
    phase = "validating CSRF token";
    if (!(await validateCsrfToken(request, csrfToken))) {
      return NextResponse.json(
        { error: "Invalid CSRF token", code: "CSRF_INVALID" },
        { status: 403 }
      );
    }

    const phone = typeof body?.phone === "string" ? body.phone.replace(/\D/g, "") : "";
    if (!/^09\d{9}$/.test(phone)) {
      return NextResponse.json(
        { error: "Enter a valid phone number.", code: "INVALID_PHONE_FORMAT" },
        { status: 400 }
      );
    }

    phase = "looking up account";
    const user = await db.query.users.findFirst({
      where: eq(users.phone, phone),
    });

    if (!user || user.mustChangePassword) {
      return NextResponse.json(genericResponse);
    }

    const now = new Date();
    phase = "checking existing login codes";
    const activeCode = await db.query.phoneLoginOtpCodes.findFirst({
      where: and(
        eq(phoneLoginOtpCodes.userId, user.id),
        eq(phoneLoginOtpCodes.used, false),
        gte(phoneLoginOtpCodes.expiresAt, now)
      ),
    });
    if (activeCode) {
      return NextResponse.json(genericResponse);
    }

    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    phase = "checking login code rate limit";
    const recentCodes = await db
      .select({ count: sql<number>`count(*)` })
      .from(phoneLoginOtpCodes)
      .where(and(
        eq(phoneLoginOtpCodes.userId, user.id),
        gte(phoneLoginOtpCodes.createdAt, oneHourAgo)
      ));
    if (Number(recentCodes[0]?.count || 0) >= 3) {
      return NextResponse.json(genericResponse);
    }

    const code = randomInt(100000, 1000000).toString();
    phase = "saving login code";
    const [otpRecord] = await db
      .insert(phoneLoginOtpCodes)
      .values({
        userId: user.id,
        phone,
        otpHash: hashCode(code),
        expiresAt: new Date(now.getTime() + 2 * 60 * 1000),
      })
      .returning({ id: phoneLoginOtpCodes.id });

    phase = "sending SMS";
    const smsResult = await sendSmsTemplate(
      phone,
      code,
      process.env.SMS_OTP_TEMPLATE_ID,
      "SMS_OTP_TEMPLATE_ID"
    );
    if (!smsResult.success) {
      phase = "cleaning up unsent login code";
      await db.delete(phoneLoginOtpCodes).where(eq(phoneLoginOtpCodes.id, otpRecord.id));
      console.error("Phone login SMS sending failed:", smsResult.error);
      return NextResponse.json(
        { error: "Failed to send the code. Please try again later.", code: smsResult.code || "OTP_SEND_FAILED" },
        { status: smsResult.code === "SMS_NOT_CONFIGURED" ? 503 : 500 }
      );
    }

    return NextResponse.json(genericResponse);
  } catch (error) {
    const typedError = error as {
      code?: unknown;
      cause?: { code?: unknown };
    };
    const databaseErrorCode = typeof typedError.code === "string"
      ? typedError.code
      : typeof typedError.cause?.code === "string"
        ? typedError.cause.code
        : undefined;
    console.error("Error sending phone login code:", { phase, error });

    if (databaseErrorCode === "42P01") {
      return NextResponse.json(
        {
          error: "Phone login is not ready. Please sign in with your password or contact support.",
          code: "OTP_STORAGE_UNAVAILABLE",
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        error: "An error occurred while sending the code.",
        code: "INTERNAL_ERROR",
        phase,
      },
      { status: 500 }
    );
  }
}
