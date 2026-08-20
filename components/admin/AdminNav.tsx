"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FiSettings, FiBell, FiUser, FiLogOut, FiExternalLink, FiChevronDown, FiX } from "react-icons/fi";
import AdminNotificationDropdown from "./AdminNotificationDropdown";
import styles from "@/styles/components/_adminNav.module.scss";

interface AdminNavProps {
  onNavigateToOrders?: () => void; // Callback to navigate to orders section
  onNavigateToReviews?: () => void; // Callback to navigate to reviews section
}

interface AdminProfile {
  name: string | null;
  surname: string | null;
  email: string;
}

export default function AdminNav({ onNavigateToOrders, onNavigateToReviews }: AdminNavProps = {}) {
  const { language, setLanguage, t } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch admin profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setAdminProfile({
            name: data.name,
            surname: data.surname,
            email: data.email,
          });
        }
      } catch (error) {
        console.error("Error fetching admin profile:", error);
      }
    };

    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  useEffect(() => {
    checkNotifications();

    // Refresh notifications every 30 seconds
    const interval = setInterval(() => checkNotifications(), 30000);
    return () => clearInterval(interval);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [profileDropdownOpen]);

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/admin" });
    router.push("/login");
    router.refresh();
  };

  const checkNotifications = async () => {
    try {
      const response = await fetch("/api/admin/notifications");
      if (response.ok) {
        const data = await response.json();
        const notifications = data.notifications || [];
        const hasUnread = notifications.some(
          (notification: { isRead: boolean }) => !notification.isRead
        );
        setHasNotifications(hasUnread);
      }
    } catch (error) {
      console.error("Error checking notifications:", error);
    }
  };

  const getInitials = (name: string | null, surname: string | null) => {
    if (name && surname) {
      return (name[0] + surname[0]).toUpperCase();
    }
    if (name) {
      return name.substring(0, 2).toUpperCase();
    }
    return "A";
  };

  const displayName = adminProfile
    ? adminProfile.surname
      ? `${adminProfile.name} ${adminProfile.surname}`
      : adminProfile.name || "Admin"
    : session?.user?.name || "Admin";

  const handleNotificationClick = () => {
    setNotificationOpen(!notificationOpen);
  };

  const handleNotificationClose = () => {
    setNotificationOpen(false);
    // Refresh notification status after closing
    checkNotifications();
  };

  return (
    <>
      <div className={styles.topBar}>
        <div className={styles.topBarContainer}>
          <div className={styles.adminTitle}>
            <FiSettings />
            <span>{t("Admin Panel", "پنل مدیریت")}</span>
          </div>
          <div className={styles.topBarActions}>
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
              className={styles.topIconBtn}
              onClick={handleNotificationClick}
              style={{ position: "relative" }}
            >
              <FiBell />
              {hasNotifications && (
                <span
                  className={styles.alertBadge}
                  style={{
                    position: "absolute",
                    top: "-5px",
                    right: "-5px",
                    background: "#e74c3c",
                    color: "white",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: "bold",
                  }}
                >
                  !
                </span>
              )}
            </button>
            <div ref={profileDropdownRef} className={styles.profileDropdown}>
              <button
                className={styles.profileButton}
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <div className={styles.profileAvatar}>
                  {getInitials(adminProfile?.name || null, adminProfile?.surname || null)}
                </div>
                <span className={styles.profileName}>{displayName}</span>
                <FiChevronDown className={styles.profileChevron} />
              </button>
              {profileDropdownOpen && (
                <div className={styles.profileDropdownMenu}>
                  <div className={styles.profileDropdownHeader}>
                    <div className={styles.profileDropdownAvatar}>
                      {getInitials(adminProfile?.name || null, adminProfile?.surname || null)}
                    </div>
                    <div className={styles.profileDropdownInfo}>
                      <div className={styles.profileDropdownName}>{displayName}</div>
                      <div className={styles.profileDropdownEmail}>
                        {adminProfile?.email || session?.user?.email}
                      </div>
                    </div>
                  </div>
                  <div className={styles.profileDropdownDivider}></div>
                  <Link
                    href="/"
                    target="_blank"
                    className={styles.profileDropdownItem}
                    onClick={() => setProfileDropdownOpen(false)}
                  >
                    <FiExternalLink />
                    <span>{t("View Site", "مشاهده سایت")}</span>
                  </Link>
                  <button
                    className={`${styles.profileDropdownItem} ${styles.profileDropdownItemDanger}`}
                    onClick={handleLogout}
                  >
                    <FiLogOut />
                    <span>{t("Logout", "خروج")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <AdminNotificationDropdown
        isOpen={notificationOpen}
        onClose={handleNotificationClose}
        onNavigateToOrders={onNavigateToOrders}
        onNavigateToReviews={onNavigateToReviews}
        onNotificationsUpdated={checkNotifications}
      />
    </>
  );
}

