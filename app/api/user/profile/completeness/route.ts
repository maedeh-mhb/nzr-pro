import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { users, addresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch user data
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check completeness criteria
    const checks = {
      firstName: !!user.name && user.name.trim() !== "",
      lastName: !!user.surname && user.surname.trim() !== "",
      phoneVerified: !!user.phoneVerified,
      email: !!user.email && user.email.trim() !== "",
      completeAddress: false,
    };

    // Check if user has at least one complete address
    const userAddresses = await db.query.addresses.findMany({
      where: eq(addresses.userId, userId),
    });

    // An address is complete if it has provinceId, cityId, address, and postalCode
    checks.completeAddress = userAddresses.some(
      (addr) =>
        addr.provinceId &&
        addr.cityId &&
        addr.address &&
        addr.address.trim() !== "" &&
        addr.postalCode &&
        addr.postalCode.trim() !== ""
    );

    // Calculate percentage (5 criteria = 20% each)
    const totalChecks = Object.keys(checks).length;
    const completedChecks = Object.values(checks).filter(Boolean).length;
    const percentage = Math.round((completedChecks / totalChecks) * 100);

    // Determine missing items
    const missingItems: string[] = [];
    if (!checks.firstName) {
      missingItems.push("firstName");
    }
    if (!checks.lastName) {
      missingItems.push("lastName");
    }
    if (!checks.phoneVerified) {
      missingItems.push("phoneVerified");
    }
    if (!checks.email) {
      missingItems.push("email");
    }
    if (!checks.completeAddress) {
      missingItems.push("completeAddress");
    }

    return NextResponse.json({
      percentage,
      checks,
      missingItems,
      emailVerified: !!user.emailVerified,
    });
  } catch (error) {
    console.error("Error calculating profile completeness:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to calculate profile completeness", details: errorMessage },
      { status: 500 }
    );
  }
}

