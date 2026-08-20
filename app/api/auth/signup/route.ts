import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signupSchema, parseRequestBody } from "@/lib/utils/validation";
import { successResponse, validationErrorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = parseRequestBody(signupSchema, body);
    if (!validation.success) {
      return validationErrorResponse(validation.errors);
    }

    const { name, email, password, phone } = validation.data;

    // Use email prefix as default name if not provided
    const userName = name || email.split("@")[0];

    // Check if user already exists by email
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already exists", errorFa: "کاربر با این ایمیل قبلاً ثبت شده است" },
        { status: 400 }
      );
    }

    // Check if phone number is already registered
    if (phone) {
      const existingPhone = await db.query.users.findFirst({
        where: eq(users.phone, String(phone)),
      });

      if (existingPhone) {
        return NextResponse.json(
          { success: false, error: "This phone number is already registered", errorFa: "این شماره موبایل قبلاً ثبت شده است" },
          { status: 400 }
        );
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await db.insert(users).values({
      name: userName,
      email,
      password: hashedPassword,
      phone: phone ? String(phone) : null,
    }).returning();

    return successResponse(
      { id: newUser[0].id, email: newUser[0].email },
      "User created successfully",
      201
    );
  } catch (error) {
    return handleApiError(error, "Failed to create user", "خطا در ایجاد کاربر");
  }
}

