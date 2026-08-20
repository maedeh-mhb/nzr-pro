"use client";

import { ReactNode } from "react";
import styles from "@/styles/components/_adminStats.module.scss";

interface StatCardProps {
  icon: ReactNode;
  value: string | number | ReactNode;
  label: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export default function StatCard({ icon, value, label, trend }: StatCardProps) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <div className={styles.statIcon}>{icon}</div>
        {trend && (
          <span className={`${styles.statTrend} ${trend.isPositive ? styles.statTrendPositive : styles.statTrendNegative}`}>
            {trend.isPositive ? "↑" : "↓"} {trend.value}
          </span>
        )}
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

