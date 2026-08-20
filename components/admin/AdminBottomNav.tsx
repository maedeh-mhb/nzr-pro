"use client";

import { useLanguage } from "@/lib/utils/language";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  FiBarChart2,
  FiUsers,
  FiShoppingBag,
  FiPackage,
  FiFileText,
  FiSettings,
  FiLogOut,
  FiMail,
  FiMessageSquare,
  FiLayers,
  FiStar,
  FiDollarSign,
  FiShield,
  FiActivity,
  FiMonitor,
} from "react-icons/fi";
import styles from "@/styles/components/_adminBottomNav.module.scss";

interface AdminBottomNavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function AdminBottomNav({ activeSection, setActiveSection }: AdminBottomNavProps) {
  const { t } = useLanguage();
  const router = useRouter();

  const navItems = [
    { id: "dashboard", icon: FiBarChart2, label: t("Dashboard", "داشبورد") },
    { id: "users", icon: FiUsers, label: t("Users", "کاربران") },
    { id: "products", icon: FiShoppingBag, label: t("Products", "محصولات") },
    { id: "inventory", icon: FiLayers, label: t("Inventory", "موجودی") },
    { id: "orders", icon: FiPackage, label: t("Orders", "سفارشات") },
    { id: "refunds", icon: FiDollarSign, label: t("Refunds", "بازپرداخت‌ها") },
    { id: "analytics", icon: FiBarChart2, label: t("Analytics", "آمار") },
    { id: "content", icon: FiFileText, label: t("Journal", "مجله") },
    { id: "settings", icon: FiSettings, label: t("Settings", "تنظیمات") },
    { id: "contactSettings", icon: FiMail, label: t("Contact", "تماس") },
    { id: "contactMessages", icon: FiMessageSquare, label: t("Messages", "پیام‌ها") },
    { id: "reviews", icon: FiStar, label: t("Reviews", "نظرات") },
    { id: "auditTrail", icon: FiShield, label: t("Audit", "ممیزی") },
    { id: "permissions", icon: FiActivity, label: t("Permissions", "مجوزها") },
    { id: "systemHealth", icon: FiMonitor, label: t("Health", "سلامت") },
  ];

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/admin" });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className={styles.bottomNav}>
      <div className={styles.bottomNavContainer}>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`${styles.navItem} ${activeSection === item.id ? styles.active : ""}`}
              onClick={() => setActiveSection(item.id)}
            >
              <span className={styles.navItemIcon}>
                <Icon />
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
        <button className={styles.logoutItem} onClick={handleLogout}>
          <span className={styles.navItemIcon}>
            <FiLogOut />
          </span>
          <span>{t("Logout", "خروج")}</span>
        </button>
      </div>
    </nav>
  );
}

