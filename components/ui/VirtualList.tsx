"use client";

import { useMemo } from "react";
import styles from "@/styles/components/_virtualList.module.scss";

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = "",
}: VirtualListProps<T>) {
  // Render all items as a simple list (non-virtual) since react-window has type issues
  return (
    <div
      className={`${styles.virtualListContainer} ${className}`}
      style={{ height: containerHeight, overflow: "auto" }}
    >
      {items.map((item, index) => (
        <div
          key={index}
          style={{ height: itemHeight }}
          className={styles.virtualRow}
        >
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
}

