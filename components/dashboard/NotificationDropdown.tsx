"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useSession } from "next-auth/react";
import { FiX, FiTag, FiPackage, FiShoppingCart, FiMessageCircle, FiCreditCard, FiGift } from "react-icons/fi";
import styles from "@/styles/components/_notificationDropdown.module.scss";

interface Notification {
  id: string;
  type: string;
  title: string;
  titleFa: string | null;
  message: string;
  messageFa: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss: (id: string) => void;
  onMarkAllRead?: () => void;
}

export default function NotificationDropdown({
  isOpen,
  onClose,
  onDismiss,
  onMarkAllRead,
}: NotificationDropdownProps) {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "unread" | "read">("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && session?.user) {
      fetchNotifications();
    }
  }, [isOpen, session]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/notifications?limit=20&page=1");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/user/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (response.ok) {
        await fetchNotifications();
        onMarkAllRead?.();
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  };
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = useMemo(() => {
    if (filterType === "unread") {
      return notifications.filter((n) => !n.isRead);
    } else if (filterType === "read") {
      return notifications.filter((n) => n.isRead);
    }
    return notifications;
  }, [notifications, filterType]);

  const handleDismiss = async (id: string) => {
    try {
      const response = await fetch(`/api/user/notifications/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        onDismiss(id);
      }
    } catch (error) {
      console.error("Error dismissing notification:", error);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "discount_code_available":
        return <FiTag />;
      case "order_pending":
      case "order_shipped":
      case "order_delivered":
        return <FiPackage />;
      case "cart_reminder":
        return <FiShoppingCart />;
      case "message_reply":
        return <FiMessageCircle />;
      case "payment_settings_changed":
        return <FiCreditCard />;
      case "reward_earned":
        return <FiGift />;
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div ref={dropdownRef} className={styles.dropdown}>
      <div className={styles.header}>
        <h3 className={styles.title}>
          {t("Notifications", "اعلان‌ها")}
          {unreadCount > 0 && (
            <span className={styles.unreadCountBadge}>{unreadCount}</span>
          )}
        </h3>
        <button className={styles.closeButton} onClick={onClose}>
          <FiX />
        </button>
      </div>
      <div className={styles.filters}>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterButton} ${filterType === "all" ? styles.active : ""}`}
            onClick={() => setFilterType("all")}
          >
            {t("All", "همه")}
          </button>
          <button
            className={`${styles.filterButton} ${filterType === "unread" ? styles.active : ""}`}
            onClick={() => setFilterType("unread")}
          >
            {t("Unread", "خوانده نشده")} {unreadCount > 0 && `(${unreadCount})`}
          </button>
          <button
            className={`${styles.filterButton} ${filterType === "read" ? styles.active : ""}`}
            onClick={() => setFilterType("read")}
          >
            {t("Read", "خوانده شده")}
          </button>
        </div>
        {unreadCount > 0 && (
          <button
            className={styles.markAllReadButton}
            onClick={markAllAsRead}
          >
            {t("Mark all as read", "علامت‌گذاری همه به عنوان خوانده شده")}
          </button>
        )}
      </div>
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>
            {t("Loading...", "در حال بارگذاری...")}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className={styles.empty}>
            {t("No notifications", "هیچ اعلانی وجود ندارد")}
          </div>
        ) : (
          <div className={styles.list}>
            {filteredNotifications.map((notification) => {
              const displayTitle = language === "fa" && notification.titleFa
                ? notification.titleFa
                : notification.title;
              const displayMessage = language === "fa" && notification.messageFa
                ? notification.messageFa
                : notification.message;

              return (
                <div
                  key={notification.id}
                  className={`${styles.item} ${!notification.isRead ? styles.unread : ""
                    }`}
                >
                  <div className={styles.itemIcon}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className={styles.itemContent}>
                    <h4 className={styles.itemTitle}>{displayTitle}</h4>
                    <p className={styles.itemMessage}>{displayMessage}</p>
                    <span className={styles.itemDate}>
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  {notification.type === "cart_reminder" && (
                    <button
                      className={styles.dismissButton}
                      onClick={() => handleDismiss(notification.id)}
                      aria-label={t("Dismiss", "بستن")}
                    >
                      <FiX />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

