"use client";

import styles from "@/styles/components/_adminStats.module.scss";

export default function StatCardSkeleton() {
  return (
    <div className={styles.statCard}>
      <div className={styles.statHeader}>
        <div className={`${styles.statIcon} ${styles.skeleton}`}></div>
        <div className={`${styles.statTrend} ${styles.skeleton}`} style={{ width: "60px", height: "20px" }}></div>
      </div>
      <div className={`${styles.statValue} ${styles.skeleton}`} style={{ width: "80px", height: "32px", marginBottom: "0.5rem" }}></div>
      <div className={`${styles.statLabel} ${styles.skeleton}`} style={{ width: "100px", height: "16px" }}></div>
    </div>
  );
}

