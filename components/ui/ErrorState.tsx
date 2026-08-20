"use client";

import { useLanguage } from "@/lib/utils/language";
import { FiAlertCircle, FiRefreshCw } from "react-icons/fi";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_errorState.module.scss";

interface ErrorStateProps {
  title?: string;
  titleFa?: string;
  message?: string;
  messageFa?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryLabelFa?: string;
  className?: string;
}

export default function ErrorState({
  title,
  titleFa,
  message,
  messageFa,
  onRetry,
  retryLabel,
  retryLabelFa,
  className = "",
}: ErrorStateProps) {
  const { t, language } = useLanguage();

  const displayTitle =
    language === "fa" && titleFa
      ? titleFa
      : title || t("Error", "خطا");
  const displayMessage =
    language === "fa" && messageFa
      ? messageFa
      : message || t("Something went wrong", "مشکلی پیش آمده است");

  return (
    <div className={`${styles.errorState} ${className}`}>
      <div className={styles.icon}>
        <FiAlertCircle />
      </div>
      <h3 className={styles.title}>{displayTitle}</h3>
      <p className={styles.message}>{displayMessage}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          variant="primary"
          className={styles.retryButton}
        >
          <FiRefreshCw />
          <span>
            {language === "fa" && retryLabelFa
              ? retryLabelFa
              : retryLabel || t("Retry", "تلاش مجدد")}
          </span>
        </Button>
      )}
    </div>
  );
}

