"use client";

import SkeletonLoader from "./SkeletonLoader";
import styles from "@/styles/components/_tableSkeleton.module.scss";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

export default function TableSkeleton({
  rows = 5,
  columns = 4,
  showHeader = true,
}: TableSkeletonProps) {
  return (
    <div className={styles.tableSkeleton}>
      {showHeader && (
        <div className={styles.header}>
          {Array.from({ length: columns }).map((_, index) => (
            <SkeletonLoader
              key={index}
              variant="text"
              width="100%"
              height={20}
            />
          ))}
        </div>
      )}
      <div className={styles.body}>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className={styles.row}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <SkeletonLoader
                key={colIndex}
                variant="text"
                width={colIndex === 0 ? "60%" : "100%"}
                height={16}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

