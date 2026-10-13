// app/api/admin/orders/helpers.ts
/**
 * Helper functions for orders routes
 */

import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users, products, sellers } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";

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
  if (ordersData.length === 0) {
    return [];
  }

  const orderIds = ordersData.map((order) => order.id);
  const userIds = Array.from(
    new Set(ordersData.map((order) => order.userId).filter((id): id is string => id !== null))
  );

  const [guestOrdersData, usersData, itemsData] = await Promise.all([
    db
      .select({
        orderId: guestOrders.orderId,
        guestName: guestOrders.guestName,
        guestEmail: guestOrders.guestEmail,
        guestPhone: guestOrders.guestPhone,
        provinceId: guestOrders.provinceId,
        cityId: guestOrders.cityId,
        address: guestOrders.address,
        postalCode: guestOrders.postalCode,
      })
      .from(guestOrders)
      .where(inArray(guestOrders.orderId, orderIds)),
    userIds.length > 0
      ? db
        .select({
          id: users.id,
          name: users.name,
          surname: users.surname,
          email: users.email,
          phone: users.phone,
        })
        .from(users)
        .where(inArray(users.id, userIds))
      : Promise.resolve([]),
    db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
  ]);

  const guestOrdersMap = new Map(guestOrdersData.map((guestOrder) => [guestOrder.orderId, guestOrder]));
  const usersMap = new Map(usersData.map((user) => [user.id, user]));
  const itemsByOrderId = new Map<string, typeof itemsData>();
  for (const item of itemsData) {
    const orderItemsForOrder = itemsByOrderId.get(item.orderId);
    if (orderItemsForOrder) {
      orderItemsForOrder.push(item);
    } else {
      itemsByOrderId.set(item.orderId, [item]);
    }
  }

  const productIds = Array.from(new Set(itemsData.map((item) => item.productId)));
  const productsData = productIds.length > 0
    ? await db
      .select({ id: products.id, sellerId: products.sellerId })
      .from(products)
      .where(inArray(products.id, productIds))
    : [];
  const productsMap = new Map(productsData.map((product) => [product.id, product]));

  const sellerIds = Array.from(
    new Set(productsData.map((product) => product.sellerId).filter((id): id is string => id !== null))
  );
  const sellersData = sellerIds.length > 0
    ? await db
      .select({ id: sellers.id, nameEn: sellers.nameEn, nameFa: sellers.nameFa })
      .from(sellers)
      .where(inArray(sellers.id, sellerIds))
    : [];
  const sellersMap = new Map(sellersData.map((seller) => [seller.id, seller]));

  return ordersData.map((order) => {
    const items = itemsByOrderId.get(order.id) || [];
    const guestOrder = guestOrdersMap.get(order.id);
    const user = order.userId ? usersMap.get(order.userId) : null;
    const itemsWithSellerInfo = items.map((item) => {
      const product = productsMap.get(item.productId);
      const sellerInfo = product?.sellerId ? sellersMap.get(product.sellerId) : null;

      return {
        productName: item.productName,
        productNameFa: item.productNameFa || null,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sellerId: product?.sellerId || undefined,
        sellerNameEn: sellerInfo?.nameEn || undefined,
        sellerNameFa: sellerInfo?.nameFa || undefined,
      };
    });

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
      shippingStatus: order.shippingStatus,
      total: parseFloat(order.total),
      shippingCost,
      paymentMethod: order.paymentMethod,
      items: itemsWithSellerInfo,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  });
}
