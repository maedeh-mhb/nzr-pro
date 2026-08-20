"use client";

import { ReactNode } from "react";
import { useLanguage } from "@/lib/utils/language";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_emptyState.module.scss";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  titleFa?: string;
  description?: string;
  descriptionFa?: string;
  action?: {
    label: string;
    labelFa?: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    labelFa?: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  titleFa,
  description,
  descriptionFa,
  action,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  const { t, language } = useLanguage();

  const displayTitle = language === "fa" && titleFa ? titleFa : title;
  const displayDescription =
    language === "fa" && descriptionFa ? descriptionFa : description;

  return (
    <div className={`${styles.emptyState} ${className}`}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{displayTitle}</h3>
      {displayDescription && (
        <p className={styles.description}>{displayDescription}</p>
      )}
      {(action || secondaryAction) && (
        <div className={styles.actions}>
          {action && (
            <Button
              onClick={action.onClick}
              variant="primary"
              className={styles.actionButton}
            >
              {language === "fa" && action.labelFa
                ? action.labelFa
                : action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              className={styles.actionButton}
            >
              {language === "fa" && secondaryAction.labelFa
                ? secondaryAction.labelFa
                : secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

