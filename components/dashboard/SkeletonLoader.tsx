"use client";

import styles from "@/styles/components/_loading.module.scss";

interface SkeletonLoaderProps {
  type?: "statCard" | "card" | "list" | "table" | "text" | "image" | "button" | "avatar" | "productCard";
  count?: number;
  className?: string;
}

export default function SkeletonLoader({ type = "card", count = 1, className = "" }: SkeletonLoaderProps) {
  const renderSkeleton = () => {
    switch (type) {
      case "statCard":
        return (
          <div className={`${styles.skeletonCard} ${className}`}>
            <div className={styles.skeleton} style={{ width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 1rem" }} />
            <div className={styles.skeleton} style={{ width: "80%", height: "2rem", margin: "0 auto 0.5rem" }} />
            <div className={styles.skeleton} style={{ width: "60%", height: "1rem", margin: "0 auto" }} />
          </div>
        );

      case "card":
        return (
          <div className={`${styles.skeletonCard} ${className}`}>
            <div className={styles.skeletonTitle} />
            <div className={styles.skeletonText} />
            <div className={styles.skeletonText} />
            <div className={styles.skeletonText} style={{ width: "60%" }} />
          </div>
        );

      case "list":
        return (
          <div className={className}>
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} className={styles.skeletonCard} style={{ marginBottom: "1rem" }}>
                <div className={styles.skeleton} style={{ width: "100%", height: "1.5rem", marginBottom: "0.5rem" }} />
                <div className={styles.skeleton} style={{ width: "80%", height: "1rem", marginBottom: "0.25rem" }} />
                <div className={styles.skeleton} style={{ width: "60%", height: "1rem" }} />
              </div>
            ))}
          </div>
        );

      case "table":
        return (
          <div className={className}>
            <div className={styles.skeleton} style={{ width: "100%", height: "2rem", marginBottom: "1rem" }} />
            {Array.from({ length: count }).map((_, i) => (
              <div key={i} style={{ display: "flex", gap: "1rem", marginBottom: "0.75rem" }}>
                <div className={styles.skeleton} style={{ width: "30%", height: "1.5rem" }} />
                <div className={styles.skeleton} style={{ width: "25%", height: "1.5rem" }} />
                <div className={styles.skeleton} style={{ width: "20%", height: "1.5rem" }} />
                <div className={styles.skeleton} style={{ width: "25%", height: "1.5rem" }} />
              </div>
            ))}
          </div>
        );

      case "text":
        return (
          <div className={className}>
            <div className={styles.skeleton} style={{ width: "100%", height: "1rem", marginBottom: "0.5rem" }} />
            <div className={styles.skeleton} style={{ width: "100%", height: "1rem", marginBottom: "0.5rem" }} />
            <div className={styles.skeleton} style={{ width: "80%", height: "1rem" }} />
          </div>
        );

      case "image":
        return <div className={`${styles.skeleton} ${styles.image} ${className}`} />;

      case "button":
        return <div className={`${styles.skeleton} ${styles.button} ${className}`} />;

      case "avatar":
        return <div className={`${styles.skeleton} ${styles.circle} ${className}`} />;

      case "productCard":
        return (
          <div className={`${styles.skeletonCard} ${className}`} style={{ borderRadius: "12px", overflow: "hidden" }}>
            <div className={styles.skeleton} style={{ width: "100%", height: "280px", marginBottom: "1rem" }} />
            <div style={{ padding: "1rem" }}>
              <div className={styles.skeleton} style={{ width: "80%", height: "1.5rem", marginBottom: "0.75rem" }} />
              <div className={styles.skeleton} style={{ width: "100%", height: "1rem", marginBottom: "0.5rem" }} />
              <div className={styles.skeleton} style={{ width: "60%", height: "1rem", marginBottom: "1rem" }} />
              <div className={styles.skeleton} style={{ width: "40%", height: "1.75rem" }} />
            </div>
          </div>
        );

      default:
        return <div className={`${styles.skeleton} ${className}`} />;
    }
  };

  if (type === "list" || type === "table") {
    return <>{renderSkeleton()}</>;
  }

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i}>{renderSkeleton()}</div>
      ))}
    </>
  );
}

