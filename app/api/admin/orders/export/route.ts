import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users } from "@/lib/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";

function loadJsonData<T = any[]>(fileName: string): T {
  const filePath = path.join(process.cwd(), "public", "data", fileName);
  if (!fs.existsSync(filePath)) {
    return [] as unknown as T;
  }
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function getProvinceNameById(provinceId: number | null): string {
  if (provinceId == null) {
    return "";
  }

  const provinceFa = loadJsonData<Array<{ id: number; name: string }>>("provinces-fa.json").find(
    (province) => province.id === provinceId
  );
  if (provinceFa) {
    return provinceFa.name;
  }

  const provinceEn = loadJsonData<Array<{ id: number; name: string }>>("provinces-en.json").find(
    (province) => province.id === provinceId
  );
  return provinceEn?.name || "";
}

function getCityNameById(cityId: number | null): string {
  if (cityId == null) {
    return "";
  }

  const cityFa = loadJsonData<Array<{ id: number; name: string }>>("cities-fa.json").find(
    (city) => city.id === cityId
  );
  if (cityFa) {
    return cityFa.name;
  }

  const cityEn = loadJsonData<Array<{ id: number; name: string }>>("cities-en.json").find(
    (city) => city.id === cityId
  );
  return cityEn?.name || "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Export orders as CSV
 * GET /api/admin/orders/export?format=csv|word&search=...&status=...&paymentMethod=...&dateFrom=...&dateTo=...&orderType=...
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
    const format = searchParams.get("format") || "csv";

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

    // Fetch order items and build export data
    let ordersWithDetails = await Promise.all(
      ordersData.map(async (order) => {
        const items = await db.query.orderItems.findMany({
          where: eq(orderItems.orderId, order.id),
        });

        const guestOrder = guestOrdersMap.get(order.id);
        const user = order.userId ? usersMap.get(order.userId) : null;

        const customerAddress = guestOrder
          ? guestOrder.address || ""
          : order.shippingAddress || "";
        const customerProvince = guestOrder
          ? guestOrder.provinceId || null
          : order.shippingProvinceId || null;
        const customerCity = guestOrder
          ? guestOrder.cityId || null
          : order.shippingCityId || null;
        const customerPostalCode = guestOrder
          ? guestOrder.postalCode || ""
          : order.shippingPostalCode || "";

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
          customerProvinceName: getProvinceNameById(customerProvince),
          customerCityName: getCityNameById(customerCity),
          customerAddress,
          customerPostalCode,
          status: order.status,
          total: order.total,
          paymentMethod: order.paymentMethod,
          paymentVerified: order.paymentVerified ? "Yes" : "No",
          shippingMethod: order.shippingMethod || "",
          shippingStatus: order.shippingStatus || "",
          trackingCode: order.trackingCode || "",
          itemsCount: items.length,
          items: items.map((item) => `${item.productName} x${item.quantity}`).join("\n"),
          itemsFarsi: items
            .map((item) => `${item.productNameFa ?? item.productName} x${item.quantity}`)
            .join("\n"),
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

    if (format === "word") {
      const verifiedOrders = ordersWithDetails.filter((order) => order.paymentVerified === "Yes");
      const orderCells = verifiedOrders.map((order) => {
        const location = [order.customerProvinceName, order.customerCityName]
          .filter(Boolean)
          .join("، ");
        const items = escapeHtml(order.itemsFarsi).replace(/\n/g, "<br />");
        const contactDetails = [
          `نام و نام خانوادگی: ${escapeHtml(order.customerName)}`,
          `شماره تماس: ${escapeHtml(order.customerPhone || "")}`,
          `شهر و استان: ${escapeHtml(location)}`,
          `آدرس: ${escapeHtml(order.customerAddress)}`,
          `کد پستی: ${escapeHtml(order.customerPostalCode)}`,
          `سفارشات: ${items}`,
        ].join("<br />");

        return `<td>${contactDetails}</td>`;
      });
      const orderRows = Array.from({ length: Math.ceil(orderCells.length / 2) }, (_, index) => {
        const firstCell = orderCells[index * 2];
        const secondCell = orderCells[index * 2 + 1] || "<td></td>";
        return `<tr>${firstCell}${secondCell}</tr>`;
      }).join("");

      const wordDocument = `<!DOCTYPE html>
<html dir="rtl" lang="fa">
  <head>
    <meta charset="utf-8" />
    <style>
      @page { size: A4; margin: 1.5cm; }
      body { font-family: Tahoma, Arial, sans-serif; font-size: 11pt; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      tr { break-inside: avoid; page-break-inside: avoid; }
      td {
        width: 50%;
        border: 1px solid #000;
        padding: 8px;
        line-height: 1.7;
        vertical-align: top;
        break-inside: avoid;
        page-break-inside: avoid;
      }
    </style>
  </head>
  <body>
    <table>${orderRows}</table>
  </body>
</html>`;
      const timestamp = new Date().toISOString().split("T")[0];

      return new NextResponse(wordDocument, {
        headers: {
          "Content-Type": "application/msword; charset=utf-8",
          "Content-Disposition": `attachment; filename="orders-list-${timestamp}.doc"`,
        },
      });
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
      "Items (Farsi)",
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
        order.customerProvinceName || "",
        order.customerCityName || "",
        order.customerAddress,
        order.customerPostalCode,
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
        order.itemsFarsi,
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
