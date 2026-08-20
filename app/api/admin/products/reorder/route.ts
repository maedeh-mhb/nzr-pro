import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    if (!Array.isArray(body) || body.length === 0) return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    if (body.length > 1000) return NextResponse.json({ error: 'Payload too large' }, { status: 413 });

    // Validate items
    const items = body.map((it: any) => ({ id: it.id, position: Number(it.position) }));
    if (items.some((it: any) => !it.id || !Number.isFinite(it.position))) return NextResponse.json({ error: 'Invalid items' }, { status: 400 });

    // Apply updates in a transaction
    const result = await db.transaction(async (tx) => {
      let updated = 0;
      for (const it of items) {
        const res = await tx.update(products).set({ position: it.position }).where(eq(products.id, it.id)).returning();
        if (res.length > 0) updated += 1;
      }
      return { updated };
    });

    return NextResponse.json({ success: true, updated: result.updated });
  } catch (error: any) {
    console.error('Error bulk reordering products:', error);
    return NextResponse.json({ error: 'Failed to reorder', details: error.message }, { status: 500 });
  }
}
