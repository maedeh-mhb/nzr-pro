import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { randomBytes } from "crypto";
export const dynamic = "force-dynamic";

/**
 * Generate CSRF token for the current session
 * GET /api/csrf-token
 * 
 * Note: This endpoint is intentionally not protected by origin validation
 * to allow initial page loads to fetch the token
 */
export async function GET(request: NextRequest) {
  try {
    // Generate a secure random token
    const token = randomBytes(32).toString("hex");
    
    // Store token in httpOnly cookie
    // Token expires in 1 hour
    const response = NextResponse.json({ 
      csrfToken: token,
      expiresIn: 3600, // 1 hour in seconds
    });
    
    response.cookies.set("csrf-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 3600, // 1 hour
      path: "/",
    });
    
    return response;
  } catch (error) {
    console.error("Error generating CSRF token:", error);
    return NextResponse.json(
      { error: "Failed to generate CSRF token" },
      { status: 500 }
    );
  }
}


