"use client";

import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_adminTable.module.scss";

interface StatusBadgeProps {
  status: "active" | "pending" | "inactive" | "info";
  label?: string;
  variant?: "default" | "inverted";
  style?: React.CSSProperties;
}

export default function StatusBadge({ status, label, variant = "default", style }: StatusBadgeProps) {
  const { language } = useLanguage();

  const statusLabels = {
    active: { en: "Active", fa: "فعال" },
    pending: { en: "Pending", fa: "در انتظار" },
    inactive: { en: "Inactive", fa: "غیرفعال" },
    info: { en: "In Progress", fa: "در حال انجام" },
  };

  const displayLabel = label || statusLabels[status]?.[language] || status;

  return (
    <span
      className={[
        styles.statusBadge,
        styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`],
        variant === "inverted" ? styles.statusBadgeInverted : "",
      ].join(" ")}
      style={style}
    >
      {displayLabel}
    </span>
  );
}
