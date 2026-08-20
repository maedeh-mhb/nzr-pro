import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, paymentSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/services/notifications";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

// GET: Get user-specific payment methods
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const user = await db
      .select({
        id: users.id,
        name: users.name,
        surname: users.surname,
        email: users.email,
        cardToCardEnabled: users.cardToCardEnabled,
        onlinePaymentEnabled: users.onlinePaymentEnabled,
        payAfterDeliveryEnabled: users.payAfterDeliveryEnabled,
        paypalEnabled: users.paypalEnabled,
      })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .then((users) => users[0] || null);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        surname: user.surname,
        email: user.email,
        paymentMethods: {
          cardToCardEnabled: user.cardToCardEnabled,
          onlinePaymentEnabled: user.onlinePaymentEnabled,
          payAfterDeliveryEnabled: user.payAfterDeliveryEnabled,
          paypalEnabled: user.paypalEnabled,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching user payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch user payment methods" },
      { status: 500 }
    );
  }
}

// PUT: Update user-specific payment methods
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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
    const {
      cardToCardEnabled,
      onlinePaymentEnabled,
      payAfterDeliveryEnabled,
      paypalEnabled,
    } = body;

    // Check if user exists and get old payment methods
    const existingUser = await db
      .select({
        id: users.id,
        name: users.name,
        surname: users.surname,
        email: users.email,
        cardToCardEnabled: users.cardToCardEnabled,
        onlinePaymentEnabled: users.onlinePaymentEnabled,
        payAfterDeliveryEnabled: users.payAfterDeliveryEnabled,
        paypalEnabled: users.paypalEnabled,
      })
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .then((users) => users[0] || null);

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store old values for comparison
    const oldPaymentMethods = {
      cardToCardEnabled: existingUser.cardToCardEnabled,
      onlinePaymentEnabled: existingUser.onlinePaymentEnabled,
      payAfterDeliveryEnabled: existingUser.payAfterDeliveryEnabled,
      paypalEnabled: existingUser.paypalEnabled,
    };

    // Update user payment methods
    const [updatedUser] = await db
      .update(users)
      .set({
        cardToCardEnabled:
          cardToCardEnabled === null || cardToCardEnabled === undefined
            ? null
            : Boolean(cardToCardEnabled),
        onlinePaymentEnabled:
          onlinePaymentEnabled === null || onlinePaymentEnabled === undefined
            ? null
            : Boolean(onlinePaymentEnabled),
        payAfterDeliveryEnabled:
          payAfterDeliveryEnabled === null || payAfterDeliveryEnabled === undefined
            ? null
            : Boolean(payAfterDeliveryEnabled),
        paypalEnabled:
          paypalEnabled === null || paypalEnabled === undefined
            ? null
            : Boolean(paypalEnabled),
        updatedAt: new Date(),
      })
      .where(eq(users.id, params.userId))
      .returning({
        id: users.id,
        name: users.name,
        surname: users.surname,
        email: users.email,
        cardToCardEnabled: users.cardToCardEnabled,
        onlinePaymentEnabled: users.onlinePaymentEnabled,
        payAfterDeliveryEnabled: users.payAfterDeliveryEnabled,
        paypalEnabled: users.paypalEnabled,
      });

    // Check if payment methods actually changed
    const hasChanged = 
      oldPaymentMethods.cardToCardEnabled !== updatedUser.cardToCardEnabled ||
      oldPaymentMethods.onlinePaymentEnabled !== updatedUser.onlinePaymentEnabled ||
      oldPaymentMethods.payAfterDeliveryEnabled !== updatedUser.payAfterDeliveryEnabled ||
      oldPaymentMethods.paypalEnabled !== updatedUser.paypalEnabled;

    // If changed, create notification and activity
    if (hasChanged) {
      // Get global payment settings to determine which methods are actually enabled
      const globalSettings = await db
        .select()
        .from(paymentSettings)
        .limit(1)
        .then((settings) => settings[0] || null);

      // Determine which payment methods are enabled (user override or global)
      const enabledMethods: string[] = [];
      const enabledMethodsFa: string[] = [];

      const cardToCardEnabled = updatedUser.cardToCardEnabled !== null 
        ? updatedUser.cardToCardEnabled 
        : (globalSettings?.cardToCardEnabled || false);
      if (cardToCardEnabled) {
        enabledMethods.push("Card to Card Transfer");
        enabledMethodsFa.push("کارت به کارت");
      }

      const onlinePaymentEnabled = updatedUser.onlinePaymentEnabled !== null 
        ? updatedUser.onlinePaymentEnabled 
        : (globalSettings?.onlinePaymentEnabled || false);
      if (onlinePaymentEnabled) {
        enabledMethods.push("Online Payment");
        enabledMethodsFa.push("پرداخت آنلاین");
      }

      const payAfterDeliveryEnabled = updatedUser.payAfterDeliveryEnabled !== null 
        ? updatedUser.payAfterDeliveryEnabled 
        : (globalSettings?.payAfterDeliveryEnabled || false);
      if (payAfterDeliveryEnabled) {
        enabledMethods.push("Pay After Delivery");
        enabledMethodsFa.push("پرداخت در محل");
      }

      const paypalEnabled = updatedUser.paypalEnabled !== null 
        ? updatedUser.paypalEnabled 
        : (globalSettings?.paypalEnabled || false);
      if (paypalEnabled) {
        enabledMethods.push("PayPal");
        enabledMethodsFa.push("پی‌پال");
      }

      // Create notification
      const paymentMethodsText = enabledMethods.length > 0 
        ? enabledMethods.join(", ")
        : "none";
      const paymentMethodsTextFa = enabledMethodsFa.length > 0 
        ? enabledMethodsFa.join("، ")
        : "هیچکدام";

      await createNotification({
        userId: params.userId,
        type: "payment_settings_changed",
        title: "Payment Settings Changed",
        titleFa: "تغییر تنظیمات پرداخت",
        message: `Admin has changed your payment settings. You can pay by ${paymentMethodsText}.`,
        messageFa: `مدیر تنظیمات پرداخت شما را تغییر داده است. شما می‌توانید با ${paymentMethodsTextFa} پرداخت کنید.`,
        notificationData: {
          enabledMethods: enabledMethods,
          enabledMethodsFa: enabledMethodsFa,
        },
      });

      // Create activity
      await createActivity({
        userId: params.userId,
        activityType: "payment_settings_changed",
        activityData: {
          enabledMethods: enabledMethods,
          enabledMethodsFa: enabledMethodsFa,
        },
      });
    }

    return NextResponse.json({
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        surname: updatedUser.surname,
        email: updatedUser.email,
        paymentMethods: {
          cardToCardEnabled: updatedUser.cardToCardEnabled,
          onlinePaymentEnabled: updatedUser.onlinePaymentEnabled,
          payAfterDeliveryEnabled: updatedUser.payAfterDeliveryEnabled,
          paypalEnabled: updatedUser.paypalEnabled,
        },
      },
    });
  } catch (error) {
    console.error("Error updating user payment methods:", error);
    return NextResponse.json(
      { error: "Failed to update user payment methods" },
      { status: 500 }
    );
  }
}

