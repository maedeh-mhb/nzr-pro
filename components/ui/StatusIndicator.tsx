"use client";

import styles from "@/styles/components/_statusIndicator.module.scss";

interface StatusIndicatorProps {
  status: "active" | "pending" | "inactive" | "success" | "warning" | "danger";
  size?: "sm" | "md" | "lg";
  pulse?: boolean;
  className?: string;
}

export default function StatusIndicator({
  status,
  size = "md",
  pulse = false,
  className = "",
}: StatusIndicatorProps) {
  return (
    <span
      className={`${styles.statusIndicator} ${styles[status]} ${styles[size]} ${pulse ? styles.pulse : ""} ${className}`}
      aria-label={`Status: ${status}`}
    />
  );
}

