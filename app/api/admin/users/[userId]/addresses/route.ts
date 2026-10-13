import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema/userData";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET all addresses for a user
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const userAddresses = await db
      .select()
      .from(addresses)
      .where(eq(addresses.userId, params.userId))
      .orderBy(addresses.isDefault, addresses.createdAt);

    return NextResponse.json({ addresses: userAddresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// POST create a new address for a user
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
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
    const { name, provinceId, cityId, address, postalCode, country, isDefault } = body;

    if (!name || !provinceId || !cityId || !address) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (postalCode !== undefined && postalCode !== null && typeof postalCode !== "string") {
      return NextResponse.json({ error: "Postal code must be a string" }, { status: 400 });
    }
    const normalizedPostalCode = typeof postalCode === "string" ? postalCode.trim() : "";
    if (normalizedPostalCode && !/^\d{10}$/.test(normalizedPostalCode)) {
      return NextResponse.json(
        { error: "Postal code must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // If this address is default, unset other defaults
    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, params.userId));
    }

    const newAddress = await db
      .insert(addresses)
      .values({
        userId: params.userId,
        name,
        provinceId,
        cityId,
        address,
        postalCode: normalizedPostalCode,
        country: country || "Iran",
        isDefault: isDefault || false,
      })
      .returning();

    return NextResponse.json({ address: newAddress[0] });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}
