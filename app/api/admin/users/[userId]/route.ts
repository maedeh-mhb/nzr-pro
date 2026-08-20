import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAdmin, requireAdminWithPermissions } from "@/lib/middleware/auth";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await requireAdminWithPermissions(request, "delete_users");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const targetUser = await db
      .select()
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .then((r) => r[0] || null);

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (targetUser.role === "superadmin") {
      return NextResponse.json({ error: "Cannot delete superadmin" }, { status: 403 });
    }

    await db.delete(users).where(eq(users.id, params.userId));
    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, params.userId))
      .limit(1)
      .then((users) => users[0] || null);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password, ...userWithoutPassword } = user;

    return NextResponse.json({
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      name,
      surname,
      email,
      phone,
      role,
      emailVerified,
      phoneVerified,
      password,
      address,
      city,
      state,
      zipCode,
      country,
    } = body;

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (surname !== undefined) updateData.surname = surname;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (emailVerified !== undefined) {
      updateData.emailVerified = emailVerified ? new Date() : null;
    }
    if (phoneVerified !== undefined) {
      updateData.phoneVerified = phoneVerified ? new Date() : null;
    }
    if (password !== undefined && password.trim() !== "") {
      // Hash password if provided
      updateData.password = await bcrypt.hash(password, 10);
    }


    // Update user
    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, params.userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { password: _, ...userWithoutPassword } = updatedUser[0];

    return NextResponse.json({
      user: userWithoutPassword,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Error updating user:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update user", details: errorMessage },
      { status: 500 }
    );
  }
}

