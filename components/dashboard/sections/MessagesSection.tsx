"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import { FiArrowLeft, FiMessageCircle, FiSend } from "react-icons/fi";
import SwipeableItem from "../SwipeableItem";
import SkeletonLoader from "../SkeletonLoader";
import EmptyState from "../EmptyState";
import styles from "@/styles/components/_dashboard.module.scss";

interface MessagesSectionProps {
  setActiveSection: (section: string) => void;
}

interface Message {
  id: string;
  subject: string;
  message: string;
  reply: string | null;
  replyAt: Date | string | null;
  isReadByUser: boolean;
  createdAt: Date | string;
}

export default function MessagesSection({ setActiveSection }: MessagesSectionProps) {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/messages");
        if (response.ok) {
          const data = await response.json();
          setMessages(data.data || data.messages || []);
        } else {
          console.error("Failed to fetch messages");
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/user/messages/${messageId}/read`, {
        method: "POST",
      });
      if (response.ok) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId ? { ...msg, isReadByUser: true } : msg
          )
        );
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
    }
  };

  const handleDelete = async (messageId: string) => {
    if (!confirm(t("Are you sure you want to delete this message?", "آیا مطمئن هستید که می‌خواهید این پیام را حذف کنید؟"))) {
      return;
    }

    try {
      const response = await fetch(`/api/user/messages/${messageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete message");
      }

      toast.success(t("Message deleted successfully", "پیام با موفقیت حذف شد"));
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(t("Failed to delete message", "خطا در حذف پیام"));
    }
  };

  return (
    <>
      <button
        className={styles.backButton}
        onClick={() => setActiveSection("home")}
      >
        <FiArrowLeft />
        <span>{t("Back to Dashboard", "بازگشت به داشبورد")}</span>
      </button>
      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiMessageCircle /></span>
            <span>{t("Messages", "پیام‌ها")}</span>
          </h3>
        </div>
        {loading ? (
          <SkeletonLoader type="list" count={3} />
        ) : messages.length === 0 ? (
          <EmptyState
            icon={<FiMessageCircle />}
            title={t("No Messages Yet", "هنوز پیامی وجود ندارد")}
            titleFa="هنوز پیامی وجود ندارد"
            description={t("Send us a message and we'll get back to you", "پیامی برای ما ارسال کنید و ما به شما پاسخ خواهیم داد")}
            descriptionFa="پیامی برای ما ارسال کنید و ما به شما پاسخ خواهیم داد"
            action={{
              label: t("Send Message", "ارسال پیام"),
              labelFa: "ارسال پیام",
              onClick: () => window.location.href = "/contact"
            }}
          />
        ) : (
          <div className={styles.messagesList}>
            {messages.map((message) => (
              <SwipeableItem
                key={message.id}
                onDelete={() => handleDelete(message.id)}
                deleteLabel={t("Delete", "حذف")}
              >
                <div
                  className={`${styles.messageItem} ${!message.isReadByUser && message.reply ? styles.unreadMessage : ""
                    }`}
                >
                  <div className={styles.messageHeader}>
                    <h4 className={styles.messageSubject}>{message.subject}</h4>
                    {!message.isReadByUser && message.reply && (
                      <span className={styles.unreadBadge}>
                        {t("New Reply", "پاسخ جدید")}
                      </span>
                    )}
                  </div>
                  <div className={styles.messageContent}>
                    <div className={styles.messageSection}>
                      <div className={styles.messageLabel}>
                        {t("Your Message", "پیام شما")}:
                      </div>
                      <div className={styles.messageText}>{message.message}</div>
                      <div className={styles.messageDate}>
                        {formatDate(message.createdAt)}
                      </div>
                    </div>
                    {message.reply ? (
                      <div className={styles.replySection}>
                        <div className={styles.messageLabel}>
                          {t("Admin Reply", "پاسخ ادمین")}:
                        </div>
                        <div className={styles.replyText}>{message.reply}</div>
                        <div className={styles.messageDate}>
                          {message.replyAt && formatDate(message.replyAt)}
                        </div>
                        {!message.isReadByUser && (
                          <button
                            className={styles.markReadButton}
                            onClick={() => handleMarkAsRead(message.id)}
                          >
                            {t("Mark as Read", "علامت‌گذاری به عنوان خوانده شده")}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className={styles.pendingReply}>
                        {t("Waiting for admin reply...", "در انتظار پاسخ ادمین...")}
                      </div>
                    )}
                  </div>
                </div>
              </SwipeableItem>
            ))}
          </div>
        )}
        <div style={{ marginTop: "1rem" }}>
          <a href="/contact" className={styles.continueCheckoutBtn}>
            <FiSend style={{ marginRight: "0.5rem" }} />
            {t("Send New Message", "ارسال پیام جدید")}
          </a>
        </div>
      </div>
    </>
  );
}

