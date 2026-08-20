import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await request.json();
    const { position } = body;
    if (typeof position !== 'number' || !Number.isFinite(position)) {
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
    }

    const updated = await db.update(products).set({ position }).where(eq(products.id, params.id)).returning();
    if (updated.length === 0) return NextResponse.json({ error: 'Product not found' }, { status: 404 });

    return NextResponse.json({ id: updated[0].id, position: updated[0].position });
  } catch (error: any) {
    console.error('Error updating product position:', error);
    return NextResponse.json({ error: 'Failed to update position', details: error.message }, { status: 500 });
  }
}
