// app/api/admin/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { orders, orderItems, products } from "@/lib/db/schema";
import { eq, desc, and, gte, lte, count, inArray, ne } from "drizzle-orm";
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
      const matchingOrderItems = await db
        .select({ orderId: orderItems.orderId })
        .from(orderItems)
        .innerJoin(products, eq(orderItems.productId, products.id))
        .where(eq(products.sellerId, sellerId));

      const matchingOrderIds = Array.from(new Set(matchingOrderItems.map((item) => item.orderId)));

      if (matchingOrderIds.length === 0) {
        return paginatedResponse([], page, limit, 0);
      }

      conditions.push(inArray(orders.id, matchingOrderIds));
    }

    // Build where clause
    const whereClause = conditions.length > 0
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;

    // Get total count
    let countQuery = db.select({ count: count() }).from(orders);
    if (whereClause) {
      countQuery = countQuery.where(whereClause) as any;
    }
    const totalResult = await countQuery;
    const total = totalResult[0]?.count || 0;

    // Fetch all matching orders first so search and order-type filters are applied across the full result set.
    let query = db.select().from(orders).orderBy(desc(orders.createdAt));
    if (whereClause) {
      query = query.where(whereClause) as any;
    }

    const ordersData = await query;

    // Fetch order details using helper function (now includes seller info)
    let ordersWithDetails = await fetchOrderDetails(ordersData);

    // Apply order type filter (guest/registered)
    if (orderType === "guest") {
      ordersWithDetails = ordersWithDetails.filter((o) => o.isGuest);
    } else if (orderType === "registered") {
      ordersWithDetails = ordersWithDetails.filter((o) => !o.isGuest);
    }

    // Apply search filter on the full filtered dataset before pagination.
    const finalOrders = search
      ? ordersWithDetails.filter((order) => matchesOrderSearch(order, search))
      : ordersWithDetails;

    const paginatedOrders = finalOrders.slice(offset, offset + limit);
    const totalFiltered = finalOrders.length;

    return paginatedResponse(paginatedOrders, page, limit, totalFiltered);
  } catch (error) {
    return handleApiError(error, "Failed to fetch orders", "خطا در دریافت سفارشات");
  }
}
