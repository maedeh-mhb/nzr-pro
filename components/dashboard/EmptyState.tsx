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
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  titleFa,
  description,
  descriptionFa,
  action,
  className,
}: EmptyStateProps) {
  const { t, language } = useLanguage();

  const displayTitle = language === "fa" && titleFa ? titleFa : title;
  const displayDescription = language === "fa" && descriptionFa ? descriptionFa : description;
  const displayActionLabel = language === "fa" && action?.labelFa ? action.labelFa : action?.label;

  return (
    <div className={`${styles.emptyState} ${className || ""}`}>
      {icon && <div className={styles.emptyStateIcon}>{icon}</div>}
      
      <div className={styles.emptyStateContent}>
        <h3 className={styles.emptyStateTitle}>{displayTitle}</h3>
        
        {displayDescription && (
          <p className={styles.emptyStateDescription}>{displayDescription}</p>
        )}
        
        {action && (
          <div className={styles.emptyStateAction}>
            <Button variant="primary" onClick={action.onClick}>
              {displayActionLabel}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
