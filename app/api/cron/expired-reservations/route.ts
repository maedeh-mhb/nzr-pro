import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/lib/services/inventoryReservation";
export const dynamic = "force-dynamic";

/**
 * Cron endpoint to clean up expired inventory reservations
 * Should be called periodically (e.g., every 5-10 minutes)
 * 
 * Usage:
 * - Set up a cron job to call: GET /api/cron/expired-reservations
 * - Include Authorization header: Bearer {CRON_SECRET}
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization for cron endpoint
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cleanedCount = await cleanupExpiredReservations();

    return NextResponse.json({
      success: true,
      cleanedCount,
      message: `Cleaned up ${cleanedCount} expired reservation(s)`,
    });
  } catch (error) {
    console.error("Error cleaning up expired reservations:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to clean up expired reservations", details: errorMessage },
      { status: 500 }
    );
  }
}

