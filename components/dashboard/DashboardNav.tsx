"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/lib/utils/language";
import { signOut, useSession } from "next-auth/react";
import { FiBell, FiLogOut } from "react-icons/fi";
import NotificationDropdown from "./NotificationDropdown";
import styles from "@/styles/components/_dashboard.module.scss";

interface DashboardNavProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

export default function DashboardNav({ activeSection, setActiveSection }: DashboardNavProps) {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch("/api/user/notifications");
      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  };

  // Poll for notifications every 30 seconds when page is visible
  useEffect(() => {
    if (!session?.user) return;

    // Initial fetch
    fetchUnreadCount();

    // Poll every 30 seconds, but only when page is visible
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchUnreadCount();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [session]);

  const handleNotificationClick = () => {
    setNotificationOpen(!notificationOpen);
  };

  const handleNotificationDismiss = () => {
    fetchUnreadCount();
  };

  return (
    <>
      <nav className={styles.topNav}>
        <div className={styles.topNavContainer}>
          <Link href="/" className={`${styles.navTitle} ${styles.navBrand}`}>
            <Image
              src="/images/logo.png"
              alt="Nazira logo"
              width={32}
              height={32}
              className={styles.navLogo}
              priority
            />
            <span className={styles.navBrandText}>Nazira</span>
          </Link>
          <div className={styles.navIcons}>
            <div className={styles.langSwitcher}>
              <button
                className={`${styles.langBtn} ${language === "en" ? styles.active : ""}`}
                onClick={() => setLanguage("en")}
              >
                EN
              </button>
              <button
                className={`${styles.langBtn} ${language === "fa" ? styles.active : ""}`}
                onClick={() => setLanguage("fa")}
              >
                فا
              </button>
            </div>
            <button
              className={styles.navIconBtn}
              onClick={handleNotificationClick}
              aria-label={t("Notifications", "اعلان‌ها")}
            >
              <FiBell />
              {unreadCount > 0 && (
                <span className={styles.notificationIndicator}>
                  <span className={styles.notificationExclamation}>!</span>
                </span>
              )}
            </button>
            <button className={`${styles.navIconBtn} ${styles.logoutBtn}`} onClick={() => signOut({ callbackUrl: "/" })}>
              <FiLogOut />
            </button>
          </div>
        </div>
      </nav>
      <NotificationDropdown
        isOpen={notificationOpen}
        onClose={() => setNotificationOpen(false)}
        onDismiss={handleNotificationDismiss}
        onMarkAllRead={fetchUnreadCount}
      />
    </>
  );
}
