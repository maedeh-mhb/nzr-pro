// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, products } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count, inArray, ne, exists, notExists } from "drizzle-orm";
import { requireAdminWithPermissions } from "@/lib/middleware/auth";
import { paginatedResponse } from "@/lib/utils/apiResponse";
import { handleApiError } from "@/lib/utils/errorHandler";
import { parsePaginationParams } from "@/lib/utils/pagination";
import { matchesOrderSearch } from "@/lib/utils/orderSearch";
import { fetchOrderDetails } from "./helpers";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireAdminWithPermissions(request, "view_orders");
    if (!authResult.authorized) {
      return authResult.response!;
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const orderType = searchParams.get("orderType") || "all"; // all, guest, registered
    const sellerId = searchParams.get("sellerId") || ""; // NEW: Seller filter
    const { page, limit, offset } = parsePaginationParams(searchParams);

    // Build where conditions
    const conditions: any[] = [];

    // Date range filter
    if (dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Include the entire end date
      conditions.push(lte(orders.createdAt, toDate));
    }

    // Status filter
    if (status) {
      conditions.push(eq(orders.status, status));
    } else {
      // By default, hide payment_pending orders (online payments not yet completed).
      // Admins can still view them by explicitly selecting status=payment_pending.
      conditions.push(ne(orders.status, "payment_pending"));
    }

    // Payment method filter
    if (paymentMethod) {
      conditions.push(eq(orders.paymentMethod, paymentMethod));
    }

    // Apply seller filter to the raw order query before pagination
    if (sellerId) {
      conditions.push(inArray(
        orders.id,
        db
          .select({ orderId: orderItems.orderId })
          .from(orderItems)
          .innerJoin(products, eq(orderItems.productId, products.id))
          .where(eq(products.sellerId, sellerId))
      ));
    }

    if (orderType === "guest") {
      conditions.push(exists(
        db.select({ id: guestOrders.id }).from(guestOrders).where(eq(guestOrders.orderId, orders.id))
      ));
    } else if (orderType === "registered") {
      conditions.push(notExists(
        db.select({ id: guestOrders.id }).from(guestOrders).where(eq(guestOrders.orderId, orders.id))
      ));
    }

    // Build where clause
    const whereClause = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    // Search includes related customer, product, and seller fields, so it must be applied after hydration.
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    if (!search) {
      let countQuery = db.select({ count: count() }).from(orders);
      if (whereClause) {
        countQuery = countQuery.where(whereClause) as any;
      }
      const [totalResult, ordersData] = await Promise.all([
        countQuery,
        query.limit(limit).offset(offset),
      ]);
      const total = totalResult[0]?.count || 0;
      const ordersWithDetails = await fetchOrderDetails(ordersData);

      return paginatedResponse(ordersWithDetails, page, limit, total);
    }

    const ordersData = await query;
    const ordersWithDetails = await fetchOrderDetails(ordersData);
    const filteredOrders = ordersWithDetails.filter((order) => matchesOrderSearch(order, search));
    const paginatedOrders = filteredOrders.slice(offset, offset + limit);

    return paginatedResponse(paginatedOrders, page, limit, filteredOrders.length);
  } catch (error) {
    return handleApiError(error, "Failed to fetch orders", "خطا در دریافت سفارشات");
  }
}
