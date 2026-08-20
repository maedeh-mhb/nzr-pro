"use client";

import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_progressBar.module.scss";

interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  labelFa?: string;
  showPercentage?: boolean;
  size?: "sm" | "md" | "lg";
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

export default function ProgressBar({
  progress,
  label,
  labelFa,
  showPercentage = true,
  size = "md",
  color = "primary",
  className = "",
}: ProgressBarProps) {
  const { language } = useLanguage();
  const displayLabel = language === "fa" && labelFa ? labelFa : label;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`${styles.progressBar} ${styles[size]} ${className}`}>
      {(displayLabel || showPercentage) && (
        <div className={styles.progressHeader}>
          {displayLabel && <span className={styles.label}>{displayLabel}</span>}
          {showPercentage && (
            <span className={styles.percentage}>{Math.round(clampedProgress)}%</span>
          )}
        </div>
      )}
      <div className={styles.progressTrack}>
        <div
          className={`${styles.progressFill} ${styles[color]}`}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

