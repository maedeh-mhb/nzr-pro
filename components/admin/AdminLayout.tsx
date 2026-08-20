"use client";

import { useState, useEffect, Suspense } from "react";
import { useLanguage } from "@/lib/utils/language";
import AdminNav from "./AdminNav";
import AdminSidebar from "./AdminSidebar";
import AdminBottomNav from "./AdminBottomNav";
import Breadcrumbs from "./Breadcrumbs";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  DashboardSection,
  UsersSection,
  ProductsSection,
  OrdersSection,
  ContentSection,
  SettingsSection,
  ContactSettingsSection,
  ContactMessagesSection,
  InventorySection,
  ReviewsSection,
  RefundsSection,
  AnalyticsSection,
  SellersSection,
  HomeNoteSection,
} from "./lazy-sections";
import AuditTrailSection from "./sections/AuditTrailSection";
import PermissionsSection from "./sections/PermissionsSection";
import SystemHealthSection from "./sections/SystemHealthSection";
import styles from "@/styles/components/_admin.module.scss";

export default function AdminLayout() {
  const { language, t } = useLanguage();
  const [activeSection, setActiveSection] = useState("dashboard");

  // Section titles and breadcrumbs mapping
  const sectionTitles: Record<string, { en: string; fa: string }> = {
    dashboard: { en: "Dashboard", fa: "داشبورد" },
    users: { en: "User Management", fa: "مدیریت کاربران" },
    products: { en: "Product Management", fa: "مدیریت محصولات" },
    inventory: { en: "Inventory Management", fa: "مدیریت موجودی" },
    orders: { en: "Order Management", fa: "مدیریت سفارشات" },
    refunds: { en: "Refunds Management", fa: "مدیریت بازپرداخت‌ها" },
    analytics: { en: "Analytics & Reports", fa: "آمار و گزارش‌ها" },
    content: { en: "Journal Management", fa: "مدیریت مجله" },
    settings: { en: "Settings", fa: "تنظیمات" },
    contactSettings: { en: "Contact Settings", fa: "تنظیمات تماس" },
    contactMessages: { en: "Contact Messages", fa: "پیام‌های تماس" },
    reviews: { en: "Reviews", fa: "نظرات" },
    auditTrail: { en: "Audit Trail", fa: "سوابق حسابرسی" },
    permissions: { en: "Permissions & Roles", fa: "مجوزها و نقش‌ها" },
    systemHealth: { en: "System Health", fa: "وضعیت سیستم" },
    sellers: { en: "Sellers / Vendors", fa: "فروشندگان" },
  };

  // Update page title based on active section
  useEffect(() => {
    const title = sectionTitles[activeSection]?.[language] || sectionTitles.dashboard[language];
    document.title = `${title} - Admin Panel`;
  }, [activeSection, language]);

  // Get breadcrumb items for current section
  const getBreadcrumbItems = () => {
    const currentTitle = sectionTitles[activeSection];
    if (!currentTitle) return [];

    return [
      {
        label: currentTitle.en,
        labelFa: currentTitle.fa,
        onClick: () => setActiveSection(activeSection),
      },
    ];
  };

  return (
    <>
      <AdminNav 
        onNavigateToOrders={() => setActiveSection("orders")}
        onNavigateToReviews={() => setActiveSection("reviews")}
      />
      <AdminSidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className={styles.adminContainer}>
        <Breadcrumbs items={getBreadcrumbItems()} />
        <Suspense
          fallback={
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: "400px",
              }}
            >
              <LoadingSpinner />
            </div>
          }
        >
          <div className={`${styles.section} ${activeSection === "dashboard" ? styles.active : ""}`}>
            {activeSection === "dashboard" && (
              <DashboardSection setActiveSection={setActiveSection} />
            )}
          </div>
          <div className={`${styles.section} ${activeSection === "users" ? styles.active : ""}`}>
            {activeSection === "users" && <UsersSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "products" ? styles.active : ""}`}>
            {activeSection === "products" && <ProductsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "sellers" ? styles.active : ""}`}>
            {activeSection === "sellers" && <SellersSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "inventory" ? styles.active : ""}`}>
            {activeSection === "inventory" && <InventorySection />}
          </div>
          <div className={`${styles.section} ${activeSection === "orders" ? styles.active : ""}`}>
            {activeSection === "orders" && <OrdersSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "content" ? styles.active : ""}`}>
            {activeSection === "content" && <ContentSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "homeNote" ? styles.active : ""}`}>
            {activeSection === "homeNote" && <HomeNoteSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "settings" ? styles.active : ""}`}>
            {activeSection === "settings" && <SettingsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "contactSettings" ? styles.active : ""}`}>
            {activeSection === "contactSettings" && <ContactSettingsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "contactMessages" ? styles.active : ""}`}>
            {activeSection === "contactMessages" && <ContactMessagesSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "reviews" ? styles.active : ""}`}>
            {activeSection === "reviews" && <ReviewsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "refunds" ? styles.active : ""}`}>
            {activeSection === "refunds" && <RefundsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "analytics" ? styles.active : ""}`}>
            {activeSection === "analytics" && <AnalyticsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "auditTrail" ? styles.active : ""}`}>
            {activeSection === "auditTrail" && <AuditTrailSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "permissions" ? styles.active : ""}`}>
            {activeSection === "permissions" && <PermissionsSection />}
          </div>
          <div className={`${styles.section} ${activeSection === "systemHealth" ? styles.active : ""}`}>
            {activeSection === "systemHealth" && <SystemHealthSection />}
          </div>
        </Suspense>
      </div>
      <AdminBottomNav activeSection={activeSection} setActiveSection={setActiveSection} />
    </>
  );
}
