import React, { forwardRef } from "react";
import styles from "@/styles/components/_input.module.scss";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    // Handle value separately to ensure it's never null
    // If value is provided (even if undefined), convert null to empty string
    // If value is not provided at all, don't set it (for react-hook-form uncontrolled inputs)
    const { value, ...restProps } = props;
    const textareaProps: any = { ...restProps };

    if ("value" in props) {
      textareaProps.value = value === null || value === undefined ? "" : value;
    }

    // Merge className properly
    const textareaClassName = `${styles.input} ${className}`.trim();

    return (
      <div className={styles.formGroup}>
        {label && <label className={styles.label}>{label}</label>}
        <textarea
          ref={ref}
          className={textareaClassName}
          style={{ resize: 'none' }}
          data-farsi={props['lang'] === 'fa' || (typeof document !== 'undefined' && document.documentElement.lang === 'fa') ? 'true' : undefined}
          {...textareaProps}
        />
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;

