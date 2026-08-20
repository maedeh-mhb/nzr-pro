"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import { 
  FiBell, 
  FiPackage, 
  FiDollarSign, 
  FiGift, 
  FiCheckCircle, 
  FiHeart,
  FiArrowLeft
} from "react-icons/fi";
import styles from "@/styles/components/_dashboard.module.scss";

interface Notification {
  id: string;
  type: string;
  title: string;
  titleFa?: string;
  message: string;
  messageFa?: string;
  isRead: boolean;
  notificationData?: Record<string, any>;
  createdAt: Date | string;
}

interface NotificationsSectionProps {
  setActiveSection: (section: string) => void;
}

export default function NotificationsSection({ setActiveSection }: NotificationsSectionProps) {
  const { t, language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async (loadMore = false) => {
    try {
      setLoading(true);
      const currentPage = loadMore ? page + 1 : 1;
      const response = await fetch(`/api/user/notifications?limit=10&page=${currentPage}`);
      if (response.ok) {
        const data = await response.json();
        const newNotifications = data.data || [];
        
        if (loadMore) {
          setNotifications((prev) => [...prev, ...newNotifications]);
        } else {
          setNotifications(newNotifications);
        }
        
        setPage(currentPage);
        setHasMore(data.pagination?.hasNext || false);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error(t("Failed to load notifications", "خطا در بارگذاری اعلانات"));
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchNotifications(true);
  };

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch("/api/user/notifications/mark-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (response.ok) {
        await fetchNotifications();
        toast.success(t("All marked as read", "همه به عنوان خوانده شده علامت زده شد"));
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast.error(t("Failed to mark as read", "خطا در علامت گذاری"));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "order_pending":
      case "order_shipped":
      case "order_delivered":
        return <FiPackage />;
      case "wallet_credit":
      case "payment_received":
        return <FiDollarSign />;
      case "special_offer":
      case "promotion":
        return <FiGift />;
      case "order_confirmed":
        return <FiCheckCircle />;
      case "wishlist_update":
        return <FiHeart />;
      default:
        return <FiBell />;
    }
  };

  const getNotificationText = (notification: Notification) => {
    const text = language === "fa" && notification.messageFa
      ? notification.messageFa
      : notification.message;
    return text;
  };

  const formatTime = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === "fa" ? "هم اکنون" : "just now";
    }
    if (diffMins < 60) {
      return language === "fa" 
        ? `${diffMins} دقیقه پیش`
        : `${diffMins}m ago`;
    }
    if (diffHours < 24) {
      return language === "fa"
        ? `${diffHours} ساعت پیش`
        : `${diffHours}h ago`;
    }
    if (diffDays < 7) {
      return language === "fa"
        ? `${diffDays} روز پیش`
        : `${diffDays}d ago`;
    }
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(d);
  };

  return (
    <>
      <button
        className={styles.backButton}
        onClick={() => setActiveSection("home")}
      >
        <FiArrowLeft />
        <span>{t("Back to Dashboard", "بازگشت به داشبورد")}</span>
      </button>
      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiBell /></span>
            <span>{t("Notifications", "اعلانات")}</span>
          </h3>
          <button
            className={styles.cardAction}
            onClick={handleMarkAllAsRead}
            style={{ border: "none", background: "none", cursor: "pointer", color: "inherit" }}
          >
            {t("Mark all read", "همه را خوانده شده علامت بزن")}
          </button>
        </div>

        {loading && notifications.length === 0 ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>{t("Loading notifications...", "در حال بارگذاری اعلانات...")}</p>
          </div>
        ) : notifications.length > 0 ? (
          <>
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`${styles.notificationItem} ${
                  !notification.isRead ? styles.notificationUnread : ""
                }`}
              >
                <div className={styles.notificationIcon}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className={styles.notificationText}>
                  {getNotificationText(notification)}
                </div>
                <div className={styles.notificationTime}>
                  {formatTime(notification.createdAt)}
                </div>
              </div>
            ))}
            {hasMore && (
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderTop: "1px solid #eee",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--primary-color)",
                  fontSize: "0.9rem",
                }}
              >
                {t("Load more", "بیشتر بارگذاری کنید")}
              </button>
            )}
          </>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ opacity: 0.6 }}>
              {t("No notifications", "اعلانی وجود ندارد")}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
