import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { paymentSettings, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Public API to get enabled payment methods
// If user is logged in, check for user-specific overrides
export async function GET(request: NextRequest) {
  try {
    const settings = await db.select().from(paymentSettings).limit(1);
    
    // Get global payment settings
    const globalSettings = settings.length === 0 ? {
      cardToCardEnabled: false,
      onlinePaymentEnabled: false,
      payAfterDeliveryEnabled: false,
      paypalEnabled: false,
    } : {
      cardToCardEnabled: settings[0].cardToCardEnabled || false,
      onlinePaymentEnabled: settings[0].onlinePaymentEnabled || false,
      payAfterDeliveryEnabled: settings[0].payAfterDeliveryEnabled || false,
      paypalEnabled: settings[0].paypalEnabled || false,
    };

    // Check if user is logged in and has specific payment method overrides
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      const user = await db
        .select({
          cardToCardEnabled: users.cardToCardEnabled,
          onlinePaymentEnabled: users.onlinePaymentEnabled,
          payAfterDeliveryEnabled: users.payAfterDeliveryEnabled,
          paypalEnabled: users.paypalEnabled,
        })
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1)
        .then((users) => users[0] || null);

      if (user) {
        // Use user-specific overrides if they exist (not null), otherwise use global settings
        return NextResponse.json({
          cardToCardEnabled: user.cardToCardEnabled !== null ? user.cardToCardEnabled : globalSettings.cardToCardEnabled,
          onlinePaymentEnabled: user.onlinePaymentEnabled !== null ? user.onlinePaymentEnabled : globalSettings.onlinePaymentEnabled,
          payAfterDeliveryEnabled: user.payAfterDeliveryEnabled !== null ? user.payAfterDeliveryEnabled : globalSettings.payAfterDeliveryEnabled,
          paypalEnabled: user.paypalEnabled !== null ? user.paypalEnabled : globalSettings.paypalEnabled,
        });
      }
    }

    // Return global settings for guests or users without overrides
    return NextResponse.json(globalSettings);
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment settings" },
      { status: 500 }
    );
  }
}

