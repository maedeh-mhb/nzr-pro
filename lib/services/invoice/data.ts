/**
 * Invoice data fetching
 */

import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, products, contactSettings, users, addresses } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import type { InvoiceData } from "./types";

/**
 * Get invoice data for an order
 */
export async function getInvoiceData(orderId: string): Promise<InvoiceData | null> {
  try {
    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return null;
    }

    // Fetch order items with product details
    const items = await db
      .select({
        id: orderItems.id,
        orderId: orderItems.orderId,
        productId: orderItems.productId,
        productName: orderItems.productName,
        price: orderItems.price,
        quantity: orderItems.quantity,
        fulfilledQuantity: orderItems.fulfilledQuantity,
        nameFa: products.nameFa,
        category: products.category,
      })
      .from(orderItems)
      .leftJoin(products, eq(orderItems.productId, products.id))
      .where(eq(orderItems.orderId, orderId));

    // Get customer information
    let customerName = "";
    let customerEmail = "";
    let customerPhone = "";
    let customerAddress = "";

    if (order.userId) {
      // Registered user
      const user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
      });

      if (user) {
        customerName = `${user.name} ${user.surname || ""}`.trim();
        customerEmail = user.email || "";
        customerPhone = user.phone || "";

        // Get user's address (use default or first address)
        // First try to get default address, then get most recent
        const defaultAddress = await db.query.addresses.findFirst({
          where: eq(addresses.userId, order.userId),
        });

        // If no default, get the most recent address
        const userAddresses = await db
          .select()
          .from(addresses)
          .where(eq(addresses.userId, order.userId))
          .orderBy(desc(addresses.createdAt))
          .limit(1);

        const userAddress = defaultAddress || userAddresses[0];

        if (userAddress) {
          // Format address with province and city names
          // You may need to load province/city data from JSON files
          customerAddress = userAddress.address;
        }
      }
    } else {
      // Guest order
      const guestOrder = await db.query.guestOrders.findFirst({
        where: eq(guestOrders.orderId, orderId),
      });

      if (guestOrder) {
        customerName = guestOrder.guestName;
        customerEmail = guestOrder.guestEmail || "";
        customerPhone = guestOrder.guestPhone || "";
        customerAddress = guestOrder.address;
      }
    }

    if (!customerAddress && order.shippingAddress) {
      customerAddress = order.shippingAddress;
      if (order.shippingPostalCode) {
        customerAddress += `، کد پستی: ${order.shippingPostalCode}`;
      }
    }

    // Get company information from contact settings
    const contactSettingsData = await db.query.contactSettings.findFirst();
    const companyName = "Nazira";
    const companyAddress = contactSettingsData?.addressFa || contactSettingsData?.address || "";
    const companyPhone = contactSettingsData?.phone || "";
    const companyEmail = contactSettingsData?.email || "";

    return {
      order,
      orderItems: items.map((item) => ({
        ...item,
        productNameFa: item.nameFa,
        category: item.category,
      })),
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      companyName,
      companyAddress,
      companyPhone,
      companyEmail,
    };
  } catch (error) {
    console.error("Error getting invoice data:", error);
    return null;
  }
}

