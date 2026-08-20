"use client";

import { forwardRef } from "react";
import styles from "@/styles/components/_checkbox.module.scss";

interface CheckboxProps {
  label?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, checked, onChange, disabled, error, className, ...props }, ref) => {
    return (
      <div className={`${styles.checkboxContainer} ${className || ""}`}>
        <label className={`${styles.checkboxLabel} ${disabled ? styles.disabled : ""}`}>
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            className={styles.checkboxInput}
            {...props}
          />
          <span className={styles.checkboxCustom}></span>
          {label && <span className={styles.checkboxText}>{label}</span>}
        </label>
        {error && <span className={styles.checkboxError}>{error}</span>}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
