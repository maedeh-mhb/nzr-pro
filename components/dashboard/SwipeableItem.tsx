"use client";

import { useRef, useState, useEffect, ReactNode } from "react";
import { FiTrash2, FiArchive } from "react-icons/fi";
import styles from "@/styles/components/_swipeableItem.module.scss";

interface SwipeableItemProps {
  children: ReactNode;
  onDelete?: () => void;
  onArchive?: () => void;
  disabled?: boolean;
  deleteLabel?: string;
  archiveLabel?: string;
  className?: string;
}

export default function SwipeableItem({
  children,
  onDelete,
  onArchive,
  disabled = false,
  deleteLabel = "Delete",
  archiveLabel = "Archive",
  className = "",
}: SwipeableItemProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const itemRef = useRef<HTMLDivElement>(null);
  const SWIPE_THRESHOLD = 80; // Minimum distance to trigger action
  const MAX_SWIPE = 200; // Maximum swipe distance

  // Reset swipe on window resize or orientation change
  useEffect(() => {
    const handleResize = () => {
      setSwipeOffset(0);
      setIsSwiping(false);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setCurrentX(touch.clientX);
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !isSwiping) return;
    const touch = e.touches[0];
    const deltaX = touch.clientX - startX;
    const deltaY = Math.abs(touch.clientY - startY);

    // Only allow horizontal swipe if horizontal movement is greater than vertical
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      e.preventDefault();
      const newOffset = Math.max(
        -MAX_SWIPE,
        Math.min(MAX_SWIPE, deltaX)
      );
      setSwipeOffset(newOffset);
      setCurrentX(touch.clientX);
    }
  };

  const handleTouchEnd = () => {
    if (disabled || !isSwiping) return;

    const absOffset = Math.abs(swipeOffset);
    const isRTL = document.documentElement.dir === "rtl";
    const isSwipingLeft = swipeOffset < 0;
    const isSwipingRight = swipeOffset > 0;

    // Determine swipe direction based on RTL/LTR
    const shouldTriggerDelete = isRTL
      ? isSwipingRight && absOffset > SWIPE_THRESHOLD
      : isSwipingLeft && absOffset > SWIPE_THRESHOLD;

    const shouldTriggerArchive = isRTL
      ? isSwipingLeft && absOffset > SWIPE_THRESHOLD
      : isSwipingRight && absOffset > SWIPE_THRESHOLD;

    if (shouldTriggerDelete && onDelete) {
      onDelete();
      setSwipeOffset(0);
    } else if (shouldTriggerArchive && onArchive) {
      onArchive();
      setSwipeOffset(0);
    } else {
      // Snap back
      setSwipeOffset(0);
    }

    setIsSwiping(false);
  };

  const handleActionClick = (action: "delete" | "archive") => {
    if (action === "delete" && onDelete) {
      onDelete();
    } else if (action === "archive" && onArchive) {
      onArchive();
    }
    setSwipeOffset(0);
  };

  const hasActions = onDelete || onArchive;
  const isRTL = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  // Show action buttons only when swiping
  const showActions = Math.abs(swipeOffset) > 10;

  return (
    <div className={`${styles.swipeableContainer} ${className}`}>
      {/* Action buttons background */}
      {hasActions && (
        <div 
          className={styles.actionButtons}
          style={{
            opacity: showActions ? 1 : 0,
            pointerEvents: showActions ? "auto" : "none",
          }}
        >
          {onArchive && (
            <button
              className={`${styles.actionButton} ${styles.archiveButton}`}
              onClick={() => handleActionClick("archive")}
              aria-label={archiveLabel}
            >
              <FiArchive />
              <span>{archiveLabel}</span>
            </button>
          )}
          {onDelete && (
            <button
              className={`${styles.actionButton} ${styles.deleteButton}`}
              onClick={() => handleActionClick("delete")}
              aria-label={deleteLabel}
            >
              <FiTrash2 />
              <span>{deleteLabel}</span>
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      <div
        ref={itemRef}
        className={`${styles.swipeableItem} ${isSwiping ? styles.swiping : ""}`}
        style={{
          transform: `translateX(${swipeOffset}px)`,
          transition: isSwiping ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}

