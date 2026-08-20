"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiCalendar } from "react-icons/fi";
import styles from "@/styles/components/_dateRangeSelector.module.scss";

interface DateRangeSelectorProps {
  period: "week" | "month" | "year" | "custom";
  onPeriodChange: (period: "week" | "month" | "year" | "custom") => void;
  startDate?: string;
  endDate?: string;
  onDateChange?: (startDate: string, endDate: string) => void;
}

export default function DateRangeSelector({
  period,
  onPeriodChange,
  startDate,
  endDate,
  onDateChange,
}: DateRangeSelectorProps) {
  const { t, language } = useLanguage();

  const handlePeriodChange = (newPeriod: "week" | "month" | "year" | "custom") => {
    onPeriodChange(newPeriod);
    if (newPeriod !== "custom" && onDateChange) {
      const now = new Date();
      let start: Date;
      switch (newPeriod) {
        case "week":
          start = new Date(now);
          start.setDate(start.getDate() - 7);
          break;
        case "year":
          start = new Date(now);
          start.setFullYear(start.getFullYear() - 1);
          break;
        case "month":
        default:
          start = new Date(now);
          start.setMonth(start.getMonth() - 1);
          break;
      }
      onDateChange(start.toISOString().split("T")[0], now.toISOString().split("T")[0]);
    }
  };

  return (
    <div className={styles.dateRangeSelector}>
      <div className={styles.periodButtons}>
        <button
          className={`${styles.periodButton} ${period === "week" ? styles.active : ""}`}
          onClick={() => handlePeriodChange("week")}
        >
          {t("Week", "هفته")}
        </button>
        <button
          className={`${styles.periodButton} ${period === "month" ? styles.active : ""}`}
          onClick={() => handlePeriodChange("month")}
        >
          {t("Month", "ماه")}
        </button>
        <button
          className={`${styles.periodButton} ${period === "year" ? styles.active : ""}`}
          onClick={() => handlePeriodChange("year")}
        >
          {t("Year", "سال")}
        </button>
        <button
          className={`${styles.periodButton} ${period === "custom" ? styles.active : ""}`}
          onClick={() => handlePeriodChange("custom")}
        >
          <FiCalendar />
          <span>{t("Custom", "سفارشی")}</span>
        </button>
      </div>
      {period === "custom" && onDateChange && (
        <div className={styles.customDates}>
          <input
            type="date"
            value={startDate || ""}
            onChange={(e) => onDateChange(e.target.value, endDate || "")}
            className={styles.dateInput}
          />
          <span className={styles.dateSeparator}>-</span>
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => onDateChange(startDate || "", e.target.value)}
            className={styles.dateInput}
          />
        </div>
      )}
    </div>
  );
}

