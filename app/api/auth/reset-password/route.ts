import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { API_ERRORS } from "@/lib/utils/apiErrors";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, email, password } = body;

    if ((!token && !email) || !password) {
      const error = API_ERRORS.TOKEN_PASSWORD_REQUIRED;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      const error = API_ERRORS.PASSWORD_MIN_LENGTH;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    let user = null;

    if (token) {
      user = await db.query.users.findFirst({
        where: and(
          eq(users.resetToken, token),
          gt(users.resetTokenExpiry, new Date())
        ),
      });
    } else if (email) {
      user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
    }

    if (!user) {
      const error = API_ERRORS.INVALID_EXPIRED_TOKEN;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
        mustChangePassword: false,
      })
      .where(eq(users.id, user.id));

    return NextResponse.json(
      { message: "Password reset successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Reset password error:", error);
    const serverError = API_ERRORS.INTERNAL_SERVER_ERROR;
    return NextResponse.json(
      { error: serverError.error, errorFa: serverError.errorFa },
      { status: 500 }
    );
  }
}

