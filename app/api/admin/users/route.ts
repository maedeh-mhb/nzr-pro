import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { ilike, or, count, eq } from "drizzle-orm";
import { addresses } from "@/lib/db/schema";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { paginatedResponse, successResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { parsePaginationParams } from "@/lib/utils/pagination";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdminWithPermissions(request, "view_users");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get("search") || "";
    const { page, limit, offset } = parsePaginationParams(searchParams);

    // Build query conditions
    let whereConditions: any[] = [];

    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      whereConditions.push(
        or(
          ilike(users.name, searchTerm),
          ilike(users.surname, searchTerm),
          ilike(users.email, searchTerm),
          ilike(users.phone, searchTerm)
        )!
      );
    }

    // Get total count
    const totalResult = await db
      .select({ count: count() })
      .from(users)
      .where(whereConditions.length > 0 ? whereConditions[0] : undefined);
    const total = totalResult[0]?.count || 0;

    // Get paginated users
    let query = db.select().from(users);
    if (whereConditions.length > 0) {
      query = query.where(whereConditions[0]) as any;
    }
    
    const allUsers = await query.limit(limit).offset(offset);

    // Fetch addresses for all users in this page
    const userIds = allUsers.map((u) => u.id);
    const allAddresses = userIds.length > 0
      ? await db.select().from(addresses).where(
          userIds.length === 1
            ? eq(addresses.userId, userIds[0])
            : or(...userIds.map((id) => eq(addresses.userId, id)))!
        )
      : [];

    // Remove password from response and attach addresses
    const usersWithoutPassword = allUsers.map((user) => {
      const { password, ...userWithoutPassword } = user;
      return {
        ...userWithoutPassword,
        addresses: allAddresses.filter((a) => a.userId === user.id),
      };
    });

    return paginatedResponse(usersWithoutPassword, page, limit, total);
  } catch (error) {
    return handleApiError(error, "Failed to fetch users", "خطا در دریافت کاربران");
  }
}


