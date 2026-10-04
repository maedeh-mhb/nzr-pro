import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { registrationOtpCodes, users } from "@/lib/db/schema";
import { and, eq, gte } from "drizzle-orm";
import { createHash } from "crypto";
import bcrypt from "bcryptjs";
import { signupSchema, parseRequestBody } from "@/lib/utils/validation";
import { successResponse, validationErrorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { validateCsrfToken } from "@/lib/utils/csrf";
export const dynamic = "force-dynamic";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const csrfToken = request.headers.get("x-csrf-token") || body?.csrfToken;
    if (!(await validateCsrfToken(request, csrfToken))) {
      return NextResponse.json(
        { success: false, error: "Invalid CSRF token", code: "CSRF_INVALID" },
        { status: 403 }
      );
    }

    // Validate request body with Zod
    const validation = parseRequestBody(signupSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { name, surname, email, password, phone } = validation.data;
    const verificationToken = body?.verificationToken;
    if (typeof verificationToken !== "string" || verificationToken.length !== 64) {
      return NextResponse.json(
        { success: false, error: "Verify your phone number before registering.", code: "PHONE_NOT_VERIFIED" },
        { status: 400 }
      );
    }

    const userName = name;

    if (email) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (existingUser) {
        return NextResponse.json(
          { success: false, error: "User already exists", errorFa: "کاربر با این ایمیل قبلاً ثبت شده است" },
          { status: 400 }
        );
      }
    }

    const existingPhone = await db.query.users.findFirst({
      where: eq(users.phone, phone),
    });

    if (existingPhone) {
      return NextResponse.json(
        { success: false, error: "This phone number is already registered", errorFa: "این شماره موبایل قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await db.transaction(async (tx) => {
      const [verification] = await tx
        .delete(registrationOtpCodes)
        .where(and(
          eq(registrationOtpCodes.phone, phone),
          eq(registrationOtpCodes.verificationTokenHash, hashToken(verificationToken)),
          eq(registrationOtpCodes.used, true),
          gte(registrationOtpCodes.expiresAt, new Date())
        ))
        .returning({ id: registrationOtpCodes.id });

      if (!verification) return null;

      const [createdUser] = await tx.insert(users).values({
        name: userName,
        surname,
        email: email || null,
        password: hashedPassword,
        phone,
        phoneVerified: new Date(),
      }).returning();
      return createdUser;
    });

    if (!newUser) {
      return NextResponse.json(
        { success: false, error: "Phone verification expired. Please verify your phone again.", code: "PHONE_VERIFICATION_EXPIRED" },
        { status: 400 }
      );
    }

    return successResponse(
      { id: newUser.id, email: newUser.email },
      "User created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, "Failed to create user", "خطا در ایجاد کاربر");
  }
}
