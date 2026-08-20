"use client";

import styles from "@/styles/components/_skeletonLoader.module.scss";

interface SkeletonLoaderProps {
  width?: string | number;
  height?: string | number;
  variant?: "text" | "circular" | "rectangular" | "card";
  lines?: number; // For text variant
  className?: string;
}

export default function SkeletonLoader({
  width,
  height,
  variant = "rectangular",
  lines = 1,
  className = "",
}: SkeletonLoaderProps) {
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  if (variant === "text") {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${styles.skeleton} ${styles.text}`}
            style={
              index === lines - 1
                ? { ...style, width: width || "60%" }
                : { ...style, width: width || "100%" }
            }
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={style}
    />
  );
}

