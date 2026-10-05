import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import { eq, sql, desc, isNull } from "drizzle-orm";
import { cache } from "@/lib/utils/cache";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest, { params }: { params: { category: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const categoryParam = params.category;

    // Build base query: if categoryParam === 'null' we target products with null categoryId
    // otherwise target products where categoryId equals the param OR categoryIds JSON contains the id
    const positionOrder = sql`COALESCE(${products.position}, 2147483647)`;

    let productList: any[] = [];

    if (categoryParam === "null") {
      productList = await db.select().from(products).where(isNull(products.categoryId)).orderBy(positionOrder, desc(products.createdAt));
    } else {
      const catId = decodeURIComponent(categoryParam);
      // select products that reference this categoryId in categoryId or categoryIds JSON
      // Use a simple LIKE check for category_ids string to avoid complex JSON ops
      const likeExpr = sql`${products.categoryIds} LIKE ${"%" + catId + "%"}`;
      productList = await db.select().from(products).where(sql`(${products.categoryId} = ${catId}) OR (${likeExpr})`).orderBy(positionOrder, desc(products.createdAt));
    }

    // Apply sequential positions (100,200,...)
    const result = await db.transaction(async (tx) => {
      let updated = 0;
      for (let i = 0; i < productList.length; i++) {
        const p = productList[i];
        const newPos = (i + 1) * 100;
        const res = await tx.update(products).set({ position: newPos }).where(eq(products.id, p.id)).returning();
        if (res.length > 0) updated += 1;
      }
      return { updated, total: productList.length };
    });

    cache.clearPattern(/^products:list:/);
    return NextResponse.json({ success: true, updated: result.updated, total: result.total });
  } catch (error: any) {
    console.error("Error reindexing products:", error);
    return NextResponse.json({ error: "Failed to reindex", details: error?.message || String(error) }, { status: 500 });
  }
}
