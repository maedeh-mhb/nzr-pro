import React, { forwardRef, useContext } from "react";
import styles from "@/styles/components/_input.module.scss";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

// Safe context import
let LanguageContext: React.Context<any> | null = null;
try {
  const languageModule = require("@/lib/utils/language");
  LanguageContext = languageModule.LanguageContext || null;
} catch (error) {
  console.warn("Language context not available:", error);
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = "", name, type, ...props }, ref) => {
    // Handle value separately to ensure it's never null
    const { value, ...restProps } = props;
    const inputProps: any = { ...restProps };
    if ("value" in props) {
      inputProps.value = value === null || value === undefined ? "" : value;
    }


    // State for guestPhone custom error
    const [customPhoneError, setCustomPhoneError] = React.useState<string>("");

    // Call useContext unconditionally (React rules of hooks)
    // If LanguageContext is undefined, we pass null which makes useContext return undefined
    const ctx = useContext(LanguageContext ?? React.createContext(null));

    // Determine language from context, then from <html lang>, then from localStorage
    let language = "en";
    if (ctx && typeof ctx === "object" && "language" in ctx && ctx.language) {
      language = ctx.language as string;
    } else if (typeof document !== "undefined" && document.documentElement.lang) {
      if (document.documentElement.lang === "fa") language = "fa";
    } else if (typeof window !== "undefined" && window.localStorage) {
      const savedLang = window.localStorage.getItem("language");
      if (savedLang === "fa") language = "fa";
    }

    // Error messages
    const messages = {
      onlyDigits: language === "fa" ? "ورودی فقط باید شامل اعداد ۰ تا ۹ باشد" : "Input can only be numbers between 0 to 9",
      mustStartWith0: language === "fa" ? "شماره باید با ۰ شروع شود" : "Phone number must start with 0",
      mustBe9: language === "fa" ? "رقم دوم باید ۹ باشد" : "Second digit must be 9",
      max11: language === "fa" ? "شماره تلفن نمی‌تواند بیشتر از ۱۱ رقم باشد" : "Phone number cannot be larger than 11 digits",
    };

    // Only allow digits for guestPhone and show custom messages, prevent invalid input
    const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
      if (name === "guestPhone") {
        let val = e.currentTarget.value;
        let msg = "";
        // Only allow digits
        if (/[^\d]/.test(val)) {
          msg = messages.onlyDigits;
          val = val.replace(/[^\d]/g, "");
        }
        // Max 11 digits
        if (val.length > 11) {
          msg = messages.max11;
          val = val.slice(0, 11);
        }
        // Must start with 0
        if (val.length > 0 && val[0] !== "0") {
          msg = messages.mustStartWith0;
          val = "";
        }
        // Second digit must be 9
        if (val.length > 1 && val[1] !== "9") {
          msg = messages.mustBe9;
          val = val[0]; // Only keep the first digit
        }
        e.currentTarget.value = val;
        setCustomPhoneError(msg);
      }
      if (props.onInput) props.onInput(e);
    };

    // Merge className and error
    const inputClassName = `${styles.input}${(error || (name === "guestPhone" && customPhoneError)) ? " error" : ""} ${className}`.trim();

    return (
      <div className={styles.formGroup}>
        {label && <label className={styles.label}>{label}</label>}
        <div className={icon ? styles.inputWithIcon : undefined}>
          {icon && <span className={styles.inputIcon}>{icon}</span>}
          <input
            ref={ref}
            name={name}
            type={type}
            className={inputClassName}
            aria-invalid={!!error || (name === "guestPhone" && !!customPhoneError)}
            onInput={handleInput}
            data-farsi={language === "fa" ? "true" : undefined}
            {...inputProps}
          />
        </div>
        {name === "guestPhone" && customPhoneError && <p className={styles.error}>{customPhoneError}</p>}
        {error && <p className={styles.error}>{error}</p>}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

