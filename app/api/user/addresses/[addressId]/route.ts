import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

// PUT - Update an address
export async function PUT(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const addressId = params.addressId;
    const body = await request.json();
    const { name, provinceId, cityId, address, postalCode, isDefault } = body;

    // Check if address exists and belongs to user
    const existingAddress = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    });

    if (!existingAddress) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Validate required fields
    if (name !== undefined && name.trim() === "") {
      return NextResponse.json({ error: "Address name is required" }, { status: 400 });
    }

    if (provinceId !== undefined && !provinceId) {
      return NextResponse.json({ error: "Province is required" }, { status: 400 });
    }

    if (cityId !== undefined && !cityId) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    if (address !== undefined && address.trim() === "") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    if (postalCode !== undefined) {
      if (postalCode.trim() === "") {
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
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (provinceId !== undefined) updateData.provinceId = parseInt(provinceId);
    if (cityId !== undefined) updateData.cityId = parseInt(cityId);
    if (address !== undefined) updateData.address = address.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();

    // Handle default address
    if (isDefault === true) {
      // Unset all other addresses as default
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
      updateData.isDefault = true;
    }

    // Update address
    const [updatedAddress] = await db
      .update(addresses)
      .set(updateData)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();

    // Create activity
    await createActivity({
      userId,
      activityType: "address_updated",
      activityData: { addressId },
    });

    return NextResponse.json({
      address: updatedAddress,
      message: "Address updated successfully",
    });
  } catch (error) {
    console.error("Error updating address:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update address", details: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Partial update an address (client uses PATCH)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const addressId = params.addressId;
    const body = await request.json();
    const { name, provinceId, cityId, address, postalCode, isDefault } = body;

    // Check if address exists and belongs to user
    const existingAddress = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    });

    if (!existingAddress) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Validate provided fields only (partial updates)
    if (name !== undefined && name.trim() === "") {
      return NextResponse.json({ error: "Address name is required" }, { status: 400 });
    }

    if (provinceId !== undefined && !provinceId) {
      return NextResponse.json({ error: "Province is required" }, { status: 400 });
    }

    if (cityId !== undefined && !cityId) {
      return NextResponse.json({ error: "City is required" }, { status: 400 });
    }

    if (address !== undefined && address.trim() === "") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    if (postalCode !== undefined) {
      if (postalCode.trim() === "") {
        return NextResponse.json({ error: "Postal code is required" }, { status: 400 });
      }
      const postalCodeRegex = /^\d{10}$/;
      if (!postalCodeRegex.test(postalCode.trim())) {
        return NextResponse.json(
          { error: "Postal code must be exactly 10 digits" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (provinceId !== undefined) updateData.provinceId = parseInt(provinceId);
    if (cityId !== undefined) updateData.cityId = parseInt(cityId);
    if (address !== undefined) updateData.address = address.trim();
    if (postalCode !== undefined) updateData.postalCode = postalCode.trim();

    if (isDefault === true) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, userId));
      updateData.isDefault = true;
    }

    const [updatedAddress] = await db
      .update(addresses)
      .set(updateData)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
      .returning();

    await createActivity({
      userId,
      activityType: "address_updated",
      activityData: { addressId },
    });

    return NextResponse.json(
      {
        address: updatedAddress,
        message: "Address updated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error patching address:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update address", details: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete an address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const addressId = params.addressId;

    // Check if address exists and belongs to user
    const existingAddress = await db.query.addresses.findFirst({
      where: and(eq(addresses.id, addressId), eq(addresses.userId, userId)),
    });

    if (!existingAddress) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Delete address
    await db
      .delete(addresses)
      .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)));

    return NextResponse.json({ message: "Address deleted successfully" });
  } catch (error) {
    console.error("Error deleting address:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete address", details: errorMessage },
      { status: 500 }
    );
  }
}

