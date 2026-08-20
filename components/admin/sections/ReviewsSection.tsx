"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiMessageSquare, FiCheck, FiX, FiTrash2, FiPackage, FiUser, FiChevronDown, FiChevronUp } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import StatusBadge from "../StatusBadge";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface Review {
  id: string;
  productId: string;
  productName: string; // Added for display
  productSlug?: string | null; // Added for display
  userId: string;
  reviewerName: string;
  reviewText: string;
  isVerified: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  product?: {
    id: string;
    name: string;
    nameFa: string | null;
    slug: string | null;
  } | null;
  user?: {
    id: string;
    name: string;
    surname: string | null;
    email: string;
  } | null;
}

export default function ReviewsSection() {
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "verified" | "unverified">("all");
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [expandedReviews, setExpandedReviews] = useState<Set<string>>(new Set());

  // Load reviews from API
  const loadReviews = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") {
        params.append("filter", filterType);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      const response = await fetch(`/api/admin/reviews?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        // Deduplicate reviews by ID on frontend as well (safety measure)
        const reviewsMap = new Map();
        (data.reviews || []).forEach((review: Review) => {
          if (!reviewsMap.has(review.id)) {
            reviewsMap.set(review.id, review);
          } else {
            // Log duplicate for debugging
            console.warn("Duplicate review detected:", review.id);
          }
        });
        const uniqueReviews = Array.from(reviewsMap.values());
        // Sort by createdAt to maintain order
        uniqueReviews.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime();
          const dateB = new Date(b.createdAt).getTime();
          return dateB - dateA; // Descending (newest first)
        });
        setReviews(uniqueReviews);
      } else {
        toast.error(t("Failed to load reviews", "خطا در بارگذاری نظرات"));
      }
    } catch (error) {
      console.error("Error loading reviews:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, [filterType, searchQuery, t]);

  const handleVerify = async (reviewId: string, verify: boolean) => {
    setIsUpdating(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVerified: verify }),
      });

      if (response.ok) {
        toast.success(
          verify
            ? t("Review verified successfully", "نظر با موفقیت تأیید شد")
            : t("Review rejected successfully", "نظر با موفقیت رد شد")
        );
        loadReviews();
      } else {
        toast.error(t("Failed to update review", "خطا در به‌روزرسانی نظر"));
      }
    } catch (error) {
      console.error("Error updating review:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(null);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm(t("Are you sure you want to delete this review?", "آیا مطمئن هستید که می‌خواهید این نظر را حذف کنید؟"))) {
      return;
    }

    setIsUpdating(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("Review deleted successfully", "نظر با موفقیت حذف شد"));
        loadReviews();
      } else {
        toast.error(t("Failed to delete review", "خطا در حذف نظر"));
      }
    } catch (error) {
      console.error("Error deleting review:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(null);
    }
  };

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

  const getProductName = (review: Review) => {
    if (language === "fa" && review.product?.nameFa) {
      return review.product.nameFa;
    }
    return review.product?.name || t("Unknown Product", "محصول نامشخص");
  };

  const getUserName = (review: Review) => {
    if (review.user) {
      return review.user.surname
        ? `${review.user.name} ${review.user.surname}`.trim()
        : review.user.name;
    }
    return review.reviewerName;
  };

  const getProductSlug = (review: Review) => {
    return review.productSlug || review.product?.slug || "";
  };

  const toggleReviewExpansion = (reviewId: string) => {
    setExpandedReviews((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(reviewId)) {
        newSet.delete(reviewId);
      } else {
        newSet.add(reviewId);
      }
      return newSet;
    });
  };

  return (
    <AdminCard>
      <div className={cardStyles.cardHeader}>
        <h3 className={cardStyles.cardTitle}>
          <FiMessageSquare />
          <span>{t("Reviews Management", "مدیریت نظرات")}</span>
        </h3>
      </div>
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <button
          onClick={() => setFilterType("all")}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            background: filterType === "all" ? "#007bff" : "white",
            color: filterType === "all" ? "white" : "#333",
            cursor: "pointer",
          }}
        >
          {t("All", "همه")}
        </button>
        <button
          onClick={() => setFilterType("verified")}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            background: filterType === "verified" ? "#007bff" : "white",
            color: filterType === "verified" ? "white" : "#333",
            cursor: "pointer",
          }}
        >
          {t("Verified", "تأیید شده")}
        </button>
        <button
          onClick={() => setFilterType("unverified")}
          style={{
            padding: "0.5rem 1rem",
            border: "1px solid #ddd",
            borderRadius: "0.5rem",
            background: filterType === "unverified" ? "#007bff" : "white",
            color: filterType === "unverified" ? "white" : "#333",
            cursor: "pointer",
          }}
        >
          {t("Pending", "در انتظار")}
        </button>
      </div>
      <SearchBar
        placeholder={t("Search reviews...", "جستجوی نظرات...")}
        value={searchQuery}
        onChange={setSearchQuery}
      />
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("Loading...", "در حال بارگذاری...")}
        </div>
      ) : reviews.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("No reviews found.", "هیچ نظری یافت نشد.")}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className={styles.reviewsMobileCards}>
            {reviews.map((review) => {
              const isExpanded = expandedReviews.has(review.id);
              const productSlug = getProductSlug(review);
              
              return (
                <div key={review.id} className={styles.reviewMobileCard}>
                  <div
                    className={styles.reviewMobileCardHeader}
                    onClick={() => toggleReviewExpansion(review.id)}
                  >
                    <div className={styles.reviewMobileCardMain}>
                      <div className={styles.reviewMobileCardSender}>
                        <FiUser />
                        <span>{getUserName(review)}</span>
                      </div>
                      {productSlug && (
                        <div className={styles.reviewMobileCardProduct}>
                          <FiPackage />
                          <span>{productSlug}</span>
                        </div>
                      )}
                      <div className={styles.reviewMobileCardStatus}>
                        <StatusBadge
                          status={review.isVerified ? "active" : "pending"}
                          label={review.isVerified ? t("Verified", "تأیید شده") : t("Pending", "در انتظار")}
                        />
                      </div>
                    </div>
                    <div className={styles.reviewMobileCardExpand}>
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className={styles.reviewMobileCardDetails}>
                      <div className={styles.reviewMobileCardDetailRow}>
                        <span className={styles.reviewMobileCardDetailLabel}>
                          {t("Product", "محصول")}:
                        </span>
                        <span className={styles.reviewMobileCardDetailValue}>
                          {getProductName(review)}
                        </span>
                      </div>
                      <div className={styles.reviewMobileCardDetailRow}>
                        <span className={styles.reviewMobileCardDetailLabel}>
                          {t("Reviewer", "نظر دهنده")}:
                        </span>
                        <span className={styles.reviewMobileCardDetailValue}>
                          {getUserName(review)}
                        </span>
                      </div>
                      {review.user?.email && (
                        <div className={styles.reviewMobileCardDetailRow}>
                          <span className={styles.reviewMobileCardDetailLabel}>
                            {t("Email", "ایمیل")}:
                          </span>
                          <span className={styles.reviewMobileCardDetailValue}>
                            {review.user.email}
                          </span>
                        </div>
                      )}
                      <div className={styles.reviewMobileCardDetailRow}>
                        <span className={styles.reviewMobileCardDetailLabel}>
                          {t("Date", "تاریخ")}:
                        </span>
                        <span className={styles.reviewMobileCardDetailValue}>
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className={styles.reviewMobileCardDetailRow}>
                        <span className={styles.reviewMobileCardDetailLabel}>
                          {t("Status", "وضعیت")}:
                        </span>
                        <span className={styles.reviewMobileCardDetailValue}>
                          <StatusBadge
                            status={review.isVerified ? "active" : "pending"}
                            label={review.isVerified ? t("Verified", "تأیید شده") : t("Pending", "در انتظار")}
                          />
                        </span>
                      </div>
                      <div className={styles.reviewMobileCardDetailRowFull}>
                        <span className={styles.reviewMobileCardDetailLabel}>
                          {t("Review Text", "متن نظر")}:
                        </span>
                        <p className={styles.reviewMobileCardText}>{review.reviewText}</p>
                      </div>
                      <div className={styles.reviewMobileCardActions}>
                        {!review.isVerified ? (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(review.id, true);
                            }}
                            disabled={isUpdating === review.id}
                          >
                            <FiCheck />
                            {t("Verify", "تأیید")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(review.id, false);
                            }}
                            disabled={isUpdating === review.id}
                          >
                            <FiX />
                            {t("Reject", "رد")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(review.id);
                          }}
                          disabled={isUpdating === review.id}
                        >
                          <FiTrash2 />
                          {t("Delete", "حذف")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop/Tablet Card View */}
          <div className={styles.reviewsList}>
            {reviews.map((review) => {
              const isExpanded = expandedReviews.has(review.id);
              const productSlug = getProductSlug(review);
              
              return (
                <div key={review.id} className={styles.reviewCard}>
                  <div
                    className={styles.reviewCardHeader}
                    onClick={() => toggleReviewExpansion(review.id)}
                  >
                    <div className={styles.reviewCardMain}>
                      <div className={styles.reviewCardSender}>
                        <FiUser />
                        <span>{getUserName(review)}</span>
                      </div>
                      {productSlug && (
                        <div className={styles.reviewCardProduct}>
                          <FiPackage />
                          <span>{productSlug}</span>
                        </div>
                      )}
                      <div className={styles.reviewCardStatus}>
                        <StatusBadge
                          status={review.isVerified ? "active" : "pending"}
                          label={review.isVerified ? t("Verified", "تأیید شده") : t("Pending", "در انتظار")}
                        />
                      </div>
                    </div>
                    <div className={styles.reviewCardExpand}>
                      {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                    </div>
                  </div>
                  {isExpanded && (
                    <div className={styles.reviewCardDetails}>
                      <div className={styles.reviewCardDetailRow}>
                        <span className={styles.reviewCardDetailLabel}>
                          {t("Product", "محصول")}:
                        </span>
                        <span className={styles.reviewCardDetailValue}>
                          {getProductName(review)}
                        </span>
                      </div>
                      <div className={styles.reviewCardDetailRow}>
                        <span className={styles.reviewCardDetailLabel}>
                          {t("Reviewer", "نظر دهنده")}:
                        </span>
                        <span className={styles.reviewCardDetailValue}>
                          {getUserName(review)}
                        </span>
                      </div>
                      {review.user?.email && (
                        <div className={styles.reviewCardDetailRow}>
                          <span className={styles.reviewCardDetailLabel}>
                            {t("Email", "ایمیل")}:
                          </span>
                          <span className={styles.reviewCardDetailValue}>
                            {review.user.email}
                          </span>
                        </div>
                      )}
                      <div className={styles.reviewCardDetailRow}>
                        <span className={styles.reviewCardDetailLabel}>
                          {t("Date", "تاریخ")}:
                        </span>
                        <span className={styles.reviewCardDetailValue}>
                          {formatDate(review.createdAt)}
                        </span>
                      </div>
                      <div className={styles.reviewCardDetailRow}>
                        <span className={styles.reviewCardDetailLabel}>
                          {t("Status", "وضعیت")}:
                        </span>
                        <span className={styles.reviewCardDetailValue}>
                          <StatusBadge
                            status={review.isVerified ? "active" : "pending"}
                            label={review.isVerified ? t("Verified", "تأیید شده") : t("Pending", "در انتظار")}
                          />
                        </span>
                      </div>
                      <div className={styles.reviewCardDetailRowFull}>
                        <span className={styles.reviewCardDetailLabel}>
                          {t("Review Text", "متن نظر")}:
                        </span>
                        <p className={styles.reviewCardText}>{review.reviewText}</p>
                      </div>
                      <div className={styles.reviewCardActions}>
                        {!review.isVerified ? (
                          <Button
                            variant="primary"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(review.id, true);
                            }}
                            disabled={isUpdating === review.id}
                          >
                            <FiCheck />
                            {t("Verify", "تأیید")}
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleVerify(review.id, false);
                            }}
                            disabled={isUpdating === review.id}
                          >
                            <FiX />
                            {t("Reject", "رد")}
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(review.id);
                          }}
                          disabled={isUpdating === review.id}
                        >
                          <FiTrash2 />
                          {t("Delete", "حذف")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </AdminCard>
  );
}

