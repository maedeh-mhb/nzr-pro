"use client";

import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useLanguage } from "@/lib/utils/language";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import styles from "@/styles/components/_adminChart.module.scss";

interface SalesChartProps {
  period: "week" | "month" | "year" | "custom";
  startDate?: string;
  endDate?: string;
}

interface ChartDataPoint {
  date: string;
  orders: number;
  revenue: number;
}

export default function SalesChart({ period, startDate, endDate }: SalesChartProps) {
  const { t, language, currency } = useLanguage();
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<"line" | "area">("area");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();
        if (period !== "custom") {
          params.append("period", period);
        } else if (startDate && endDate) {
          params.append("startDate", startDate);
          params.append("endDate", endDate);
        }
        const response = await fetch(`/api/admin/dashboard/charts?${params.toString()}`);
        if (response.ok) {
          const result = await response.json();
          setData(result.data || []);
        }
      } catch (error) {
        console.error("Error fetching chart data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [period, startDate, endDate]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat(language === "fa" ? "fa-IR" : "en-US", {
      style: "currency",
      currency: currency || "IRR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className={styles.chartLoading}>
        <LoadingSpinner size="lg" color="primary" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.chartEmpty}>
        {t("No data available for the selected period", "داده‌ای برای دوره انتخاب شده موجود نیست")}
      </div>
    );
  }

  const ChartComponent = chartType === "area" ? AreaChart : LineChart;

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartHeader}>
        <h4>{t("Sales Overview", "نمای کلی فروش")}</h4>
        <div className={styles.chartControls}>
          <button
            className={`${styles.chartTypeButton} ${chartType === "area" ? styles.active : ""}`}
            onClick={() => setChartType("area")}
          >
            {t("Area", "ناحیه")}
          </button>
          <button
            className={`${styles.chartTypeButton} ${chartType === "line" ? styles.active : ""}`}
            onClick={() => setChartType("line")}
          >
            {t("Line", "خط")}
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ChartComponent data={data}>
          <defs>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#367260" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#367260" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e9ea" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDate}
            stroke="#666"
            style={{ fontSize: "0.75rem" }}
          />
          <YAxis
            yAxisId="left"
            stroke="#666"
            style={{ fontSize: "0.75rem" }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#666"
            style={{ fontSize: "0.75rem" }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              border: "1px solid #e8e9ea",
              borderRadius: "8px",
              padding: "0.5rem",
            }}
            formatter={(value: any, name: any) => {
              const numValue = typeof value === 'number' ? value : 0;
              const dataName = typeof name === 'string' ? name : "";
              if (dataName === "revenue") {
                return [formatCurrency(numValue), t("Revenue", "درآمد")];
              }
              return [numValue.toLocaleString(), t("Orders", "سفارشات")];
            }}

            labelFormatter={(label) => typeof label === 'string' ? formatDate(label) : ''}
          />
          <Legend />
          {chartType === "area" ? (
            <>
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke="#6c9cb8"
                fill="#6c9cb8"
                fillOpacity={0.6}
                name={t("Orders", "سفارشات")}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#367260"
                fill="url(#colorRevenue)"
                name={t("Revenue", "درآمد")}
              />
            </>
          ) : (
            <>
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="orders"
                stroke="#6c9cb8"
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t("Orders", "سفارشات")}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#367260"
                strokeWidth={2}
                dot={{ r: 4 }}
                name={t("Revenue", "درآمد")}
              />
            </>
          )}
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
}

