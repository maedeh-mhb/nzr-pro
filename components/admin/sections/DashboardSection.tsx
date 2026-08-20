"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiUsers, FiPackage, FiDollarSign, FiShoppingBag, FiActivity, FiTrendingUp, FiRefreshCw, FiMessageSquare, FiAlertCircle, FiX } from "react-icons/fi";
import StatCard from "../StatCard";
import StatCardSkeleton from "../StatCardSkeleton";
import QuickActionCard from "../QuickActionCard";
import ActivityItem from "../ActivityItem";
import AdminCard from "../AdminCard";
import DateRangeSelector from "../DateRangeSelector";
import SalesChart from "../charts/SalesChart";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "@/styles/components/_admin.module.scss";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import chartStyles from "@/styles/components/_adminChart.module.scss";

interface DashboardSectionProps {
  setActiveSection: (section: string) => void;
}

interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  revenue: string;
  totalProducts: number;
  totalJournalPosts: number;
  trends?: {
    users: { current: number; previous: number; trend: number; isPositive: boolean };
    orders: { current: number; previous: number; trend: number; isPositive: boolean };
    revenue: { current: number; previous: number; trend: number; isPositive: boolean };
    products: { current: number; previous: number; trend: number; isPositive: boolean };
    journal: { current: number; previous: number; trend: number; isPositive: boolean };
  };
}

interface AdminActivity {
  id: string;
  type: string;
  activityType: string;
  activityData: Record<string, any>;
  userName?: string;
  userEmail?: string;
  adminName?: string;
  orderNumber?: string;
  status?: string;
  subject?: string;
  isGuest?: boolean;
  createdAt: Date | string;
}

export default function DashboardSection({ setActiveSection }: DashboardSectionProps) {
  const { t, language, currency } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"week" | "month" | "year" | "custom">("month");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [activities, setActivities] = useState<AdminActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [activitiesRefreshing, setActivitiesRefreshing] = useState(false);
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [showPrevious, setShowPrevious] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (period !== "custom") {
        params.append("period", period);
      } else if (startDate && endDate) {
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      }
      const response = await fetch(`/api/admin/dashboard/stats?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to fetch stats");
      }
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      setError("Failed to fetch dashboard stats");
    } finally {
      setIsLoading(false);
    }
  }, [period, startDate, endDate]);

  useEffect(() => {
    fetchStats();
    fetchActivities();

    // Set up polling for real-time updates (every 30 seconds)
    const statsInterval = setInterval(() => {
      fetchStats();
    }, 30000);

    const activitiesInterval = setInterval(() => {
      fetchActivities(false, false);
    }, 30000);

    return () => {
      clearInterval(statsInterval);
      clearInterval(activitiesInterval);
    };
  }, [fetchStats]);

  const fetchActivities = useCallback(async (loadMore = false, reset = false) => {
    try {
      if (reset) {
        setActivitiesRefreshing(true);
        setOffset(0);
        setShowPrevious(false);
      } else if (loadMore) {
        setActivitiesLoading(true);
      } else {
        setActivitiesLoading(true);
      }

      const currentOffset = reset ? 0 : loadMore ? offset : 0;
      const params = new URLSearchParams();
      params.append("limit", "5");
      params.append("offset", currentOffset.toString());
      if (activityFilter !== "all") {
        params.append("type", activityFilter);
      }

      const response = await fetch(`/api/admin/activities?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const newActivities = data.activities || [];

        if (loadMore) {
          // Replace current activities with next 5
          setActivities(newActivities);
          setOffset(currentOffset + 5);
          setShowPrevious(true);
        } else {
          // Initial load or refresh
          setActivities(newActivities);
          setOffset(5);
          setShowPrevious(false);
        }

        setHasMore(data.hasMore || false);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setActivitiesLoading(false);
      setActivitiesRefreshing(false);
    }
  }, [activityFilter, offset]);

  useEffect(() => {
    fetchActivities(false, true);
  }, [activityFilter]);

  const handleLoadMore = () => {
    fetchActivities(true);
  };

  const handleSeePrevious = () => {
    fetchActivities(false, true);
  };

  const handleRefresh = () => {
    fetchActivities(false, true);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return language === "fa" ? "همین الان" : "Just now";
    } else if (diffMins < 60) {
      return language === "fa" ? `${diffMins} دقیقه پیش` : `${diffMins} minutes ago`;
    } else if (diffHours < 24) {
      return language === "fa" ? `${diffHours} ساعت پیش` : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return language === "fa" ? `${diffDays} روز پیش` : `${diffDays} days ago`;
    } else {
      return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    }
  };

  const getActivityIcon = (activity: AdminActivity) => {
    switch (activity.type) {
      case "user_order":
      case "order_placed":
        return <FiShoppingBag />;
      case "order_status_change":
        return <FiPackage />;
      case "contact_message":
        return <FiMessageSquare />;
      case "admin_activity":
        switch (activity.activityType) {
          case "product_created":
          case "product_updated":
          case "product_deleted":
            return <FiShoppingBag />;
          case "order_status_changed":
            return <FiPackage />;
          default:
            return <FiActivity />;
        }
      default:
        return <FiActivity />;
    }
  };

  const getActivityText = (activity: AdminActivity) => {
    switch (activity.type) {
      case "user_order":
        const orderNum = activity.activityData?.orderNumber || "";
        return language === "fa"
          ? `سفارش #${orderNum} توسط ${activity.userName || "کاربر"} ثبت شد`
          : `Order #${orderNum} placed by ${activity.userName || "user"}`;
      case "order_placed":
        const orderNumber = activity.orderNumber || activity.activityData?.orderNumber || "";
        const customerName = activity.userName || (activity.isGuest ? "مهمان" : "کاربر") || "Unknown";
        return language === "fa"
          ? `سفارش #${orderNumber} توسط ${customerName} ${activity.isGuest ? "(مهمان)" : ""} ثبت شد`
          : `Order #${orderNumber} placed by ${customerName}${activity.isGuest ? " (Guest)" : ""}`;

      case "order_status_change":
        const statusText = activity.status === "processing"
          ? (language === "fa" ? "در حال پردازش" : "Processing")
          : activity.status === "shipped"
            ? (language === "fa" ? "ارسال شد" : "Shipped")
            : activity.status === "delivered"
              ? (language === "fa" ? "تحویل داده شد" : "Delivered")
              : activity.status;
        return language === "fa"
          ? `وضعیت سفارش #${activity.orderNumber} به ${statusText} تغییر کرد`
          : `Order #${activity.orderNumber} status changed to ${statusText}`;

      case "contact_message":
        return language === "fa"
          ? `پیام جدید از ${activity.userName || "کاربر"}: ${activity.subject || ""}`
          : `New message from ${activity.userName || "user"}: ${activity.subject || ""}`;

      case "admin_activity":
        switch (activity.activityType) {
          case "product_created":
            const productName = activity.activityData?.productName || "";
            return language === "fa"
              ? `محصول "${productName}" توسط ${activity.adminName || "ادمین"} ایجاد شد`
              : `Product "${productName}" created by ${activity.adminName || "admin"}`;
          case "product_updated":
            const updatedProductName = activity.activityData?.productName || "";
            return language === "fa"
              ? `محصول "${updatedProductName}" توسط ${activity.adminName || "ادمین"} به‌روزرسانی شد`
              : `Product "${updatedProductName}" updated by ${activity.adminName || "admin"}`;
          case "product_deleted":
            const deletedProductName = activity.activityData?.productName || "";
            return language === "fa"
              ? `محصول "${deletedProductName}" توسط ${activity.adminName || "ادمین"} حذف شد`
              : `Product "${deletedProductName}" deleted by ${activity.adminName || "admin"}`;
          case "order_status_changed":
            const changedOrderNum = activity.activityData?.orderNumber || "";
            const changedStatus = activity.activityData?.status || "";
            return language === "fa"
              ? `وضعیت سفارش #${changedOrderNum} توسط ${activity.adminName || "ادمین"} به ${changedStatus} تغییر کرد`
              : `Order #${changedOrderNum} status changed to ${changedStatus} by ${activity.adminName || "admin"}`;
          default:
            return language === "fa"
              ? `فعالیت توسط ${activity.adminName || "ادمین"}`
              : `Activity by ${activity.adminName || "admin"}`;
        }
      default:
        return language === "fa" ? "فعالیت" : "Activity";
    }
  };

  // Format number with commas
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US").format(num);
  };

  // Format revenue with currency
  const formatRevenue = (revenue: string): string => {
    const numRevenue = parseFloat(revenue || "0");
    // Use toman as default currency for admin dashboard
    return formatPrice(numRevenue, language, currency || "toman");
  };

  // Format trend percentage
  const formatTrend = (trend: number): string => {
    return `${trend.toFixed(1)}%`;
  };

  const handlePeriodChange = (newPeriod: "week" | "month" | "year" | "custom") => {
    setPeriod(newPeriod);
  };

  const handleDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
  };

  const filteredActivities = activities.filter((activity) => {
    if (activityFilter === "all") return true;
    return activity.type === activityFilter || activity.activityType === activityFilter;
  });

  return (
    <>
      <div style={{ marginBottom: "1.5rem" }}>
        <DateRangeSelector
          period={period}
          onPeriodChange={handlePeriodChange}
          startDate={startDate}
          endDate={endDate}
          onDateChange={handleDateChange}
        />
      </div>

      {error && (
        <div
          style={{
            padding: "1rem",
            background: "#fee",
            border: "1px solid #fcc",
            borderRadius: "8px",
            marginBottom: "1rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#c33" }}>
            <FiAlertCircle />
            <span>{error}</span>
          </div>
          <button
            onClick={() => fetchStats()}
            style={{
              background: "transparent",
              border: "none",
              color: "#c33",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.25rem",
              fontSize: "0.875rem",
            }}
          >
            <FiRefreshCw />
            <span>{t("Retry", "تلاش مجدد")}</span>
          </button>
        </div>
      )}

      <div className={styles.statsGrid}>
        {isLoading ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : stats ? (
          <>
            <StatCard
              icon={<FiUsers />}
              value={formatNumber(stats.totalUsers)}
              label={t("Total Users", "کل کاربران")}
              trend={
                stats.trends?.users
                  ? {
                    value: formatTrend(stats.trends.users.trend),
                    isPositive: stats.trends.users.isPositive,
                  }
                  : undefined
              }
            />
            <StatCard
              icon={<FiPackage />}
              value={formatNumber(stats.totalOrders)}
              label={t("Orders", "سفارشات")}
              trend={
                stats.trends?.orders
                  ? {
                    value: formatTrend(stats.trends.orders.trend),
                    isPositive: stats.trends.orders.isPositive,
                  }
                  : undefined
              }
            />
            <StatCard
              icon={<FiDollarSign />}
              value={
                language === "fa"
                  ? (
                    <>
                      <span style={{ fontSize: '1.1rem' }}>{formatRevenue(stats.revenue).replace(' تومان', '')}</span>
                      <span style={{ fontSize: '0.85rem', marginInlineStart: 4 }}>تومان</span>
                    </>
                  )
                  : (
                    <>
                      <span style={{ fontSize: '1.1rem' }}>{formatRevenue(stats.revenue).replace(' Tomans', '')}</span>
                      <span style={{ fontSize: '0.85rem', marginInlineStart: 4 }}>Tomans</span>
                    </>
                  )
              }
              label={t("Revenue", "درآمد")}
              trend={
                stats.trends?.revenue
                  ? {
                    value: formatTrend(stats.trends.revenue.trend),
                    isPositive: stats.trends.revenue.isPositive,
                  }
                  : undefined
              }
            />
            <StatCard
              icon={<FiShoppingBag />}
              value={formatNumber(stats.totalProducts)}
              label={t("Products", "محصولات")}
              trend={
                stats.trends?.products
                  ? {
                    value: formatTrend(stats.trends.products.trend),
                    isPositive: stats.trends.products.isPositive,
                  }
                  : undefined
              }
            />
          </>
        ) : null}
      </div>

      <div className={styles.quickActionsGrid}>
        <QuickActionCard
          icon={<FiUsers />}
          label={t("Manage Users", "مدیریت کاربران")}
          count={stats ? formatNumber(stats.totalUsers) : "0"}
          onClick={() => setActiveSection("users")}
        />
        <QuickActionCard
          icon={<FiShoppingBag />}
          label={t("Manage Products", "مدیریت محصولات")}
          count={stats ? formatNumber(stats.totalProducts) : "0"}
          onClick={() => setActiveSection("products")}
        />
        <QuickActionCard
          icon={<FiPackage />}
          label={t("View Orders", "مشاهده سفارشات")}
          count={stats ? formatNumber(stats.totalOrders) : "0"}
          onClick={() => setActiveSection("orders")}
        />
        <QuickActionCard
          icon={<FiActivity />}
          label={t("Journal", "مجله")}
          count={stats ? formatNumber(stats.totalJournalPosts) : "0"}
          onClick={() => setActiveSection("content")}
        />
      </div>

      <div className={styles.contentLayout}>
        <div>
          <AdminCard>
            <div className={cardStyles.cardHeader}>
              <h3 className={cardStyles.cardTitle}>
                <FiActivity />
                <span>{t("Recent Activity", "فعالیت‌های اخیر")}</span>
              </h3>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <select
                  value={activityFilter}
                  onChange={(e) => setActivityFilter(e.target.value)}
                  style={{
                    padding: "0.25rem 0.5rem",
                    border: "1px solid #e8e9ea",
                    borderRadius: "6px",
                    fontSize: "0.875rem",
                    background: "white",
                    cursor: "pointer",
                  }}
                >
                  <option value="all">{t("All", "همه")}</option>
                  <option value="user_order">{t("Orders", "سفارشات")}</option>
                  <option value="order_status_change">{t("Status Changes", "تغییر وضعیت")}</option>
                  <option value="contact_message">{t("Messages", "پیام‌ها")}</option>
                  <option value="admin_activity">{t("Admin Actions", "اقدامات ادمین")}</option>
                </select>
                <button
                  onClick={handleRefresh}
                  disabled={activitiesRefreshing}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: activitiesRefreshing ? "not-allowed" : "pointer",
                    opacity: activitiesRefreshing ? 0.5 : 1,
                    display: "flex",
                    alignItems: "center",
                    padding: "0.25rem",
                  }}
                  aria-label={t("Refresh", "تازه‌سازی")}
                >
                  <FiRefreshCw
                    style={{
                      width: "1rem",
                      height: "1rem",
                      animation: activitiesRefreshing ? "spin 1s linear infinite" : "none",
                    }}
                  />
                </button>
              </div>
            </div>
            {showPrevious && (
              <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid #e8e9ea" }}>
                <button
                  onClick={handleSeePrevious}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#367260",
                    cursor: "pointer",
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    textDecoration: "none",
                    fontFamily: language === "fa" ? "'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit",
                  }}
                >
                  {t("See Previous", "مشاهده قبلی")}
                </button>
              </div>
            )}
            {activitiesLoading && activities.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                {t("Loading activities...", "در حال بارگذاری فعالیت‌ها...")}
              </div>
            ) : filteredActivities.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
                {t("No recent activities", "هیچ فعالیت اخیری وجود ندارد")}
              </div>
            ) : (
              <>
                {filteredActivities.map((activity) => (
                  <ActivityItem
                    key={activity.id}
                    icon={getActivityIcon(activity)}
                    text={getActivityText(activity)}
                    time={formatDate(activity.createdAt)}
                  />
                ))}
                {hasMore && (
                  <div style={{ padding: "0.5rem 1rem", borderTop: "1px solid #e8e9ea" }}>
                    <button
                      onClick={handleLoadMore}
                      disabled={activitiesLoading}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#367260",
                        cursor: activitiesLoading ? "not-allowed" : "pointer",
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        textDecoration: "none",
                        opacity: activitiesLoading ? 0.5 : 1,
                        width: "100%",
                        textAlign: "center",
                        padding: "0.5rem",
                        fontFamily: language === "fa" ? "'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit",
                      }}
                    >
                      {activitiesLoading
                        ? t("Loading...", "در حال بارگذاری...")
                        : t("Load More", "بارگذاری بیشتر")}
                    </button>
                  </div>
                )}
              </>
            )}
          </AdminCard>

          <AdminCard>
            <SalesChart period={period} startDate={startDate} endDate={endDate} />
          </AdminCard>
        </div>
      </div>
    </>
  );
}

