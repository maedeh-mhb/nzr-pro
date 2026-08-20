import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { discountCodes, discountCodeUsers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createAdminActivity } from "@/lib/services/adminActivities";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const code = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, params.id),
    });

    if (!code) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    // Get associated users if personal code
    let userIds: string[] = [];
    if (code.type === "personal") {
      const users = await db
        .select({
          userId: discountCodeUsers.userId,
        })
        .from(discountCodeUsers)
        .where(eq(discountCodeUsers.discountCodeId, code.id));

      userIds = users.map((u) => u.userId);
    }

    return NextResponse.json({ code: { ...code, userIds } });
  } catch (error) {
    console.error("Error fetching discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch discount code", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      discountType,
      discountValue,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit,
      userLimit,
      validFrom,
      validUntil,
      description,
      descriptionFa,
      isActive,
    } = body;

    // Check if code exists
    const existingCode = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, params.id),
    });

    if (!existingCode) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    // Update code (code field cannot be changed after creation)
    const [updatedCode] = await db
      .update(discountCodes)
      .set({
        discountType: discountType || existingCode.discountType,
        discountValue:
          discountType === "free_shipping"
            ? null
            : discountValue !== undefined && discountValue !== null
              ? discountValue.toString()
              : existingCode.discountValue,
        minPurchaseAmount:
          minPurchaseAmount !== undefined && minPurchaseAmount !== null
            ? minPurchaseAmount.toString()
            : existingCode.minPurchaseAmount,
        maxDiscountAmount:
          maxDiscountAmount !== undefined && maxDiscountAmount !== null
            ? maxDiscountAmount.toString()
            : existingCode.maxDiscountAmount,
        usageLimit: usageLimit !== undefined && usageLimit !== null ? usageLimit : existingCode.usageLimit,
        userLimit: userLimit !== undefined && userLimit !== null ? userLimit : existingCode.userLimit,
        validFrom: validFrom ? new Date(validFrom) : existingCode.validFrom,
        validUntil: validUntil ? new Date(validUntil) : existingCode.validUntil,
        description: description !== undefined ? description : existingCode.description,
        descriptionFa: descriptionFa !== undefined ? descriptionFa : existingCode.descriptionFa,
        isActive: isActive !== undefined ? isActive : existingCode.isActive,
        updatedAt: new Date(),
      })
      .where(eq(discountCodes.id, params.id))
      .returning();

    const adminId = (session.user as any)?.id;

    // Log admin activity
    await createAdminActivity({
      adminId,
      activityType: "discount_code_updated",
      activityData: {
        codeId: updatedCode.id,
        code: updatedCode.code,
      },
    });

    return NextResponse.json({ code: updatedCode });
  } catch (error) {
    console.error("Error updating discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update discount code", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const code = await db.query.discountCodes.findFirst({
      where: eq(discountCodes.id, params.id),
    });

    if (!code) {
      return NextResponse.json({ error: "Discount code not found" }, { status: 404 });
    }

    // Soft delete (set isActive to false)
    await db
      .update(discountCodes)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(discountCodes.id, params.id));

    const adminId = (session.user as any)?.id;

    // Log admin activity
    await createAdminActivity({
      adminId,
      activityType: "discount_code_deleted",
      activityData: {
        codeId: code.id,
        code: code.code,
      },
    });

    return NextResponse.json({ message: "Discount code deleted successfully" });
  } catch (error) {
    console.error("Error deleting discount code:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to delete discount code", details: errorMessage },
      { status: 500 }
    );
  }
}

