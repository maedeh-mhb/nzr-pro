import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { deactivateExpiredCodes } from "@/lib/services/discountCodes";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint to deactivate expired discount codes
 * This endpoint should be called periodically (e.g., every hour or daily)
 * It automatically deactivates discount codes that have passed their validUntil date
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization for cron endpoint
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Deactivate expired codes
    await deactivateExpiredCodes();

    return NextResponse.json({
      success: true,
      message: "Expired discount codes have been deactivated",
    });
  } catch (error) {
    console.error("Error deactivating expired discount codes:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to deactivate expired codes", details: errorMessage },
      { status: 500 }
    );
  }
}

