"use client";

import { ReactNode } from "react";
import styles from "@/styles/components/_adminQuickAction.module.scss";

interface QuickActionCardProps {
  icon: ReactNode;
  label: string;
  count: string | number;
  onClick: () => void;
}

export default function QuickActionCard({ icon, label, count, onClick }: QuickActionCardProps) {
  return (
    <div className={styles.quickActionCard} onClick={onClick}>
      <div className={styles.quickActionIcon}>{icon}</div>
      <div className={styles.quickActionLabel}>{label}</div>
      <div className={styles.quickActionCount}>{count}</div>
    </div>
  );
}

