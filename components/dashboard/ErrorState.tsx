"use client";

import { ReactNode } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_errorState.module.scss";

interface ErrorStateProps {
  icon?: ReactNode;
  title?: string;
  titleFa?: string;
  message: string;
  messageFa?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryLabelFa?: string;
  className?: string;
}

export default function ErrorState({
  icon,
  title,
  titleFa,
  message,
  messageFa,
  onRetry,
  retryLabel,
  retryLabelFa,
  className,
}: ErrorStateProps) {
  const { t, language } = useLanguage();

  const displayTitle = language === "fa" && titleFa ? titleFa : (title || t("Something went wrong", "خطایی رخ داد"));
  const displayMessage = language === "fa" && messageFa ? messageFa : message;
  const displayRetryLabel = language === "fa" && retryLabelFa ? retryLabelFa : (retryLabel || t("Try Again", "تلاش مجدد"));

  return (
    <div className={`${styles.errorState} ${className || ""}`}>
      <div className={styles.errorStateIcon}>
        {icon || <FiAlertTriangle />}
      </div>
      
      <div className={styles.errorStateContent}>
        <h3 className={styles.errorStateTitle}>{displayTitle}</h3>
        <p className={styles.errorStateMessage}>{displayMessage}</p>
        
        {onRetry && (
          <div className={styles.errorStateAction}>
            <Button variant="outline" onClick={onRetry}>
              <FiRefreshCw />
              {displayRetryLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
