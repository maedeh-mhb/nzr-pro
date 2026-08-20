import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { sellers } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/middleware/auth";
import { successResponse, errorResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const allSellers = await db
      .select()
      .from(sellers)
      .orderBy(sellers.nameEn);

    return successResponse({ sellers: allSellers });
  } catch (error) {
    return handleApiError(error, "Failed to fetch sellers", "خطا در دریافت فروشندگان");
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if (!authResult.authorized) {
      return authResult.response!;
    }

    const body = await request.json();
    const { 
      nameEn, 
      nameFa, 
      status
    } = body;

    if (!nameEn || !nameFa) {
      return errorResponse("Seller name is required", "نام فروشنده الزامی است", 400);
    }

    const newSeller = await db
      .insert(sellers)
      .values({
        nameEn,
        nameFa,
        status: status || "active"
      })
      .returning();

    return successResponse({ seller: newSeller[0] });
  } catch (error) {
    return handleApiError(error, "Failed to create seller", "خطا در ایجاد فروشنده");
  }
}
