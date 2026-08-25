// app/api/admin/orders/helpers.ts
/**
 * Helper functions for orders routes
 */

import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users, products, sellers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export interface OrderWithDetails {
  id: string;
  orderNumber: string;
  userId: string | null;
  isGuest: boolean;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  guestAddress: {
    provinceId: number;
    cityId: number;
    address: string;
    postalCode: string | null;
  } | null;
  shippingAddress: {
    provinceId: number;
    cityId: number;
    address: string;
    postalCode: string | null;
  } | null;
  status: string;
  total: number;
  shippingCost: number;
  paymentMethod: string | null;
  items: Array<{
    productName: string;
    productNameFa: string | null;
    quantity: number;
    price: number;
    sellerId?: string; // NEW: Seller ID
    sellerNameEn?: string; // NEW: Seller English name
    sellerNameFa?: string; // NEW: Seller Farsi name
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Fetch order details with related data including seller information
 */
export async function fetchOrderDetails(ordersData: typeof orders.$inferSelect[]): Promise<OrderWithDetails[]> {
  // Fetch guest orders
  const guestOrdersData = await db.select().from(guestOrders);

  // Create a map of orderId -> guestOrder
  const guestOrdersMap = new Map(
    guestOrdersData.map((go) => [go.orderId, go])
  );

  // Fetch user info for registered orders
  const userIds = ordersData
    .map((o) => o.userId)
    .filter((id): id is string => id !== null);

  // Fetch users one by one (inefficient but works)
  const usersMap = new Map<string, typeof users.$inferSelect>();
  for (const userId of userIds) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });
    if (user) {
      usersMap.set(userId, user);
    }
  }

  // Fetch order items for each order with product and seller information
  const ordersWithDetails = await Promise.all(
    ordersData.map(async (order) => {
      const items = await db.query.orderItems.findMany({
        where: eq(orderItems.orderId, order.id),
      });

      // Fetch product and seller information for each item
      const itemsWithSellerInfo = await Promise.all(
        items.map(async (item) => {
          // Get product information
          const product = await db.query.products.findFirst({
            where: eq(products.id, item.productId),
          });

          let sellerInfo = null;
          if (product?.sellerId) {
            // Get seller information
            sellerInfo = await db.query.sellers.findFirst({
              where: eq(sellers.id, product.sellerId),
            });
          }

          return {
            productName: item.productName,
            productNameFa: item.productNameFa || null,
            quantity: item.quantity,
            price: parseFloat(item.price),
            sellerId: product?.sellerId || undefined,
            sellerNameEn: sellerInfo?.nameEn || undefined,
            sellerNameFa: sellerInfo?.nameFa || undefined,
          };
        })
      );

      const guestOrder = guestOrdersMap.get(order.id);
      const user = order.userId ? usersMap.get(order.userId) : null;
      const subtotal = items.reduce((sum, item) => sum + parseFloat(item.price) * item.quantity, 0);
      const shippingCost = order.shippingMethod === "courier"
        ? 0
        : Math.max(0, parseFloat(order.total) - subtotal + parseFloat(order.discountAmount || "0"));

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
        customerPhone: guestOrder ? guestOrder.guestPhone : user?.phone || null,
        guestAddress: guestOrder
          ? {
            provinceId: guestOrder.provinceId,
            cityId: guestOrder.cityId,
            address: guestOrder.address,
            postalCode: guestOrder.postalCode || null,
          }
          : null,
        shippingAddress: (order.shippingProvinceId && order.shippingCityId && order.shippingAddress)
          ? {
            provinceId: order.shippingProvinceId,
            cityId: order.shippingCityId,
            address: order.shippingAddress,
            postalCode: order.shippingPostalCode || null,
          }
          : null,
        status: order.status,
        total: parseFloat(order.total),
        shippingCost,
        paymentMethod: order.paymentMethod,
        items: itemsWithSellerInfo,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    })
  );

  return ordersWithDetails;
}
