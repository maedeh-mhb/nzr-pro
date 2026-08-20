import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";

/**
 * Export orders as CSV
 * GET /api/admin/orders/export?search=...&status=...&paymentMethod=...&dateFrom=...&dateTo=...&orderType=...
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin or superadmin
    if (session.user.role !== "admin" && session.user.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters (same as GET /api/admin/orders)
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentMethod = searchParams.get("paymentMethod") || "";
    const dateFrom = searchParams.get("dateFrom") || "";
    const dateTo = searchParams.get("dateTo") || "";
    const orderType = searchParams.get("orderType") || "all";

    // Build where conditions (same logic as GET endpoint)
    const conditions: any[] = [];

    if (dateFrom) {
      conditions.push(gte(orders.createdAt, new Date(dateFrom)));
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      conditions.push(lte(orders.createdAt, toDate));
    }

    if (status) {
      conditions.push(eq(orders.status, status));
    }

    if (paymentMethod) {
      conditions.push(eq(orders.paymentMethod, paymentMethod));
    }

    const whereClause = conditions.length > 0 
      ? (conditions.length === 1 ? conditions[0] : and(...conditions))
      : undefined;
    
    const ordersData = await db
      .select()
      .from(orders)
      .where(whereClause)
      .orderBy(desc(orders.createdAt));

    // Fetch guest orders
    const guestOrdersData = await db.select().from(guestOrders);
    const guestOrdersMap = new Map(
      guestOrdersData.map((go) => [go.orderId, go])
    );

    // Fetch user info for registered orders
    const userIds = ordersData
      .map((o) => o.userId)
      .filter((id): id is string => id !== null);

    const usersMap = new Map<string, typeof users.$inferSelect>();
    for (const userId of userIds) {
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });
      if (user) {
        usersMap.set(userId, user);
      }
    }

    // Fetch province and city data for address lookups from JSON files
    const provincesFilePath = path.join(process.cwd(), "public", "data", "provinces-en.json");
    const citiesFilePath = path.join(process.cwd(), "public", "data", "cities-en.json");

    const provincesData = JSON.parse(fs.readFileSync(provincesFilePath, "utf8")) as Array<{ id: number; name: string }>;
    const citiesData = JSON.parse(fs.readFileSync(citiesFilePath, "utf8")) as Array<{ id: number; name: string; province_id?: number }>;

    const citiesMap = new Map(citiesData.map((c) => [c.id, c]));
    const provincesMap = new Map(provincesData.map((p) => [p.id, p]));

    // Fetch order items and build export data
    let ordersWithDetails = await Promise.all(
      ordersData.map(async (order) => {
        const items = await db.query.orderItems.findMany({
          where: eq(orderItems.orderId, order.id),
        });

        const guestOrder = guestOrdersMap.get(order.id);
        const user = order.userId ? usersMap.get(order.userId) : null;

        // Get address information for both guest and registered users
        let province = "";
        let city = "";
        let address = "";
        let postalCode = "";

        if (guestOrder) {
          // Guest address
          province = guestOrder.provinceId ? (provincesMap.get(guestOrder.provinceId)?.name || "") : "";
          city = guestOrder.cityId ? (citiesMap.get(guestOrder.cityId)?.name || "") : "";
          address = guestOrder.address || "";
          postalCode = guestOrder.postalCode || "";
        } else if (order.shippingProvinceId && order.shippingCityId && order.shippingAddress) {
          // Registered user address
          province = provincesMap.get(order.shippingProvinceId)?.name || "";
          city = citiesMap.get(order.shippingCityId)?.name || "";
          address = order.shippingAddress;
          postalCode = order.shippingPostalCode || "";
        }

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          isGuest: !!guestOrder,
          customerName: guestOrder
            ? guestOrder.guestName
            : user
            ? `${user.name} ${user.surname || ""}`.trim()
            : "Unknown",
          customerEmail: guestOrder ? guestOrder.guestEmail : user?.email || "",
          customerPhone: guestOrder ? guestOrder.guestPhone : user?.phone || "",
          province,
          city,
          address,
          postalCode,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentVerified: order.paymentVerified ? "Yes" : "No",
          shippingMethod: order.shippingMethod || "",
          shippingStatus: order.shippingStatus || "",
          trackingCode: order.trackingCode || "",
          itemsCount: items.length,
          items: items.map((item) => `${item.productName} x${item.quantity}`).join("; "),
          createdAt: order.createdAt,
          updatedAt: order.updatedAt,
        };
      })
    );

    // Apply order type filter
    if (orderType === "guest") {
      ordersWithDetails = ordersWithDetails.filter((o) => o.isGuest);
    } else if (orderType === "registered") {
      ordersWithDetails = ordersWithDetails.filter((o) => !o.isGuest);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      ordersWithDetails = ordersWithDetails.filter(
        (order) =>
          order.orderNumber.toLowerCase().includes(searchLower) ||
          order.customerName.toLowerCase().includes(searchLower) ||
          (order.customerEmail || "").toLowerCase().includes(searchLower) ||
          (order.customerPhone && order.customerPhone.toLowerCase().includes(searchLower))
      );
    }

    // Generate CSV
    const csvHeaders = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Province",
      "City",
      "Address",
      "Postal Code",
      "Order Type",
      "Status",
      "Total",
      "Payment Method",
      "Payment Verified",
      "Shipping Method",
      "Shipping Status",
      "Tracking Code",
      "Items Count",
      "Items",
      "Created At",
      "Updated At",
    ];

    const csvRows = ordersWithDetails.map((order) => {
      const formatDate = (date: Date | string) => {
        const d = typeof date === "string" ? new Date(date) : date;
        return d.toISOString().split("T")[0] + " " + d.toTimeString().split(" ")[0];
      };

      return [
        order.orderNumber,
        order.customerName,
        order.customerEmail,
        order.customerPhone || "",
        order.province,
        order.city,
        order.address,
        order.postalCode,
        order.isGuest ? "Guest" : "Registered",
        order.status,
        order.total,
        order.paymentMethod || "",
        order.paymentVerified,
        order.shippingMethod,
        order.shippingStatus,
        order.trackingCode,
        order.itemsCount.toString(),
        order.items,
        formatDate(order.createdAt),
        formatDate(order.updatedAt),
      ].map((field) => {
        // Escape CSV fields (handle commas, quotes, newlines)
        const fieldStr = String(field || "");
        if (fieldStr.includes(",") || fieldStr.includes('"') || fieldStr.includes("\n")) {
          return `"${fieldStr.replace(/"/g, '""')}"`;
        }
        return fieldStr;
      });
    });

    // Combine headers and rows
    const csvContent = [
      csvHeaders.join(","),
      ...csvRows.map((row) => row.join(",")),
    ].join("\n");

    // Add BOM for Excel UTF-8 support
    const csvWithBOM = "\uFEFF" + csvContent;

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `orders-export-${timestamp}.csv`;

    // Return CSV file
    return new NextResponse(csvWithBOM, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting orders:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to export orders", details: errorMessage },
      { status: 500 }
    );
  }
}

