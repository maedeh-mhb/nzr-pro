import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bankSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Public endpoint to fetch default bank card (first active bank by order)
export async function GET() {
  try {
    // Get the first active bank ordered by order field (default is order 0)
    const banks = await db
      .select()
      .from(bankSettings)
      .where(eq(bankSettings.isActive, true))
      .orderBy(bankSettings.order)
      .limit(1);

    if (banks.length === 0) {
      return NextResponse.json({ error: "No bank card available" }, { status: 404 });
    }

    const defaultBank = banks[0];

    return NextResponse.json({
      bankName: defaultBank.bankName,
      cardNumber: defaultBank.cardNumber,
      cardHolder: defaultBank.cardHolder,
      iban: defaultBank.iban,
    });
  } catch (error) {
    console.error("Error fetching default bank card:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank card" },
      { status: 500 }
    );
  }
}

