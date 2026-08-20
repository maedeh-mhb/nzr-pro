"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiCheck, FiClock, FiPackage, FiTruck, FiX } from "react-icons/fi";
import styles from "@/styles/components/_dashboard.module.scss";

interface OrderStatusTimelineProps {
  orderId: string;
  currentStatus: string;
  className?: string;
  deliveryConfirmedByUser?: string | null;
  onRequestDeliveryConfirmation?: (orderId: string) => void;
}

interface StatusHistoryEntry {
  id: string;
  status: string;
  previousStatus: string | null;
  changedByType: string | null;
  changedByName: string;
  notes: string | null;
  createdAt: Date | string;
}

export default function OrderStatusTimeline({
  orderId,
  currentStatus,
  className = "",
  deliveryConfirmedByUser,
  onRequestDeliveryConfirmation,
}: OrderStatusTimelineProps) {
  const { t, language } = useLanguage();
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/user/orders/${orderId}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error("Error fetching order history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      fetchHistory();
    }
  }, [orderId]);

  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; labelFa: string; icon: React.ReactNode; color: string }> = {
      pending: {
        label: "Pending",
        labelFa: "در انتظار",
        icon: <FiClock />,
        color: "#f39c12",
      },
      pending_payment: {
        label: "Pending Payment",
        labelFa: "در انتظار پرداخت",
        icon: <FiClock />,
        color: "#f39c12",
      },
      processing: {
        label: "Processing",
        labelFa: "در حال پردازش",
        icon: <FiPackage />,
        color: "#3498db",
      },
      shipped: {
        label: "Shipped",
        labelFa: "ارسال شده",
        icon: <FiTruck />,
        color: "#3498db",
      },
      delivered: {
        label: "Delivered",
        labelFa: "تحویل شده",
        icon: <FiCheck />,
        color: "#27ae60",
      },
      cancelled: {
        label: "Cancelled",
        labelFa: "لغو شده",
        icon: <FiX />,
        color: "#e74c3c",
      },
    };

    return statusMap[status?.toLowerCase()] || {
      label: status,
      labelFa: status,
      icon: <FiClock />,
      color: "#95a5a6",
    };
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  if (loading) {
    return (
      <div className={`${styles.timelineContainer} ${className}`}>
        <div className={styles.timelineLoading}>
          {t("Loading timeline...", "در حال بارگذاری خط زمانی...")}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return null;
  }

  // Reverse history to show oldest first
  const sortedHistory = [...history].reverse();

  const statusOrder = ["pending", "pending_payment", "processing", "preparing", "shipped", "in_transit", "delivered"];

  const getCompletedStatuses = (currentStatus: string): string[] => {
    const normalizedCurrentStatus = currentStatus.toLowerCase();
    const currentIndex = statusOrder.indexOf(normalizedCurrentStatus);

    // If current status is not in order, include it anyway (e.g., cancelled)
    if (currentIndex === -1) {
      // For cancelled, include all statuses up to where it was processed
      if (normalizedCurrentStatus === "cancelled") {
        return ["pending", "pending_payment", "processing", "cancelled"];
      }
      return [normalizedCurrentStatus];
    }

    return statusOrder.slice(0, currentIndex + 1);
  };

  const completedStatuses = getCompletedStatuses(currentStatus);

  // Create a map of existing history entries by status
  const historyMap = new Map(sortedHistory.map(entry => [entry.status.toLowerCase(), entry]));

  // Generate full timeline with all statuses in order
  const timelineEntries = statusOrder
    .filter(status => {
      // Include all statuses up to current status, and the current status itself if not in statusOrder
      return statusOrder.indexOf(status) <= statusOrder.indexOf(currentStatus.toLowerCase()) ||
        currentStatus.toLowerCase() === status;
    })
    .map(status => {
      const existingEntry = historyMap.get(status);
      // Use existing entry if available, otherwise create a placeholder
      return {
        status,
        ...existingEntry,
        id: existingEntry?.id || `${status}-placeholder`,
        isPlaceholder: !existingEntry,
      };
    });

  return (
    <div className={`${styles.timelineContainer} ${className}`}>
      <h4 className={styles.timelineTitle}>
        {t("Order Status Timeline", "خط زمانی وضعیت سفارش")}
      </h4>
      <div className={styles.timeline}>
        {timelineEntries.map((entry, index) => {
          const statusInfo = getStatusInfo(entry.status);
          const isLast = index === timelineEntries.length - 1;
          const isCompleted = completedStatuses.includes(entry.status.toLowerCase());
          const isActive = entry.status === currentStatus;

          return (
            <div key={entry.id} className={styles.timelineItem}>
              <div className={styles.timelineMarker}>
                <div
                  className={`${styles.timelineIcon} ${isActive ? styles.timelineIconActive : isCompleted ? styles.timelineIconCompleted : ""}`}
                  style={{ color: statusInfo.color }}
                >
                  {statusInfo.icon}
                </div>
                {!isLast && <div className={styles.timelineLine} />}
              </div>
              <div className={styles.timelineContent}>
                <div className={styles.timelineStatus}>
                  <span className={styles.timelineStatusLabel}>
                    {language === "fa" ? statusInfo.labelFa : statusInfo.label}
                  </span>
                  {isActive && (
                    <span className={styles.timelineCurrentBadge}>
                      {t("Current", "فعلی")}
                    </span>
                  )}
                </div>
                {!entry.isPlaceholder && (
                  <div className={styles.timelineMeta}>
                    <span className={styles.timelineDate}>
                      {entry.createdAt ? formatDate(entry.createdAt) : ""}
                    </span>
                    {entry.changedByName && (
                      <span className={styles.timelineActor}>
                        {t("by", "توسط")} {entry.changedByName}
                      </span>
                    )}
                  </div>
                )}
                {!entry.isPlaceholder && entry.notes && (
                  <div className={styles.timelineNotes}>
                    {entry.notes}
                  </div>
                )}
                {entry.isPlaceholder && isCompleted && (
                  <div className={styles.timelineMeta}>
                    <span className={styles.timelineDate} style={{ color: "#999", fontStyle: "italic" }}>
                      {t("Auto-progressed", "پیشرفت خودکار")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delivery Confirmation Button */}
      {currentStatus?.toLowerCase() === "delivered" && !deliveryConfirmedByUser && onRequestDeliveryConfirmation && (
        <div className={styles.timelineConfirmationPrompt}>
          <p>{t("Has this order been delivered and verified?", "آیا این سفارش تحویل شده و تأیید شده است؟")}</p>
          <button
            className={styles.timelineConfirmationButton}
            onClick={() => onRequestDeliveryConfirmation(orderId)}
          >
            {t("Confirm Delivery", "تأیید تحویل")}
          </button>
        </div>
      )}

      {/* Delivery Confirmed Message */}
      {deliveryConfirmedByUser && (
        <div className={styles.timelineDeliveryConfirmed}>
          <FiCheck />
          <span>{t("Delivery Confirmed", "تحویل تأیید شده")}</span>
        </div>
      )}
    </div>
  );
}

