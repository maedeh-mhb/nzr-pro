import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactSettings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET: Fetch contact settings
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const settings = await db
      .select()
      .from(contactSettings)
      .limit(1);

    if (settings.length === 0) {
      // Create default settings if none exist
      const [newSettings] = await db
        .insert(contactSettings)
        .values({})
        .returning();
      return NextResponse.json(newSettings);
    }

    return NextResponse.json(settings[0]);
  } catch (error) {
    console.error("Error fetching contact settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch contact settings" },
      { status: 500 }
    );
  }
}

// POST: Update contact settings
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { telegram, instagram, whatsapp, rubika, phone, email, address, addressFa } = body;

    // Check if settings exist
    const existing = await db
      .select()
      .from(contactSettings)
      .limit(1);

    if (existing.length === 0) {
      // Create new settings
      const [newSettings] = await db
        .insert(contactSettings)
        .values({
          telegram: telegram || null,
          instagram: instagram || null,
          whatsapp: whatsapp || null,
          rubika: rubika || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          addressFa: addressFa || null,
        })
        .returning();
      return NextResponse.json(newSettings);
    } else {
      // Update existing settings
      const [updated] = await db
        .update(contactSettings)
        .set({
          telegram: telegram !== undefined ? telegram : existing[0].telegram,
          instagram: instagram !== undefined ? instagram : existing[0].instagram,
          whatsapp: whatsapp !== undefined ? whatsapp : existing[0].whatsapp,
          rubika: rubika !== undefined ? rubika : existing[0].rubika,
          phone: phone !== undefined ? phone : existing[0].phone,
          email: email !== undefined ? email : existing[0].email,
          address: address !== undefined ? address : existing[0].address,
          addressFa: addressFa !== undefined ? addressFa : existing[0].addressFa,
          updatedAt: new Date(),
        })
        .where(eq(contactSettings.id, existing[0].id))
        .returning();
      return NextResponse.json(updated);
    }
  } catch (error) {
    console.error("Error updating contact settings:", error);
    return NextResponse.json(
      { error: "Failed to update contact settings" },
      { status: 500 }
    );
  }
}

