"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiX, FiRefreshCw, FiCreditCard, FiStar, FiFilter } from "react-icons/fi";
import styles from "@/styles/components/_notificationDropdown.module.scss";

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  titleFa: string;
  message: string;
  messageFa: string;
  isRead: boolean;
  createdAt: Date | string;
  data: {
    messageId?: string;
    orderId?: string;
    orderNumber?: string;
    name?: string;
    email?: string;
    subject?: string;
    total?: string;
  };
}

interface AdminNotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrders?: () => void; // Callback to navigate to orders section
  onNavigateToReviews?: () => void; // Callback to navigate to reviews section
  onNotificationsUpdated?: () => void; // Callback to refresh parent badge state
}

export default function AdminNotificationDropdown({
  isOpen,
  onClose,
  onNavigateToOrders,
  onNavigateToReviews,
  onNotificationsUpdated,
}: AdminNotificationDropdownProps) {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "unread" | "read">("all");
  const [groupByType, setGroupByType] = useState(true);
  const [localReadNotificationIds, setLocalReadNotificationIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

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
      const response = await fetch("/api/admin/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const storedIds = typeof window !== "undefined" ? window.localStorage.getItem("adminReadNotificationIds") : null;
    if (storedIds) {
      try {
        setLocalReadNotificationIds(JSON.parse(storedIds));
      } catch {
        setLocalReadNotificationIds([]);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("adminReadNotificationIds", JSON.stringify(localReadNotificationIds));
    }
  }, [localReadNotificationIds]);

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchNotifications();
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const markNotificationLocallyRead = (notificationId: string) => {
    setLocalReadNotificationIds((prev) =>
      prev.includes(notificationId) ? prev : [...prev, notificationId]
    );
  };

  const markNotificationsLocallyRead = (notificationIds: string[]) => {
    setLocalReadNotificationIds((prev) => {
      const nextSet = new Set(prev);
      notificationIds.forEach((id) => nextSet.add(id));
      return Array.from(nextSet);
    });
  };

  const resolvedNotifications = useMemo(() => {
    const readSet = new Set(localReadNotificationIds);
    return notifications.map((notification) => ({
      ...notification,
      isRead: notification.isRead || readSet.has(notification.id),
    }));
  }, [notifications, localReadNotificationIds]);

  const handleMarkAsRead = async (notificationId: string) => {
    markNotificationLocallyRead(notificationId);
    if (onNotificationsUpdated) onNotificationsUpdated();

    try {
      const response = await fetch("/api/admin/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (!response.ok) {
        console.warn("Admin mark-read request failed for", notificationId);
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const messageNotifications = resolvedNotifications.filter(
    (notification) => notification.type === "contact_message"
  );
  const unreadMessageNotifications = messageNotifications.filter(
    (notification) => !notification.isRead
  );

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  // Filter and group notifications
  const filteredAndGroupedNotifications = useMemo(() => {
    let filtered = resolvedNotifications;

    // Apply filter
    if (filterType === "unread") {
      filtered = filtered.filter((n) => !n.isRead);
    } else if (filterType === "read") {
      filtered = filtered.filter((n) => n.isRead);
    }

    // Group by type if enabled
    if (groupByType) {
      const grouped: Record<string, AdminNotification[]> = {};
      filtered.forEach((notification) => {
        const type = notification.type;
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(notification);
      });
      return grouped;
    }

    return { all: filtered };
  }, [resolvedNotifications, filterType, groupByType]);

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = resolvedNotifications.filter((notification) => !notification.isRead);
    if (unreadNotifications.length === 0) return;

    const allUnreadIds = unreadNotifications.map((notification) => notification.id);
    markNotificationsLocallyRead(allUnreadIds);
    if (onNotificationsUpdated) onNotificationsUpdated();

    try {
      const response = await fetch("/api/admin/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true, notificationIds: allUnreadIds }),
      });
      if (!response.ok) {
        console.warn("Admin mark-all request failed");
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const unreadCount = resolvedNotifications.filter((n) => !n.isRead).length;

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
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            className={styles.closeButton}
            onClick={handleRefresh}
            disabled={refreshing}
            aria-label={t("Refresh", "تازه‌سازی")}
            style={{
              background: "transparent",
              border: "none",
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.5 : 1,
            }}
          >
            <FiRefreshCw style={{ animation: refreshing ? "spin 1s linear infinite" : "none" }} />
          </button>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>
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
            onClick={handleMarkAllAsRead}
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
        ) : Object.keys(filteredAndGroupedNotifications).length === 0 ? (
          <div className={styles.empty}>
            {t("No notifications", "هیچ اعلانی وجود ندارد")}
          </div>
        ) : (
          <div className={styles.list}>
            {Object.entries(filteredAndGroupedNotifications).map(([type, typeNotifications]) => (
              <div key={type}>
                {groupByType && Object.keys(filteredAndGroupedNotifications).length > 1 && (
                  <div className={styles.groupHeader}>
                    {type === "new_order" && t("New Orders", "سفارشات جدید")}
                    {type === "payment_verification_needed" && t("Payment Verification", "تأیید پرداخت")}
                    {type === "invoice_request" && t("Invoice Requests", "درخواست‌های فاکتور")}
                    {type === "review_approval_needed" && t("Review Approval", "تأیید نظرات")}
                    {type === "contact_message" && t("Contact Messages", "پیام‌های تماس")}
                    {!["new_order", "payment_verification_needed", "invoice_request", "review_approval_needed", "contact_message"].includes(type) && type}
                    <span className={styles.groupCount}>({typeNotifications.length})</span>
                  </div>
                )}
                {typeNotifications.map((notification) => {
              const displayTitle = language === "fa" && notification.titleFa
                ? notification.titleFa
                : notification.title;
              const displayMessage = language === "fa" && notification.messageFa
                ? notification.messageFa
                : notification.message;

              // Handle click - mark as read and navigate if it's an order-related or review-related notification
              const handleNotificationClick = () => {
                if (!notification.isRead) {
                  markNotificationLocallyRead(notification.id);
                }
                if (!notification.isRead && notification.type === "contact_message") {
                  handleMarkAsRead(notification.id);
                }
                // Navigate to orders section if it's an order or payment verification notification
                if (
                  (notification.type === "new_order" || 
                   notification.type === "payment_verification_needed" ||
                   notification.type === "invoice_request") &&
                  onNavigateToOrders
                ) {
                  onNavigateToOrders();
                  onClose();
                }
                // Navigate to reviews section if it's a review approval notification
                if (
                  notification.type === "review_approval_needed" &&
                  onNavigateToReviews
                ) {
                  onNavigateToReviews();
                  onClose();
                }
              };

              return (
                <div
                  key={notification.id}
                  className={`${styles.item} ${
                    !notification.isRead ? styles.unread : ""
                  } ${notification.type === "payment_verification_needed" ? styles.paymentVerification : ""}
                  ${notification.type === "review_approval_needed" ? styles.reviewApproval : ""}`}
                  onClick={handleNotificationClick}
                  style={{ cursor: "pointer" }}
                >
                  <div className={styles.itemContent}>
                    {notification.type === "payment_verification_needed" && (
                      <FiCreditCard
                        style={{
                          color: "#f39c12",
                          marginRight: "0.5rem",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    {notification.type === "review_approval_needed" && (
                      <FiStar
                        style={{
                          color: "#6c9cb8",
                          marginRight: "0.5rem",
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1 }}>
                      <h4 className={styles.itemTitle}>{displayTitle}</h4>
                      <p className={styles.itemMessage}>{displayMessage}</p>
                      <span className={styles.itemDate}>
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

