import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createActivity } from "@/lib/services/activities";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch full user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return user profile data
    return NextResponse.json({
      name: user.name,
      surname: user.surname || null,
      email: user.email,
      phone: user.phone || null,
      emailVerified: user.emailVerified,
      phoneVerified: user.phoneVerified,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to fetch user profile", details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();
    const { name, surname, email, phone } = body;

    // Validate required fields
    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Validate email format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
      }
    }

    // Check if email is already taken by another user
    if (email) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email),
      });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "Email already in use" }, { status: 400 });
      }
    }

    // Check if phone is already taken by another user
    if (phone && phone.trim() !== "") {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.phone, phone),
      });
      if (existingUser && existingUser.id !== userId) {
        return NextResponse.json({ error: "Phone number already in use" }, { status: 400 });
      }
    }

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (surname !== undefined) updateData.surname = surname?.trim() || null;
    if (email !== undefined) updateData.email = email.trim();
    if (phone !== undefined) updateData.phone = phone?.trim() || null;

    // Fetch current user to check verification status
    const currentUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    // If email changed, prevent change if already verified
    if (email && email !== currentUser?.email) {
      // Check if email is already verified - if so, prevent change
      if (currentUser?.emailVerified) {
        return NextResponse.json(
          { error: "Email address cannot be changed once verified." },
          { status: 400 }
        );
      }
      // Only reset verification if email is not verified
      updateData.emailVerified = null;
    }

    // If phone changed, reset phone verification
    // BUT: Prevent phone change if already verified
    if (phone !== undefined && phone !== currentUser?.phone) {
      // Check if phone is already verified - if so, prevent change
      if (currentUser?.phoneVerified) {
        return NextResponse.json(
          { error: "Phone number cannot be changed once verified." },
          { status: 400 }
        );
      }
      // Only reset verification if phone is not verified
      updateData.phoneVerified = null;
    }

    // Update user
    await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId));

    // Fetch updated user
    const updatedUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create activity if profile was actually updated
    const hasChanges = 
      (name !== undefined && name !== currentUser?.name) ||
      (surname !== undefined && surname !== currentUser?.surname) ||
      (email !== undefined && email !== currentUser?.email) ||
      (phone !== undefined && phone !== currentUser?.phone);

    if (hasChanges) {
      await createActivity({
        userId,
        activityType: "profile_updated",
        activityData: {},
      });
    }

    return NextResponse.json({
      name: updatedUser.name,
      surname: updatedUser.surname || null,
      email: updatedUser.email,
      phone: updatedUser.phone || null,
      emailVerified: updatedUser.emailVerified,
      phoneVerified: updatedUser.phoneVerified,
      createdAt: updatedUser.createdAt,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update user profile", details: errorMessage },
      { status: 500 }
    );
  }
}

