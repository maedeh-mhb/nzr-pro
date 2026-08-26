"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiMail, FiTrash2, FiEye, FiCheck, FiX, FiUser, FiSend } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import Button from "@/components/ui/Button";
import Modal from "../Modal";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface ContactMessage {
  id: string;
  userId: string | null;
  name: string;
  phone: string | null;
  message: string;
  isRead: boolean;
  reply?: string | null;
  replyAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

export default function ContactMessagesSection() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [replyingMessageId, setReplyingMessageId] = useState<string | null>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Load messages with infinite scroll
  const loadMessages = useCallback(async (cursor: string | null = null) => {
    setIsLoading(true);
    setError(null);
    try {
      const url = cursor
        ? `/api/admin/contact-messages?cursor=${cursor}&limit=20`
        : "/api/admin/contact-messages?limit=20";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch messages");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      if (cursor) {
        // Append to existing messages
        setMessages((prev) => [...prev, ...data.messages]);
      } else {
        // Replace messages
        setMessages(data.messages);
      }

      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (err: any) {
      console.error("Error fetching messages:", err);
      const errorMessage = err?.message || t("Failed to load messages", "خطا در بارگذاری پیام‌ها");
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial load
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMessages(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, isLoading, nextCursor, loadMessages]);

  const handleView = async (message: ContactMessage) => {
    // Fetch full message details including reply
    try {
      const response = await fetch(`/api/admin/contact-messages/${message.id}`);
      if (response.ok) {
        const fullMessage = await response.json();
        setSelectedMessage(fullMessage);
      } else {
        setSelectedMessage(message);
      }
    } catch (error) {
      console.error("Error fetching message details:", error);
      setSelectedMessage(message);
    }
    setIsViewModalOpen(true);

    // Mark as read if not already read
    if (!message.isRead) {
      try {
        const response = await fetch(`/api/admin/contact-messages/${message.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isRead: true }),
        });

        if (response.ok) {
          // Update local state
          setMessages((prev) =>
            prev.map((m) => (m.id === message.id ? { ...m, isRead: true } : m))
          );
        }
      } catch (error) {
        console.error("Error marking message as read:", error);
      }
    }
  };

  const handleDelete = (messageId: string) => {
    setDeletingMessageId(messageId);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingMessageId) return;

    try {
      const response = await fetch(`/api/admin/contact-messages/${deletingMessageId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("Message deleted successfully", "پیام با موفقیت حذف شد"));
        setMessages((prev) => prev.filter((m) => m.id !== deletingMessageId));
        setIsDeleteModalOpen(false);
        setDeletingMessageId(null);
      } else {
        throw new Error("Failed to delete message");
      }
    } catch (error) {
      console.error("Error deleting message:", error);
      toast.error(t("Failed to delete message", "خطا در حذف پیام"));
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
    try {
      const response = await fetch(`/api/admin/contact-messages/${messageId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRead: true }),
      });

      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, isRead: true } : m))
        );
        toast.success(t("Message marked as read", "پیام به عنوان خوانده شده علامت‌گذاری شد"));
      } else {
        throw new Error("Failed to mark as read");
      }
    } catch (error) {
      console.error("Error marking message as read:", error);
      toast.error(t("Failed to mark as read", "خطا در علامت‌گذاری"));
    }
  };

  const handleReply = async (messageId: string) => {
    const replyText = replyTexts[messageId]?.trim();
    if (!replyText) {
      toast.error(t("Please enter a reply", "لطفاً پاسخ را وارد کنید"));
      return;
    }

    setReplyingMessageId(messageId);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reply: replyText }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(t("Reply sent successfully", "پاسخ با موفقیت ارسال شد"));
        // Fetch updated message to get the replyAt timestamp
        const messageResponse = await fetch(`/api/admin/contact-messages/${messageId}`);
        if (messageResponse.ok) {
          const updatedMessage = await messageResponse.json();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reply: replyText,
                    replyAt: updatedMessage.replyAt || new Date(),
                  }
                : m
            )
          );
          // Update selectedMessage if it's the same message
          if (selectedMessage && selectedMessage.id === messageId) {
            setSelectedMessage(updatedMessage);
          }
        } else {
          // Fallback: update with current time if fetch fails
          const fallbackDate = new Date();
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId
                ? {
                    ...m,
                    reply: replyText,
                    replyAt: fallbackDate,
                  }
                : m
            )
          );
          // Update selectedMessage if it's the same message
          if (selectedMessage && selectedMessage.id === messageId) {
            setSelectedMessage({
              ...selectedMessage,
              reply: replyText,
              replyAt: fallbackDate,
            });
          }
        }
        // Clear reply text
        setReplyTexts((prev) => {
          const newTexts = { ...prev };
          delete newTexts[messageId];
          return newTexts;
        });
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to send reply");
      }
    } catch (error: any) {
      console.error("Error sending reply:", error);
      toast.error(error?.message || t("Failed to send reply", "خطا در ارسال پاسخ"));
    } finally {
      setReplyingMessageId(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className={styles.sectionContainer}>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h2 className={cardStyles.cardTitle}>
            <FiMail />
            {t("Contact Messages", "پیام‌های تماس")}
          </h2>
        </div>

        {error && (
          <div style={{ padding: "1rem", color: "var(--danger)", background: "#fee", borderRadius: "8px", margin: "1rem 0" }}>
            {error}
          </div>
        )}

        {/* Mobile Card View */}
        <div className={styles.mobileMessagesList}>
          {messages.length === 0 && !isLoading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#7f8c8d" }}>
              {t("No messages found", "پیامی یافت نشد")}
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={styles.mobileMessageCard}
                style={{
                  backgroundColor: !message.isRead ? "#f8f9fa" : "#ffffff",
                  borderLeft: !message.isRead ? "4px solid #e65100" : "4px solid transparent",
                }}
              >
                <button
                  className={styles.mobileMessageCardButton}
                  onClick={() => {
                    setExpandedMessageId(expandedMessageId === message.id ? null : message.id);
                    if (!message.isRead && expandedMessageId !== message.id) {
                      handleMarkAsRead(message.id);
                    }
                  }}
                >
                  <div className={styles.mobileMessageCardHeader}>
                    <div className={styles.mobileMessageCardInfo}>
                      <div className={styles.mobileMessageCardName}>
                        {message.user && <FiUser style={{ marginRight: "0.5rem" }} />}
                        {message.name}
                      </div>
                    </div>
                    {!message.isRead && (
                      <span className={styles.mobileMessageUnreadBadge}>
                        {t("Unread", "خوانده نشده")}
                      </span>
                    )}
                  </div>
                </button>
                {expandedMessageId === message.id && (
                  <div className={styles.mobileMessageExpanded}>
                    <div className={styles.mobileMessageDetail}>
                    {message.phone && (
                      <div className={styles.mobileMessageDetail}>
                        <strong>{t("Phone:", "تلفن:")}</strong> {message.phone}
                      </div>
                    )}
                    </div>
                    <div className={styles.mobileMessageDetail}>
                      <strong>{t("Message:", "پیام:")}</strong>
                      <div className={styles.mobileMessageBody}>{message.message}</div>
                    </div>
                    <div className={styles.mobileMessageDetail}>
                      <strong>{t("Date:", "تاریخ:")}</strong> {formatDate(message.createdAt)}
                    </div>
                    {message.reply && (
                      <div className={styles.mobileMessageDetail}>
                        <strong>{t("Your Reply:", "پاسخ شما:")}</strong>
                        <div className={styles.mobileMessageReply}>
                          {message.reply}
                        </div>
                        {message.replyAt && (
                          <div className={styles.mobileMessageReplyDate}>
                            {t("Replied on:", "پاسخ داده شده در:")} {formatDate(message.replyAt)}
                          </div>
                        )}
                      </div>
                    )}
                    <div className={styles.mobileMessageReplySection}>
                      <label className={styles.mobileMessageReplyLabel}>
                        {t("Reply:", "پاسخ:")}
                      </label>
                      <textarea
                        className={styles.mobileMessageReplyInput}
                        value={replyTexts[message.id] || ""}
                        onChange={(e) => {
                          setReplyTexts((prev) => ({
                            ...prev,
                            [message.id]: e.target.value,
                          }));
                        }}
                        placeholder={t("Type your reply...", "پاسخ خود را بنویسید...")}
                        rows={4}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Button
                        variant="primary"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReply(message.id);
                        }}
                        disabled={replyingMessageId === message.id || !replyTexts[message.id]?.trim()}
                        style={{ marginTop: "0.5rem", width: "100%" }}
                      >
                        {replyingMessageId === message.id
                          ? t("Sending...", "در حال ارسال...")
                          : t("Send Reply", "ارسال پاسخ")}
                      </Button>
                    </div>
                    <div className={styles.mobileMessageActions}>
                      <Button
                        variant="outline"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleView(message);
                        }}
                        title={t("View Full", "مشاهده کامل")}
                      >
                        <FiEye style={{ marginRight: "0.25rem" }} />
                        {t("View Full", "مشاهده کامل")}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(message.id);
                        }}
                        title={t("Delete", "حذف")}
                      >
                        <FiTrash2 style={{ marginRight: "0.25rem" }} />
                        {t("Delete", "حذف")}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Desktop Table View */}
        <div className={styles.desktopMessagesTable}>
          <div className={styles.messagesTableWrapper}>
            <table className={styles.messagesTable}>
              <thead>
                <tr>
                  <th className={styles.tableColNumber}>#</th>
                  <th className={styles.tableColName}>{t("Name", "نام")}</th>
                  <th className={styles.tableColDate}>{t("Date", "تاریخ")}</th>
                  <th className={styles.tableColStatus}>{t("Status", "وضعیت")}</th>
                  <th className={styles.tableColActions}>{t("Actions", "عملیات")}</th>
                </tr>
              </thead>
              <tbody>
                {messages.length === 0 && !isLoading ? (
                  <tr>
                    <td colSpan={5} className={styles.tableEmptyCell}>
                      {t("No messages found", "پیامی یافت نشد")}
                    </td>
                  </tr>
                ) : (
                  messages.map((message, index) => (
                    <tr
                      key={message.id}
                      className={!message.isRead ? styles.tableRowUnread : ""}
                    >
                      <td className={styles.tableColNumber}>{index + 1}</td>
                      <td className={styles.tableColName}>
                        <div className={styles.tableNameCell}>
                          {message.user && <FiUser />}
                          {message.name}
                        </div>
                      </td>
                      <td className={styles.tableColDate}>
                        {formatDate(message.createdAt)}
                      </td>
                      <td className={styles.tableColStatus}>
                        <span className={message.isRead ? styles.statusBadgeRead : styles.statusBadgeUnread}>
                          {message.isRead ? t("Read", "خوانده شده") : t("Unread", "خوانده نشده")}
                        </span>
                      </td>
                      <td className={styles.tableColActions}>
                        <div className={styles.tableActions}>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleView(message)}
                            title={t("View", "مشاهده")}
                          >
                            <FiEye />
                          </Button>
                          {!message.isRead && (
                            <Button
                              variant="outline"
                              size="small"
                              onClick={() => handleMarkAsRead(message.id)}
                              title={t("Mark as read", "علامت‌گذاری به عنوان خوانده شده")}
                            >
                              <FiCheck />
                            </Button>
                          )}
                          <Button
                            variant="danger"
                            size="small"
                            onClick={() => handleDelete(message.id)}
                            title={t("Delete", "حذف")}
                          >
                            <FiTrash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Infinite scroll trigger */}
        <div ref={observerTarget} style={{ height: "20px", marginTop: "1rem" }}>
          {isLoading && (
            <div style={{ textAlign: "center", padding: "1rem", color: "#7f8c8d" }}>
              {t("Loading...", "در حال بارگذاری...")}
            </div>
          )}
        </div>
      </AdminCard>

      {/* View Message Modal */}
      {isViewModalOpen && selectedMessage && (
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title={t("Message Details", "جزئیات پیام")}
        >
          <div style={{ padding: "1rem 0" }}>
            <div style={{ marginBottom: "1rem" }}>
              <strong>{t("From:", "از:")}</strong> {selectedMessage.name}
              {selectedMessage.user && (
                <span style={{ marginLeft: "0.5rem", color: "#7f8c8d", fontSize: "0.9rem" }}>
                  ({t("Registered User", "کاربر ثبت‌نام شده")})
                </span>
              )}
            </div>
            {selectedMessage.phone && (
              <div style={{ marginBottom: "1rem" }}>
                <strong>{t("Phone:", "تلفن:")}</strong> {selectedMessage.phone}
              </div>
            )}
            <div style={{ marginBottom: "1rem" }}>
              <strong>{t("Message:", "پیام:")}</strong>
              <div
                style={{
                  marginTop: "0.5rem",
                  padding: "1rem",
                  background: "#f8f9fa",
                  borderRadius: "8px",
                  whiteSpace: "pre-wrap",
                }}
              >
                {selectedMessage.message}
              </div>
            </div>
            <div style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#7f8c8d" }}>
              {t("Sent on:", "ارسال شده در:")} {formatDate(selectedMessage.createdAt)}
            </div>
            
            {selectedMessage.reply && (
              <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e8e9ea" }}>
                <strong style={{ display: "block", marginBottom: "0.5rem" }}>
                  {t("Your Reply:", "پاسخ شما:")}
                </strong>
                <div
                  style={{
                    padding: "1rem",
                    background: "#e8f5e9",
                    borderRadius: "8px",
                    whiteSpace: "pre-wrap",
                    borderLeft: "3px solid #367260",
                  }}
                >
                  {selectedMessage.reply}
                </div>
                {selectedMessage.replyAt && (
                  <div style={{ marginTop: "0.5rem", fontSize: "0.85rem", color: "#7f8c8d" }}>
                    {t("Replied on:", "پاسخ داده شده در:")} {formatDate(selectedMessage.replyAt)}
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e8e9ea" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.5rem" }}>
                {t("Reply:", "پاسخ:")}
              </label>
              <textarea
                value={replyTexts[selectedMessage.id] || ""}
                onChange={(e) => {
                  setReplyTexts((prev) => ({
                    ...prev,
                    [selectedMessage.id]: e.target.value,
                  }));
                }}
                placeholder={t("Type your reply...", "پاسخ خود را بنویسید...")}
                rows={5}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  border: "1px solid #e8e9ea",
                  borderRadius: "8px",
                  fontFamily: "inherit",
                  fontSize: "0.9rem",
                  resize: "vertical",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#367260";
                  e.target.style.outline = "none";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#e8e9ea";
                }}
              />
              <Button
                variant="primary"
                onClick={() => handleReply(selectedMessage.id)}
                disabled={replyingMessageId === selectedMessage.id || !replyTexts[selectedMessage.id]?.trim()}
                style={{ marginTop: "0.75rem", width: "100%" }}
              >
                <FiSend style={{ marginRight: "0.5rem" }} />
                {replyingMessageId === selectedMessage.id
                  ? t("Sending...", "در حال ارسال...")
                  : t("Send Reply", "ارسال پاسخ")}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingMessageId(null);
          }}
          title={t("Delete Message", "حذف پیام")}
        >
          <p>{t("Are you sure you want to delete this message? This action cannot be undone.", "آیا مطمئن هستید که می‌خواهید این پیام را حذف کنید؟ این عمل قابل بازگشت نیست.")}</p>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem", justifyContent: "flex-end" }}>
            <Button
              variant="secondary"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingMessageId(null);
              }}
            >
              {t("Cancel", "لغو")}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t("Delete", "حذف")}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

