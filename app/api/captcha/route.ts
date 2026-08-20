import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
export const dynamic = "force-dynamic";

// Store captcha refresh attempts in memory (in production, use Redis or similar)
const refreshAttempts = new Map<string, { count: number; resetTime: number }>();

// Generate 4-digit random number
function generateCaptcha(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Get session identifier for rate limiting
function getSessionId(request: NextRequest): string {
  // Try to get session from cookies
  const sessionToken = request.cookies.get("next-auth.session-token")?.value ||
                       request.cookies.get("__Secure-next-auth.session-token")?.value;
  
  if (sessionToken) {
    return `session:${sessionToken}`;
  }
  
  // Fallback to IP address
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  return `ip:${ip}`;
}

// GET: Generate new CAPTCHA
export async function GET(request: NextRequest) {
  try {
    const sessionId = getSessionId(request);
    const now = Date.now();
    
    // Check rate limiting
    const attempts = refreshAttempts.get(sessionId);
    if (attempts) {
      // Reset counter if a minute has passed
      if (now > attempts.resetTime) {
        refreshAttempts.set(sessionId, { count: 1, resetTime: now + 60000 });
      } else {
        // Check if limit exceeded
        if (attempts.count >= 5) {
          return NextResponse.json(
            { error: "Too many refresh attempts. Please wait a minute." },
            { status: 429 }
          );
        }
        // Increment counter
        attempts.count += 1;
        refreshAttempts.set(sessionId, attempts);
      }
    } else {
      // First attempt
      refreshAttempts.set(sessionId, { count: 1, resetTime: now + 60000 });
    }

    // Clean up old entries (older than 5 minutes)
    for (const [key, value] of refreshAttempts.entries()) {
      if (now > value.resetTime + 300000) {
        refreshAttempts.delete(key);
      }
    }

    const captcha = generateCaptcha();
    
    // Store captcha in session (we'll use a simple approach with cookies)
    // In production, use proper session storage
    const response = NextResponse.json({ captcha });
    
    // Store captcha in httpOnly cookie (expires in 10 minutes)
    response.cookies.set("captcha", captcha, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error) {
    console.error("Error generating CAPTCHA:", error);
    return NextResponse.json(
      { error: "Failed to generate CAPTCHA" },
      { status: 500 }
    );
  }
}

// POST: Verify CAPTCHA
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { captcha: userInput } = body;
    
    const storedCaptcha = request.cookies.get("captcha")?.value;
    
    if (!storedCaptcha) {
      return NextResponse.json(
        { valid: false, error: "CAPTCHA expired. Please refresh." },
        { status: 400 }
      );
    }

    const isValid = userInput === storedCaptcha;
    
    // Clear CAPTCHA after verification attempt
    const response = NextResponse.json({ valid: isValid });
    response.cookies.delete("captcha");
    
    return response;
  } catch (error) {
    console.error("Error verifying CAPTCHA:", error);
    return NextResponse.json(
      { error: "Failed to verify CAPTCHA" },
      { status: 500 }
    );
  }
}

