/**
 * Lazy-loaded admin sections for code splitting
 */

import { lazy } from "react";

export const DashboardSection = lazy(
  () => import("./sections/DashboardSection")
);

export const OrdersSection = lazy(() => import("./sections/OrdersSection"));

export const UsersSection = lazy(() => import("./sections/UsersSection"));

export const ProductsSection = lazy(
  () => import("./sections/ProductsSection")
);

export const ReviewsSection = lazy(
  () => import("./sections/ReviewsSection")
);

export const DiscountCodesSection = lazy(
  () => import("./sections/DiscountCodesSection")
);

export const ContactMessagesSection = lazy(
  () => import("./sections/ContactMessagesSection")
);

export const InventorySection = lazy(
  () => import("./sections/InventorySection")
);

export const ContentSection = lazy(
  () => import("./sections/ContentSection")
);

export const ContactSettingsSection = lazy(
  () => import("./sections/ContactSettingsSection")
);

export const SettingsSection = lazy(
  () => import("./sections/SettingsSection")
);

export const AnalyticsSection = lazy(
  () => import("./sections/AnalyticsSection")
);

export const RefundsSection = lazy(
  () => import("./sections/RefundsSection")
);

export const SellersSection = lazy(
  () => import("./sections/SellersSections")
);

export const HomeNoteSection = lazy(
  () => import("./sections/HomeNoteSection")
);

