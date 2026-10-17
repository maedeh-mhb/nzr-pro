"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { FiHome, FiUser, FiShoppingCart, FiPackage } from "react-icons/fi";
import { useLanguage } from "@/lib/utils/language";
import { useCart } from "@/lib/contexts/CartContext";
import styles from "@/styles/components/_bottomBar.module.scss";

export default function BottomBar() {
  const { t } = useLanguage();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { openCart, closeCart, isOpen, getTotalItems } = useCart();
  const [isMobile, setIsMobile] = useState(false);

  const isDashboard = pathname?.startsWith("/dashboard");
  const totalItems = getTotalItems();
  const barePath = (pathname || "/").replace(/^\/(en|fa)(?=\/|$)/, "") || "/";
  const [isPastMainBanner, setIsPastMainBanner] = useState(false);
  const [isOverFooter, setIsOverFooter] = useState(false);
  const isSolidGreen =
    isPastMainBanner ||
    isOverFooter ||
    barePath === "/" ||
    barePath === "/products" ||
    !/^\/(login)(\/|$)/.test(barePath);

  // Same rule as the top navbar: green once the main banner is scrolled past, and when the footer reaches the bar
  useEffect(() => {
    const update = () => {
      const banner = document.querySelector<HTMLElement>("[data-main-banner]");
      setIsPastMainBanner(banner ? banner.getBoundingClientRect().bottom <= 0 : false);
      const footer = document.querySelector<HTMLElement>("footer");
      setIsOverFooter(footer ? footer.getBoundingClientRect().top <= window.innerHeight : false);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [pathname]);

  // Check if we're on mobile viewport (max-width: 640px)
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  // Handler to close cart on mobile when clicking bottom bar buttons
  const handleBottomBarClick = () => {
    if (isMobile && isOpen) {
      closeCart();
    }
  };

  if (isDashboard) {
    return null;
  }

  return (
    <div className={`${styles.bottomBar} ${isSolidGreen ? styles.bottomBarGreen : ""} ${isOpen ? styles.bottomBarOpen : ""}`}>
      <div className={styles.container}>
        <Link
          href="/"
          className={styles.item}
          onClick={handleBottomBarClick}
          aria-label={t("Home", "خانه")}
          title={t("Home", "خانه")}
        >
          <FiHome />
          <span>{t("Home", "خانه")}</span>
        </Link>

        <Link
          href="/products"
          className={styles.item}
          onClick={handleBottomBarClick}
          aria-label={t("Products", "محصولات")}
          title={t("Products", "محصولات")}
        >
          <FiPackage />
          <span>{t("Products", "محصولات")}</span>
        </Link>

        {session ? (
          <Link
            href="/dashboard"
            className={`${styles.item} ${styles.itemLoggedIn}`}
            onClick={handleBottomBarClick}
            aria-label={t("Profile", "پروفایل")}
            title={t("Profile", "پروفایل")}
          >
            <FiUser />
            <span>{t("Profile", "پروفایل")}</span>
          </Link>
        ) : (
          <Link
            href="/login"
            className={styles.item}
            onClick={handleBottomBarClick}
            aria-label={t("Login", "ورود")}
            title={t("Login", "ورود")}
          >
            <FiUser />
            <span>{t("Login", "ورود")}</span>
          </Link>
        )}

        <button
          className={styles.item}
          onClick={() => {
            if (isMobile && isOpen) {
              closeCart();
            } else {
              openCart();
            }
          }}
          aria-label={t("Cart", "سبد خرید")}
          title={t("Cart", "سبد خرید")}
        >
          <FiShoppingCart />
          <span>{t("Cart", "سبد خرید")}</span>
          {totalItems > 0 && (
            <span className={styles.badge}>{totalItems}</span>
          )}
        </button>
      </div>
    </div>
  );
}
