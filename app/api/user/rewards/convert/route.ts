import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { convertPointsToDiscountCode } from "@/lib/services/rewards";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { pointsToConvert, thresholdIndex } = body;

    if (!pointsToConvert || pointsToConvert <= 0) {
      return NextResponse.json(
        { error: "Invalid points amount" },
        { status: 400 }
      );
    }

    if (thresholdIndex === undefined || thresholdIndex === null) {
      return NextResponse.json(
        { error: "Threshold index is required" },
        { status: 400 }
      );
    }

    const result = await convertPointsToDiscountCode(userId, pointsToConvert, thresholdIndex);

    if (result.success) {
      // Don't return the code - user will see it in coupons section
      // Notification and activity are already created in the service
      return NextResponse.json({
        success: true,
        discountCodeId: result.discountCodeId,
      });
    } else {
      return NextResponse.json(
        { error: result.error || "Failed to convert points" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error converting points:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to convert points", details: errorMessage },
      { status: 500 }
    );
  }
}

