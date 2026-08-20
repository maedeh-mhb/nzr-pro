import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users, contactSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/services/email";
import { API_ERRORS } from "@/lib/utils/apiErrors";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      const error = API_ERRORS.EMAIL_REQUIRED;
      return NextResponse.json(
        { error: error.error, errorFa: error.errorFa },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    // Always return success to prevent email enumeration
    if (user) {
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenExpiry = new Date();
      resetTokenExpiry.setMinutes(resetTokenExpiry.getMinutes() + 10); // Token expires in 10 minutes

      // Store reset token in database
      await db
        .update(users)
        .set({ resetToken, resetTokenExpiry })
        .where(eq(users.id, user.id));

      // Get contact settings for email footer
      const contactSettingsData = await db.query.contactSettings.findFirst();

      // Generate reset link
      const baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const resetLink = `${baseUrl}/reset-password?token=${resetToken}`;

      // Send password reset email
      try {
        await sendPasswordResetEmail(user.email, {
          userName: user.name,
          resetLink,
          telegram: contactSettingsData?.telegram || null,
          instagram: contactSettingsData?.instagram || null,
          whatsapp: contactSettingsData?.whatsapp || null,
          contactAddress: contactSettingsData?.address || null,
          contactAddressFa: contactSettingsData?.addressFa || null,
          contactEmail: contactSettingsData?.email || null,
        });
      } catch (emailError) {
        console.error("Error sending password reset email:", emailError);
        // Don't fail the request if email fails, but log it
      }
    }

    return NextResponse.json(
      { message: "If an account exists with this email, a password reset link has been sent." },
      { status: 200 }
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    const serverError = API_ERRORS.INTERNAL_SERVER_ERROR;
    return NextResponse.json(
      { error: serverError.error, errorFa: serverError.errorFa },
      { status: 500 }
    );
  }
}

