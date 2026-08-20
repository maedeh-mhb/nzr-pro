import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { contactSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { checkRateLimit, getRateLimitIdentifier, extractIpAddress, getRateLimitError } from "@/lib/utils/rateLimiter";
export const dynamic = "force-dynamic";

// Get contact settings
export async function GET(request: NextRequest) {
  try {
    // Rate limit public contact settings endpoint
    const ipAddress = extractIpAddress(request);
    const identifier = getRateLimitIdentifier(null, ipAddress);
    const rate = checkRateLimit(identifier, 60, 60 * 1000); // 60 requests per minute
    if (!rate.allowed) {
      const err = getRateLimitError(rate.resetTime);
      return NextResponse.json({ error: err.error, retryAfter: err.retryAfter }, { status: err.status });
    }

    const settings = await db
      .select()
      .from(contactSettings)
      .limit(1);

    if (settings.length === 0) {
      // Return default empty settings if none exist
      return NextResponse.json({
        telegram: null,
        instagram: null,
        whatsapp: null,
        rubika: null,
        phone: null,
        email: null,
        address: null,
        addressFa: null,
      }, { status: 200 });
    }

    return NextResponse.json(settings[0], { status: 200 });
  } catch (error) {
    console.error("Error fetching contact settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact settings" },
      { status: 500 }
    );
  }
}

