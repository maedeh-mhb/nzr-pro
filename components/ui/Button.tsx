import React from "react";
import styles from "@/styles/components/_button.module.scss";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "secondary" | "danger" | "save";
  size?: "small" | "medium" | "large";
  children: React.ReactNode;
}

export default function Button({
  variant = "primary",
  size = "medium",
  children,
  className = "",
  ...props
}: ButtonProps) {
  const variantClass = styles[variant] || styles.primary;
  const sizeClass = styles[size] || styles.medium;
  
  return (
    <button
      className={`${styles.button} ${variantClass} ${sizeClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

