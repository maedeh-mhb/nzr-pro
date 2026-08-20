"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import {
  FiMonitor,
  FiDatabase,
  FiServer,
  FiActivity,
  FiRefreshCw,
  FiCheckCircle,
  FiAlertCircle,
  FiXCircle,
  FiAlertTriangle,
} from "react-icons/fi";
import AdminCard from "../AdminCard";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { showError } from "@/lib/utils/toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface SystemHealth {
  database: {
    status: "healthy" | "degraded" | "unhealthy";
    responseTime: number;
    error: string | null;
  };
  system: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      external: number;
    };
    nodeVersion: string;
    platform: string;
  };
  stats: {
    users: number;
    orders: number;
    products: number;
  };
  timestamp: string;
}

interface APIHealth {
  checks: Array<{
    name: string;
    path: string;
    status: "healthy" | "unhealthy";
    statusCode: number;
    responseTime: number;
    error: string | null;
  }>;
  timestamp: string;
}

export default function SystemHealthSection() {
  const { t, language } = useLanguage();
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [apiHealth, setApiHealth] = useState<APIHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showErrorLog, setShowErrorLog] = useState(false);
  const [errorLogEntries, setErrorLogEntries] = useState<any[]>([]);
  const [isLoadingErrors, setIsLoadingErrors] = useState(false);

  const fetchHealth = async () => {
    try {
      const [healthRes, apiRes] = await Promise.all([
        fetch("/api/admin/system/health"),
        fetch("/api/admin/system/health/api"),
      ]);

      if (!healthRes.ok) throw new Error("Failed to fetch system health");
      if (!apiRes.ok) throw new Error("Failed to fetch API health");

      const healthData = await healthRes.json();
      const apiData = await apiRes.json();

      setHealth(healthData);
      setApiHealth(apiData);
      setError(null);
    } catch (err: any) {
      setError(err.message);
      showError(err.message || t("Failed to load system health", "خطا در بارگذاری وضعیت سیستم"));
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchHealth();
  };

  const fetchErrorLog = async () => {
    setIsLoadingErrors(true);
    try {
      const response = await fetch("/api/admin/system/errors?limit=100");
      if (!response.ok) throw new Error("Failed to fetch error log");
      const data = await response.json();
      setErrorLogEntries(data.errors || []);
    } catch (err: any) {
      showError(err.message || t("Failed to load error log", "خطا در بارگذاری لاگ خطاها"));
    } finally {
      setIsLoadingErrors(false);
    }
  };

  useEffect(() => {
    if (showErrorLog) {
      fetchErrorLog();
      const interval = setInterval(fetchErrorLog, 30000);
      return () => clearInterval(interval);
    }
  }, [showErrorLog]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <FiCheckCircle style={{ color: "#10b981" }} />;
      case "degraded":
        return <FiAlertCircle style={{ color: "#f59e0b" }} />;
      case "unhealthy":
        return <FiXCircle style={{ color: "#ef4444" }} />;
      default:
        return <FiAlertCircle style={{ color: "#6b7280" }} />;
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  };

  if (isLoading) {
    return (
      <AdminCard>
        <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
          <LoadingSpinner />
        </div>
      </AdminCard>
    );
  }

  if (error) {
    return (
      <AdminCard>
        <ErrorState message={error} onRetry={fetchHealth} />
      </AdminCard>
    );
  }

  return (
    <>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiMonitor />
            <span>{t("System Health", "وضعیت سیستم")}</span>
          </h3>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <Button
              variant={showErrorLog ? "primary" : "outline"}
              size="small"
              onClick={() => setShowErrorLog(!showErrorLog)}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <FiAlertTriangle />
                {t("Error Log", "لاگ خطاها")}
              </span>
            </Button>
            <Button variant="outline" size="small" onClick={handleRefresh} disabled={isRefreshing}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <FiRefreshCw style={{ animation: isRefreshing ? "spin 1s linear infinite" : undefined }} />
                {t("Refresh", "تازه‌سازی")}
              </span>
            </Button>
          </div>
        </div>

        {showErrorLog ? (
          <div>
            <h4 style={{ marginBottom: "1rem", fontSize: "1.125rem", fontWeight: 600 }}>
              {t("Error Log", "لاگ خطاها")}
            </h4>
            {isLoadingErrors ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
                <LoadingSpinner />
              </div>
            ) : errorLogEntries.length === 0 ? (
              <EmptyState
                icon={<FiAlertTriangle />}
                title={t("No Errors", "هیچ خطایی وجود ندارد")}
                titleFa="هیچ خطایی وجود ندارد"
                description={t("No errors logged", "هیچ خطایی ثبت نشده است")}
                descriptionFa="هیچ خطایی ثبت نشده است"
              />
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {errorLogEntries.map((entry) => (
                  <div
                    key={entry.id}
                    style={{
                      padding: "1rem",
                      background: entry.severity === "error" ? "#fef2f2" : entry.severity === "warning" ? "#fffbeb" : "#f0f9ff",
                      borderRadius: "8px",
                      border: `1px solid ${entry.severity === "error" ? "#fecaca" : entry.severity === "warning" ? "#fde68a" : "#bfdbfe"
                        }`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                      {getStatusIcon(entry.severity === "error" ? "unhealthy" : entry.severity === "warning" ? "degraded" : "healthy")}
                      <span style={{ fontWeight: 600, fontSize: "0.875rem", textTransform: "uppercase" }}>
                        {entry.severity}
                      </span>
                      <span style={{ fontSize: "0.75rem", color: "#6b7280", marginLeft: "auto" }}>
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                      {entry.message}
                    </div>
                    {entry.url && (
                      <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                        {entry.method} {entry.url}
                      </div>
                    )}
                    {entry.stack && (
                      <details style={{ marginTop: "0.5rem" }}>
                        <summary style={{ cursor: "pointer", fontSize: "0.75rem", color: "#6b7280" }}>
                          {t("Stack Trace", "ردیابی پشته")}
                        </summary>
                        <pre
                          style={{
                            marginTop: "0.5rem",
                            padding: "0.5rem",
                            background: "#1f2937",
                            color: "#f3f4f6",
                            borderRadius: "4px",
                            fontSize: "0.75rem",
                            overflow: "auto",
                            maxHeight: "200px",
                          }}
                        >
                          {entry.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : health && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Database Health */}
            <div
              style={{
                padding: "1rem",
                background: "var(--tertiary)",
                borderRadius: "8px",
                border: `2px solid ${health.database.status === "healthy"
                  ? "#10b981"
                  : health.database.status === "degraded"
                    ? "#f59e0b"
                    : "#ef4444"
                  }`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FiDatabase />
                <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>
                  {t("Database", "پایگاه داده")}
                </h4>
                {getStatusIcon(health.database.status)}
              </div>
              <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                <div>
                  {t("Response Time", "زمان پاسخ")}: {health.database.responseTime}ms
                </div>
                {health.database.error && (
                  <div style={{ color: "#ef4444", marginTop: "0.25rem" }}>
                    {health.database.error}
                  </div>
                )}
              </div>
            </div>

            {/* System Metrics */}
            <div
              style={{
                padding: "1rem",
                background: "var(--tertiary)",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FiServer />
                <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>
                  {t("System Metrics", "معیارهای سیستم")}
                </h4>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Uptime", "زمان فعالیت")}
                  </div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    {formatUptime(health.system.uptime)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Memory Used", "حافظه استفاده شده")}
                  </div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    {health.system.memory.used} MB / {health.system.memory.total} MB
                  </div>
                  <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px", marginTop: "0.25rem" }}>
                    <div
                      style={{
                        width: `${(health.system.memory.used / health.system.memory.total) * 100}%`,
                        height: "100%",
                        background: "#3b82f6",
                        borderRadius: "4px",
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Node Version", "نسخه Node")}
                  </div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    {health.system.nodeVersion}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Platform", "پلتفرم")}
                  </div>
                  <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>
                    {health.system.platform}
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div
              style={{
                padding: "1rem",
                background: "var(--tertiary)",
                borderRadius: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <FiActivity />
                <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>
                  {t("Statistics", "آمار")}
                </h4>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem" }}>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Users", "کاربران")}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                    {health.stats.users.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Orders", "سفارشات")}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                    {health.stats.orders.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                    {t("Products", "محصولات")}
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
                    {health.stats.products.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* API Health Checks */}
            {apiHealth && (
              <div
                style={{
                  padding: "1rem",
                  background: "var(--tertiary)",
                  borderRadius: "8px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                  <FiActivity />
                  <h4 style={{ fontSize: "1rem", fontWeight: 600 }}>
                    {t("API Health Checks", "بررسی سلامت API")}
                  </h4>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {apiHealth.checks.map((check) => (
                    <div
                      key={check.path}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem",
                        background: "white",
                        borderRadius: "4px",
                        border: `1px solid ${check.status === "healthy" ? "#10b981" : "#ef4444"
                          }`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        {getStatusIcon(check.status)}
                        <div>
                          <div style={{ fontWeight: 500 }}>{check.name}</div>
                          <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                            {check.path}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.875rem", color: "#6b7280" }}>
                          {check.responseTime}ms
                        </div>
                        {check.error && (
                          <div style={{ fontSize: "0.75rem", color: "#ef4444" }}>
                            {check.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ fontSize: "0.75rem", color: "#6b7280", textAlign: "center" }}>
              {t("Last updated", "آخرین به‌روزرسانی")}: {new Date(health.timestamp).toLocaleString()}
            </div>
          </div>
        )}
      </AdminCard>
    </>
  );
}
