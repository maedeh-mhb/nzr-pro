import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { bankSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Get all bank settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all bank settings ordered by order field
    const banks = await db
      .select()
      .from(bankSettings)
      .orderBy(bankSettings.order);

    return NextResponse.json(banks);
  } catch (error) {
    console.error("Error fetching bank settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bank settings" },
      { status: 500 }
    );
  }
}

// Create or update bank settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { banks } = body;

    if (!Array.isArray(banks)) {
      return NextResponse.json(
        { error: "Banks must be an array" },
        { status: 400 }
      );
    }

    // Get existing banks
    const existingBanks = await db.select().from(bankSettings);

    // Create a map of existing banks by ID
    const existingBanksMap = new Map(existingBanks.map(bank => [bank.id, bank]));

    // Process each bank
    for (let i = 0; i < banks.length; i++) {
      const bank = banks[i];
      
      if (!bank.bankName || !bank.cardNumber || !bank.cardHolder) {
        continue; // Skip invalid banks
      }

      // Remove spaces from card number before saving
      const cardNumber = bank.cardNumber.replace(/\s/g, "");

      if (bank.id && existingBanksMap.has(bank.id)) {
        // Update existing bank
        await db
          .update(bankSettings)
          .set({
            bankName: bank.bankName,
            cardNumber: cardNumber,
            cardHolder: bank.cardHolder,
            iban: bank.iban || null,
            order: i,
            updatedAt: new Date(),
          })
          .where(eq(bankSettings.id, bank.id));
      } else {
        // Create new bank
        await db.insert(bankSettings).values({
          bankName: bank.bankName,
          cardNumber: cardNumber,
          cardHolder: bank.cardHolder,
          iban: bank.iban || null,
          order: i,
        });
      }
    }

    // Delete banks that are no longer in the array
    const submittedIds = banks
      .filter(bank => bank.id)
      .map(bank => bank.id);
    
    const banksToDelete = existingBanks.filter(
      bank => !submittedIds.includes(bank.id)
    );

    for (const bank of banksToDelete) {
      await db.delete(bankSettings).where(eq(bankSettings.id, bank.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving bank settings:", error);
    return NextResponse.json(
      { error: "Failed to save bank settings" },
      { status: 500 }
    );
  }
}

