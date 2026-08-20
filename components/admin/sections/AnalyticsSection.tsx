"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiBarChart2, FiTrendingUp, FiDollarSign, FiPackage, FiShoppingBag, FiUsers, FiFilter } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Select, { SelectOption } from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface AnalyticsData {
  revenue: {
    total: number;
    averageOrderValue: number;
    orderCount: number;
    netRevenue: number;
  };
  revenueByStatus: Array<{
    status: string;
    revenue: number;
    count: number;
  }>;
  revenueByPaymentMethod: Array<{
    paymentMethod: string;
    revenue: number;
    count: number;
  }>;
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  productPerformance: Array<{
    productId: string;
    productName: string;
    totalQuantity: number;
    totalRevenue: number;
    orderCount: number;
  }>;
  orderStats: Array<{
    status: string;
    count: number;
  }>;
  refunds: {
    totalRefunded: number;
    refundCount: number;
    pendingRefunds: number;
    processedRefunds: number;
  };
  topCustomers: Array<{
    userId: string | null;
    customerName: string;
    totalSpent: number;
    orderCount: number;
  }>;
  dateRange: {
    from: string;
    to: string;
  };
}

export default function AnalyticsSection() {
  const { t, language, currency } = useLanguage();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState("30");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const periodOptions: SelectOption[] = [
    { value: "7", label: t("Last 7 Days", "آخرین 7 روز") },
    { value: "30", label: t("Last 30 Days", "آخرین 30 روز") },
    { value: "90", label: t("Last 90 Days", "آخرین 90 روز") },
    { value: "365", label: t("Last Year", "سال گذشته") },
    { value: "custom", label: t("Custom Range", "بازه سفارشی") },
  ];

  // Build query string
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (period !== "custom") {
      params.set("period", period);
    } else {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    return params.toString();
  }, [period, dateFrom, dateTo]);

  // Load analytics
  useEffect(() => {
    const loadAnalytics = async () => {
      setIsLoading(true);
      try {
        const url = `/api/admin/analytics${queryParams ? `?${queryParams}` : ""}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setAnalytics(data);
        } else {
          toast.error(t("Failed to load analytics", "خطا در بارگذاری آمار"));
        }
      } catch (error) {
        console.error("Error loading analytics:", error);
        toast.error(t("An error occurred", "خطایی رخ داد"));
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [queryParams, t]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t("Pending", "در انتظار"),
      processing: t("Processing", "در حال پردازش"),
      delivered: t("Delivered", "تحویل شده"),
      cancelled: t("Cancelled", "لغو شده"),
    };
    return statusMap[status] || status;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: Record<string, string> = {
      card_to_card: t("Card to Card", "کارت به کارت"),
      online_payment: t("Online Payment", "پرداخت آنلاین"),
      pay_after_delivery: t("Pay After Delivery", "پرداخت در محل"),
      paypal: t("PayPal", "پی‌پال"),
    };
    return methodMap[method] || method;
  };

  // Calculate max values for bar charts
  const maxDailyRevenue = analytics?.dailyRevenue.length
    ? Math.max(...analytics.dailyRevenue.map((d) => d.revenue))
    : 0;

  const maxProductRevenue = analytics?.productPerformance.length
    ? Math.max(...analytics.productPerformance.map((p) => p.totalRevenue))
    : 0;

  return (
    <AdminCard>
      <div className={cardStyles.cardHeader}>
        <h3 className={cardStyles.cardTitle}>
          <FiBarChart2 />
          <span>{t("Analytics & Reports", "آمار و گزارش‌ها")}</span>
        </h3>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ minWidth: "200px", flex: "1 1 200px" }}>
            <Select
              label={t("Time Period", "بازه زمانی")}
              options={periodOptions}
              value={period}
              onChange={setPeriod}
            />
          </div>
          {period === "custom" && (
            <>
              <div style={{ minWidth: "150px", flex: "1 1 150px" }}>
                <Input
                  type="date"
                  label={t("From", "از")}
                  value={dateFrom}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                />
              </div>
              <div style={{ minWidth: "150px", flex: "1 1 150px" }}>
                <Input
                  type="date"
                  label={t("To", "تا")}
                  value={dateTo}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("Loading...", "در حال بارگذاری...")}
        </div>
      ) : analytics ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
          {/* Revenue Overview */}
          <div className={styles.analyticsSection}>
            <h4
              style={{
                marginBottom: "1rem",
                fontSize: language === "en" ? "1.1rem" : "1.25rem",
                fontWeight: 600,
              }}
            >
              <FiDollarSign style={{ marginLeft: "0.5rem" }} />
              {t("Revenue Overview", "خلاصه درآمد")}
            </h4>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "1rem",
              }}
            >
              <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                  {t("Total Revenue", "کل درآمد")}
                </div>
                <div
                  style={{
                    fontSize: language === "en" ? "1.25rem" : "1.5rem",
                    fontWeight: 600,
                    color: "#28a745",
                  }}
                >
                  {formatPrice(analytics.revenue.total, language, currency || "toman")}
                </div>
              </div>
              <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                  {t("Net Revenue", "درآمد خالص")}
                </div>
                <div
                  style={{
                    fontSize: language === "en" ? "1.25rem" : "1.5rem",
                    fontWeight: 600,
                    color: "#007bff",
                  }}
                >
                  {formatPrice(analytics.revenue.netRevenue, language, currency || "toman")}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666", marginTop: "0.25rem" }}>
                  {t("After refunds", "پس از بازپرداخت‌ها")}
                </div>
              </div>
              <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                  {t("Average Order Value", "میانگین ارزش سفارش")}
                </div>
                <div
                  style={{
                    fontSize: language === "en" ? "1.25rem" : "1.5rem",
                    fontWeight: 600,
                  }}
                >
                  {formatPrice(analytics.revenue.averageOrderValue, language, currency || "toman")}
                </div>
              </div>
              <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                  {t("Total Orders", "کل سفارشات")}
                </div>
                <div
                  style={{
                    fontSize: language === "en" ? "1.25rem" : "1.5rem",
                    fontWeight: 600,
                  }}
                >
                  {analytics.revenue.orderCount.toLocaleString()}
                </div>
              </div>
            </div>
          </div>

          {/* Daily Revenue Chart */}
          {analytics.dailyRevenue.length > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiTrendingUp style={{ marginLeft: "0.5rem" }} />
                {t("Daily Revenue", "درآمد روزانه")}
              </h4>
              <div style={{ overflowX: "auto" }}>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", minHeight: "200px", padding: "1rem", background: "#f8f9fa", borderRadius: "8px" }}>
                  {analytics.dailyRevenue.map((day, index) => {
                    const height = maxDailyRevenue > 0 ? (day.revenue / maxDailyRevenue) * 100 : 0;
                    return (
                      <div
                        key={index}
                        style={{
                          flex: 1,
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.5rem",
                          minWidth: "40px",
                        }}
                      >
                        <div
                          style={{
                            width: "100%",
                            background: "#007bff",
                            borderRadius: "4px 4px 0 0",
                            height: `${height}%`,
                            minHeight: day.revenue > 0 ? "4px" : "0",
                            display: "flex",
                            alignItems: "flex-end",
                            justifyContent: "center",
                            padding: "0.25rem",
                            color: "#fff",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                          title={formatPrice(day.revenue, language, currency || "toman")}
                        >
                          {day.revenue > 0 && day.revenue >= maxDailyRevenue * 0.1 && (
                            <span style={{ writingMode: "vertical-rl", textOrientation: "mixed", fontSize: "0.7rem" }}>
                              {formatPrice(day.revenue, language, currency || "toman")}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.7rem", color: "#666", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>
                          {new Date(day.date).toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", { month: "short", day: "numeric" })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Revenue by Status */}
          {analytics.revenueByStatus.length > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiPackage style={{ marginLeft: "0.5rem" }} />
                {t("Revenue by Status", "درآمد بر اساس وضعیت")}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                {analytics.revenueByStatus.map((stat, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                      {getStatusLabel(stat.status)}
                    </div>
                    <div
                      style={{
                        fontSize: language === "en" ? "1.1rem" : "1.25rem",
                        fontWeight: 600,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {formatPrice(stat.revenue, language, currency || "toman")}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>
                      {stat.count} {t("orders", "سفارش")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue by Payment Method */}
          {analytics.revenueByPaymentMethod.length > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiDollarSign style={{ marginLeft: "0.5rem" }} />
                {t("Revenue by Payment Method", "درآمد بر اساس روش پرداخت")}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                {analytics.revenueByPaymentMethod.map((method, index) => (
                  <div
                    key={index}
                    style={{
                      padding: "1rem",
                      background: "#f8f9fa",
                      borderRadius: "8px",
                      border: "1px solid #e9ecef",
                    }}
                  >
                    <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                      {getPaymentMethodLabel(method.paymentMethod)}
                    </div>
                    <div
                      style={{
                        fontSize: language === "en" ? "1.1rem" : "1.25rem",
                        fontWeight: 600,
                        marginBottom: "0.25rem",
                      }}
                    >
                      {formatPrice(method.revenue, language, currency || "toman")}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#666" }}>
                      {method.count} {t("orders", "سفارش")}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Products */}
          {analytics.productPerformance.length > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiShoppingBag style={{ marginLeft: "0.5rem" }} />
                {t("Top Products", "محصولات پرفروش")}
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 600 }}>{t("Product", "محصول")}</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>{t("Quantity", "تعداد")}</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>{t("Revenue", "درآمد")}</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>{t("Orders", "سفارشات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.productPerformance.map((product, index) => (
                      <tr key={product.productId} style={{ borderBottom: "1px solid #dee2e6" }}>
                        <td style={{ padding: "0.75rem" }}>{product.productName}</td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>{product.totalQuantity}</td>
                        <td style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>
                          {formatPrice(product.totalRevenue, language, currency || "toman")}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>{product.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Top Customers */}
          {analytics.topCustomers.length > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiUsers style={{ marginLeft: "0.5rem" }} />
                {t("Top Customers", "مشتریان برتر")}
              </h4>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f8f9fa", borderBottom: "2px solid #dee2e6" }}>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: 600 }}>{t("Customer", "مشتری")}</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>{t("Total Spent", "کل خرید")}</th>
                      <th style={{ padding: "0.75rem", textAlign: "center", fontWeight: 600 }}>{t("Orders", "سفارشات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.topCustomers.map((customer, index) => (
                      <tr key={customer.userId || index} style={{ borderBottom: "1px solid #dee2e6" }}>
                        <td style={{ padding: "0.75rem" }}>{customer.customerName}</td>
                        <td style={{ padding: "0.75rem", textAlign: "left", fontWeight: 600 }}>
                          {formatPrice(customer.totalSpent, language, currency || "toman")}
                        </td>
                        <td style={{ padding: "0.75rem", textAlign: "center" }}>{customer.orderCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Refund Statistics */}
          {analytics.refunds.refundCount > 0 && (
            <div className={styles.analyticsSection}>
              <h4
                style={{
                  marginBottom: "1rem",
                  fontSize: language === "en" ? "1.1rem" : "1.25rem",
                  fontWeight: 600,
                }}
              >
                <FiDollarSign style={{ marginLeft: "0.5rem" }} />
                {t("Refund Statistics", "آمار بازپرداخت‌ها")}
              </h4>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                    {t("Total Refunded", "کل بازپرداخت شده")}
                  </div>
                  <div
                    style={{
                      fontSize: language === "en" ? "1.1rem" : "1.25rem",
                      fontWeight: 600,
                      color: "#e74c3c",
                    }}
                  >
                    {formatPrice(analytics.refunds.totalRefunded, language, currency || "toman")}
                  </div>
                </div>
                <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                    {t("Processed Refunds", "بازپرداخت‌های پردازش شده")}
                  </div>
                  <div
                    style={{
                      fontSize: language === "en" ? "1.1rem" : "1.25rem",
                      fontWeight: 600,
                    }}
                  >
                    {analytics.refunds.processedRefunds}
                  </div>
                </div>
                <div style={{ padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.5rem" }}>
                    {t("Pending Refunds", "بازپرداخت‌های در انتظار")}
                  </div>
                  <div
                    style={{
                      fontSize: language === "en" ? "1.1rem" : "1.25rem",
                      fontWeight: 600,
                      color: "#ffc107",
                    }}
                  >
                    {analytics.refunds.pendingRefunds}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("No data available", "داده‌ای در دسترس نیست")}
        </div>
      )}
    </AdminCard>
  );
}

