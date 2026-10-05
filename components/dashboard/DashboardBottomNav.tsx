"use client";

import { useLanguage } from "@/lib/utils/language";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FiGrid, FiHome, FiPackage, FiShoppingBag, FiShoppingCart, FiUser, FiMessageCircle, FiLogOut } from "react-icons/fi";
import styles from "@/styles/components/_dashboard.module.scss";
import { useCart } from "@/lib/contexts/CartContext";

interface DashboardBottomNavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function DashboardBottomNav({
  activeSection,
  setActiveSection,
}: DashboardBottomNavProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { openCart, isOpen, getTotalItems } = useCart();

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className={`${styles.bottomNav} ${styles.bottomNavVertical}`}>
      <div className={styles.bottomNavContainer}>
        <button
          className={styles.navItem}
          onClick={() => {
            router.push(`/${language}`);
            router.refresh();
          }}
        >
          <span className={styles.navItemIcon}>
            <FiHome />
          </span>
          <span>{t("Home", "خانه")}</span>
        </button>
        <button
          className={`${styles.navItem} ${activeSection === "home" ? styles.active : ""}`}
          onClick={() => setActiveSection("home")}
        >
          <span className={styles.navItemIcon}>
            <FiGrid />
          </span>
          <span>{t("Dashboard", "داشبورد")}</span>
        </button>
        <button
          className={styles.navItem}
          onClick={() => {
            router.push("/products");
            router.refresh();
          }}
        >
          <span className={styles.navItemIcon}>
            <FiShoppingBag />
          </span>
          <span>{t("Shop", "خرید")}</span>
        </button>
        <button
          className={`${styles.navItem} ${isOpen ? styles.active : ""}`}
          onClick={openCart}
          aria-label={t("Shopping Cart", "سبد خرید")}
          title={t("Shopping Cart", "سبد خرید")}
        >
          <span className={styles.navItemIcon}>
            <FiShoppingCart />
          </span>
          <span>{t("Shopping Cart", "سبد خرید")}</span>
          {getTotalItems() > 0 && <span>({getTotalItems()})</span>}
        </button>
        <button
          className={`${styles.navItem} ${activeSection === "orders" ? styles.active : ""}`}
          onClick={() => setActiveSection("orders")}
        >
          <span className={styles.navItemIcon}>
            <FiPackage />
          </span>
          <span>{t("Orders", "سفارشات")}</span>
        </button>
        <button
          className={`${styles.navItem} ${activeSection === "profile" ? styles.active : ""}`}
          onClick={() => setActiveSection("profile")}
        >
          <span className={styles.navItemIcon}>
            <FiUser />
          </span>
          <span>{t("Profile", "پروفایل")}</span>
        </button>
        <button
          className={`${styles.navItem} ${activeSection === "messages" ? styles.active : ""}`}
          onClick={() => setActiveSection("messages")}
        >
          <span className={styles.navItemIcon}>
            <FiMessageCircle />
          </span>
          <span>{t("Messages", "پیام‌ها")}</span>
        </button>
        <button className={styles.logoutItem} onClick={handleLogout}>
          <span className={styles.navItemIcon}>
            <FiLogOut />
          </span>
          <span>{t("Logout", "خروج")}</span>
        </button>
      </div>
    </div>
  );
}
