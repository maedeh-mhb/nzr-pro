import { NextRequest, NextResponse } from "next/server";
import { syncGuestCartReservations } from "@/lib/services/inventoryReservation";

export const dynamic = "force-dynamic";

const SESSION_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.headers.get("x-session-id");
    if (!sessionId || !SESSION_ID_PATTERN.test(sessionId)) {
      return NextResponse.json({ error: "Invalid guest session" }, { status: 400 });
    }

    const body = await request.json();
    if (!Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid cart items" }, { status: 400 });
    }

    const items = body.items.map((item: unknown) => {
      const candidate = item as { productId?: unknown; quantity?: unknown };
      const productId = typeof candidate.productId === "string" ? candidate.productId : "";
      const quantity = Number(candidate.quantity);
      if (!productId || !Number.isInteger(quantity) || quantity < 1) {
        throw new Error("Invalid cart item");
      }

      return { productId, quantity };
    });

    await syncGuestCartReservations(sessionId, items);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error synchronizing guest cart inventory:", error);
    const message = error instanceof Error ? error.message : "Failed to synchronize guest cart";
    const status = message === "Requested quantity is no longer available" || message === "Product is unavailable"
      ? 409
      : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
