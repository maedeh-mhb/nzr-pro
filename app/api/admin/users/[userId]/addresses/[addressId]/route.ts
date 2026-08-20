import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema/userData";
import { eq, and } from "drizzle-orm";
export const dynamic = "force-dynamic";

// PUT update an address
export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string; addressId: string } }
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

    // If setting as default, unset other defaults
    if (isDefault) {
      await db
        .update(addresses)
        .set({ isDefault: false })
        .where(eq(addresses.userId, params.userId));
    }

    const updatedAddress = await db
      .update(addresses)
      .set({
        name: name !== undefined ? name : undefined,
        provinceId: provinceId !== undefined ? provinceId : undefined,
        cityId: cityId !== undefined ? cityId : undefined,
        address: address !== undefined ? address : undefined,
        postalCode: postalCode !== undefined ? postalCode : undefined,
        country: country !== undefined ? country : undefined,
        isDefault: isDefault !== undefined ? isDefault : undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(addresses.id, params.addressId),
          eq(addresses.userId, params.userId)
        )
      )
      .returning();

    if (updatedAddress.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ address: updatedAddress[0] });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// DELETE an address
export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string; addressId: string } }
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

    const deletedAddress = await db
      .delete(addresses)
      .where(
        and(
          eq(addresses.id, params.addressId),
          eq(addresses.userId, params.userId)
        )
      )
      .returning();

    if (deletedAddress.length === 0) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
