import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

// GET - Fetch all addresses for the logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId),
      orderBy: (addresses, { desc }) => [desc(addresses.createdAt)],
    });

    return NextResponse.json({ addresses: userAddresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch addresses", details: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, provinceId, cityId, address, postalCode } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Address name is required" }, { status: 400 });
    }

    if (!provinceId) {
      return NextResponse.json({ error: "Province is required" }, { status: 400 });
    }

    if (!cityId) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    if (!address || address.trim() === "") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    if (!postalCode || postalCode.trim() === "") {
      return NextResponse.json({ error: "Postal code is required" }, { status: 400 });
    }

    // Validate postal code: exactly 10 digits
    const postalCodeRegex = /^\d{10}$/;
    if (!postalCodeRegex.test(postalCode.trim())) {
      return NextResponse.json(
        { error: "Postal code must be exactly 10 digits" },
        { status: 400 }
      );
    }

    // If this is the first address, set it as default
    const existingAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId),
    });

    const isDefault = existingAddresses.length === 0;

    // Create new address
    const [newAddress] = await db
      .insert(addresses)
      .values({
        userId,
        name: name.trim(),
        provinceId: parseInt(provinceId),
        cityId: parseInt(cityId),
        address: address.trim(),
        postalCode: postalCode.trim(),
        country: "Iran",
        isDefault,
      })
      .returning();

    // Create activity
    await createActivity({
      userId,
      activityType: "address_added",
      activityData: { addressId: newAddress.id },
    });

    return NextResponse.json({
      address: newAddress,
      message: "Address created successfully",
    });
  } catch (error) {
    console.error("Error creating address:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create address", details: errorMessage },
      { status: 500 }
    );
  }
}

