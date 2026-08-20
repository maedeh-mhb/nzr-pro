"use client";

import { useLanguage } from "@/lib/utils/language";
import { FieldErrors } from "react-hook-form";
import { FiAlertCircle } from "react-icons/fi";
import styles from "@/styles/components/_formValidationSummary.module.scss";

interface FormValidationSummaryProps {
  errors: FieldErrors<any>;
  className?: string;
}

export default function FormValidationSummary({
  errors,
  className = "",
}: FormValidationSummaryProps) {
  const { t, language } = useLanguage();

  // Flatten errors object to get all error messages
  const getErrorMessages = (errors: FieldErrors<any>): string[] => {
    const messages: string[] = [];
    
    const traverse = (obj: any, prefix = "") => {
      Object.keys(obj).forEach((key) => {
        const value = obj[key];
        const fieldName = prefix ? `${prefix}.${key}` : key;
        
        if (value?.message) {
          messages.push(value.message as string);
        } else if (typeof value === "object" && value !== null) {
          traverse(value, fieldName);
        }
      });
    };
    
    traverse(errors);
    return messages;
  };

  const errorMessages = getErrorMessages(errors);

  if (errorMessages.length === 0) return null;

  return (
    <div className={`${styles.validationSummary} ${className}`} role="alert">
      <div className={styles.summaryHeader}>
        <FiAlertCircle className={styles.summaryIcon} />
        <h4 className={styles.summaryTitle}>
          {t(
            "Please fix the following errors:",
            "لطفاً خطاهای زیر را برطرف کنید:"
          )}
        </h4>
      </div>
      <ul className={styles.summaryList}>
        {errorMessages.map((message, index) => (
          <li key={index} className={styles.summaryItem}>
            {message}
          </li>
        ))}
      </ul>
    </div>
  );
}

