/**
 * Prefetch utilities for likely next actions
 */

import { prefetch } from "./fetch";

/**
 * Prefetch user profile when hovering over user-related links
 */
export function prefetchUserProfile(userId: string) {
  prefetch(`/api/user/profile?id=${userId}`);
}

/**
 * Prefetch order details when hovering over order links
 */
export function prefetchOrderDetails(orderId: string) {
  prefetch(`/api/admin/orders/${orderId}`);
}

/**
 * Prefetch product details when hovering over product links
 */
export function prefetchProductDetails(productId: string) {
  prefetch(`/api/products/${productId}`);
}

/**
 * Prefetch admin section data
 */
export function prefetchAdminSection(section: string) {
  const sectionMap: Record<string, string> = {
    orders: "/api/admin/orders",
    users: "/api/admin/users",
    products: "/api/admin/products",
    analytics: "/api/admin/analytics",
    settings: "/api/admin/settings",
  };

  const url = sectionMap[section];
  if (url) {
    prefetch(url);
  }
}

