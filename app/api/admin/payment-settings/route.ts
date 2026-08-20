import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { paymentSettings } from "@/lib/db/schema/payments"; // ← FIXED IMPORT
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Get payment settings
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_payments");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const settings = await db.select().from(paymentSettings).limit(1);

    if (settings.length === 0) {
      return NextResponse.json(null);
    }

    return NextResponse.json({
      id: settings[0].id,
      cardToCardEnabled: settings[0].cardToCardEnabled,
      onlinePaymentEnabled: settings[0].onlinePaymentEnabled,
      onlinePaymentProvider: settings[0].onlinePaymentProvider ?? null,
      onlinePaymentApiKey: settings[0].onlinePaymentApiKey ?? null,
      onlinePaymentSecretKey: settings[0].onlinePaymentSecretKey ?? null,
      onlinePaymentMerchantId: settings[0].onlinePaymentMerchantId ?? null,
      payAfterDeliveryEnabled: settings[0].payAfterDeliveryEnabled,
      payAfterDeliveryMaxAmount: settings[0].payAfterDeliveryMaxAmount ?? null,
      payAfterDeliveryRequireVerification: settings[0].payAfterDeliveryRequireVerification,
      paypalEnabled: settings[0].paypalEnabled,
      paypalClientId: settings[0].paypalClientId ?? null,
      paypalSecretKey: settings[0].paypalSecretKey ?? null,
      paypalMode: settings[0].paypalMode ?? "sandbox",
    });
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

// Create or update payment settings
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminWithPermissions(request, "manage_payments");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();

    const existing = await db.select().from(paymentSettings).limit(1);

    if (existing.length === 0) {
      // Create new settings
      await db.insert(paymentSettings).values({
        cardToCardEnabled: body.cardToCardEnabled ?? false,
        onlinePaymentEnabled: body.onlinePaymentEnabled ?? false,
        onlinePaymentProvider: body.onlinePaymentProvider ?? null,
        onlinePaymentApiKey: body.onlinePaymentApiKey ?? null,
        onlinePaymentSecretKey: body.onlinePaymentSecretKey ?? null,
        onlinePaymentMerchantId: body.onlinePaymentMerchantId ?? null,
        payAfterDeliveryEnabled: body.payAfterDeliveryEnabled ?? false,
        payAfterDeliveryMaxAmount: body.payAfterDeliveryMaxAmount ? String(body.payAfterDeliveryMaxAmount) : null, // ← FIXED
        payAfterDeliveryRequireVerification: body.payAfterDeliveryRequireVerification ?? false,
        paypalEnabled: body.paypalEnabled ?? false,
        paypalClientId: body.paypalClientId ?? null,
        paypalSecretKey: body.paypalSecretKey ?? null,
        paypalMode: body.paypalMode ?? "sandbox",
      });
    } else {
      // Update existing settings
      await db
        .update(paymentSettings)
        .set({
          cardToCardEnabled: body.cardToCardEnabled ?? existing[0].cardToCardEnabled,
          onlinePaymentEnabled: body.onlinePaymentEnabled ?? existing[0].onlinePaymentEnabled,
          onlinePaymentProvider: body.onlinePaymentProvider !== undefined ? body.onlinePaymentProvider : existing[0].onlinePaymentProvider,
          onlinePaymentApiKey: body.onlinePaymentApiKey !== undefined ? body.onlinePaymentApiKey : existing[0].onlinePaymentApiKey,
          onlinePaymentSecretKey: body.onlinePaymentSecretKey !== undefined ? body.onlinePaymentSecretKey : existing[0].onlinePaymentSecretKey,
          onlinePaymentMerchantId: body.onlinePaymentMerchantId !== undefined ? body.onlinePaymentMerchantId : existing[0].onlinePaymentMerchantId,
          payAfterDeliveryEnabled: body.payAfterDeliveryEnabled ?? existing[0].payAfterDeliveryEnabled,
          payAfterDeliveryMaxAmount: body.payAfterDeliveryMaxAmount !== undefined 
            ? (body.payAfterDeliveryMaxAmount ? String(body.payAfterDeliveryMaxAmount) : null) // ← FIXED
            : existing[0].payAfterDeliveryMaxAmount,
          payAfterDeliveryRequireVerification: body.payAfterDeliveryRequireVerification ?? existing[0].payAfterDeliveryRequireVerification,
          paypalEnabled: body.paypalEnabled ?? existing[0].paypalEnabled,
          paypalClientId: body.paypalClientId !== undefined ? body.paypalClientId : existing[0].paypalClientId,
          paypalSecretKey: body.paypalSecretKey !== undefined ? body.paypalSecretKey : existing[0].paypalSecretKey,
          paypalMode: body.paypalMode ?? existing[0].paypalMode,
          updatedAt: new Date(),
        })
        .where(eq(paymentSettings.id, existing[0].id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving payment settings:", error);
    return NextResponse.json(
      { error: "Failed to save payment settings" },
      { status: 500 }
    );
  }
}
