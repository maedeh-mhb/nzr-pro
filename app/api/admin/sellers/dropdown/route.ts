// app/api/admin/sellers/dropdown/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { sellers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "admin" && session.user.role !== "superadmin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch only active sellers for dropdown
    const activeSellers = await db
      .select({
        id: sellers.id,
        nameEn: sellers.nameEn,
        nameFa: sellers.nameFa,
      })
      .from(sellers)
      .where(eq(sellers.status, "active"));

    return NextResponse.json({ sellers: activeSellers });
  } catch (error) {
    console.error("Error fetching sellers for dropdown:", error);
    return NextResponse.json({ error: "Failed to fetch sellers" }, { status: 500 });
  }
}
