"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiTag, FiCopy, FiCheck, FiClock, FiDollarSign, FiPercent, FiTruck, FiArrowLeft } from "react-icons/fi";
import toast from "react-hot-toast";
import SkeletonLoader from "../SkeletonLoader";
import EmptyState from "../EmptyState";
import styles from "@/styles/components/_dashboard.module.scss";

interface CouponsSectionProps {
  setActiveSection: (section: string) => void;
  isActive?: boolean;
}

interface DiscountCode {
  id: string;
  code: string;
  type: "global" | "personal";
  discountType: "percentage" | "fixed_amount" | "free_shipping";
  discountValue: string | null;
  minPurchaseAmount: string | null;
  maxDiscountAmount: string | null;
  usageLimit: number | null;
  usageCount: number;
  userLimit: number | null;
  userUsageCount: number; // User's personal usage count
  validFrom: string;
  validUntil: string;
  isActive?: boolean;
  isExpired?: boolean;
  description: string | null;
  descriptionFa: string | null;
}

export default function CouponsSection({ setActiveSection, isActive }: CouponsSectionProps) {
  const { t, language, currency } = useLanguage();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null);

  useEffect(() => {
    fetchCodes();
  }, []);

  // Refetch codes when section becomes active (e.g., after converting rewards)
  useEffect(() => {
    if (isActive) {
      fetchCodes();
    }
  }, [isActive]);

  const fetchCodes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/user/discount-codes");
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      } else {
        toast.error(t("Failed to load discount codes", "خطا در بارگذاری کدهای تخفیف"));
      }
    } catch (error) {
      console.error("Error fetching discount codes:", error);
      toast.error(t("Failed to load discount codes", "خطا در بارگذاری کدهای تخفیف"));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = async (code: string, codeId: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCodeId(codeId);
      toast.success(t("Code copied!", "کد کپی شد!"));
      setTimeout(() => setCopiedCodeId(null), 2000);
    } catch (error) {
      toast.error(t("Failed to copy code", "خطا در کپی کردن کد"));
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDiscountDisplay = (code: DiscountCode) => {
    if (code.discountType === "percentage") {
      return `${code.discountValue}%`;
    } else if (code.discountType === "fixed_amount") {
      return `${code.discountValue} ${t("Tomans", "تومان")}`;
    } else {
      return t("Free Shipping", "ارسال رایگان");
    }
  };

  const getDiscountIcon = (discountType: string) => {
    if (discountType === "percentage") {
      return <FiPercent />;
    } else if (discountType === "fixed_amount") {
      return <FiDollarSign />;
    } else {
      return <FiTruck />;
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
            <span>
              <FiTag />
            </span>
            <span>{t("Discount Codes", "کدهای تخفیف")}</span>
          </h3>
        </div>

        {isLoading ? (
          <SkeletonLoader type="list" count={3} />
        ) : codes.length === 0 ? (
          <EmptyState
            icon={<FiTag />}
            title={t("No Discount Codes", "کد تخفیفی وجود ندارد")}
            titleFa="کد تخفیفی وجود ندارد"
            description={t("Convert your reward points to discount codes in the Rewards section", "امتیازهای خود را در بخش پاداش‌ها به کد تخفیف تبدیل کنید")}
            descriptionFa="امتیازهای خود را در بخش پاداش‌ها به کد تخفیف تبدیل کنید"
            action={{
              label: t("Go to Rewards", "رفتن به پاداش‌ها"),
              labelFa: "رفتن به پاداش‌ها",
              onClick: () => setActiveSection("rewards")
            }}
          />
        ) : (
          <div className={styles.couponsList}>
            {codes.map((code) => {
              // Check if code is expired
              const now = new Date();
              const validUntil = new Date(code.validUntil);
              const isExpired = validUntil < now || code.isExpired || !code.isActive;
              
              return (
              <div 
                key={code.id} 
                className={`${styles.couponCard} ${isExpired ? styles.couponExpired : ""}`}
                style={isExpired ? { opacity: 0.6, position: "relative" } : {}}
              >
                {isExpired && (
                  <div style={{
                    position: "absolute",
                    top: "0.5rem",
                    right: "0.5rem",
                    background: "#e74c3c",
                    color: "white",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "4px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    zIndex: 1,
                    fontFamily: language === "fa" ? "'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit",
                  }}>
                    {t("Expired", "منقضی شده")}
                  </div>
                )}
                <div className={styles.couponHeader}>
                  <div className={styles.couponCodeRow}>
                    <div className={styles.couponCode}>
                      <span className={styles.couponCodeText} style={isExpired ? { textDecoration: "line-through", color: "#999" } : {}}>
                        {code.code}
                      </span>
                      {!isExpired && (
                        <button
                          className={styles.copyButton}
                          onClick={() => copyToClipboard(code.code, code.id)}
                          title={t("Copy code", "کپی کد")}
                        >
                          {copiedCodeId === code.id ? (
                            <FiCheck style={{ color: "#4caf50" }} />
                          ) : (
                            <FiCopy />
                          )}
                        </button>
                      )}
                    </div>
                    <span
                      className={styles.couponTypeBadge}
                      style={{
                        backgroundColor:
                          code.type === "global" ? "#e3f2fd" : "#fff3e0",
                        color: code.type === "global" ? "#1976d2" : "#e65100",
                      }}
                    >
                      {code.type === "global"
                        ? t("Global", "عمومی")
                        : t("Personal", "شخصی")}
                    </span>
                  </div>
                </div>

                <div className={styles.couponBody}>
                  <div className={styles.couponDiscount}>
                    <span className={styles.couponDiscountIcon}>
                      {getDiscountIcon(code.discountType)}
                    </span>
                    <span className={styles.couponDiscountValue}>
                      {getDiscountDisplay(code)}
                    </span>
                  </div>

                  {(code.description || code.descriptionFa) && (
                    <div className={styles.couponDescription}>
                      {language === "fa" && code.descriptionFa
                        ? code.descriptionFa
                        : code.description || code.descriptionFa}
                    </div>
                  )}

                  <div className={styles.couponDetails}>
                    {code.minPurchaseAmount && (
                      <div className={styles.couponDetail}>
                        <span className={styles.couponDetailLabel}>
                          {t("Min Purchase", "حداقل خرید")}:
                        </span>
                        <span className={styles.couponDetailValue}>
                          {code.minPurchaseAmount} {t("Tomans", "تومان")}
                        </span>
                      </div>
                    )}

                    <div className={styles.couponDetail}>
                      <FiClock style={{ marginRight: "0.25rem" }} />
                      <span className={styles.couponDetailLabel}>
                        {isExpired 
                          ? t("Expired On", "منقضی شده در")
                          : t("Valid Until", "معتبر تا")}:
                      </span>
                      <span className={styles.couponDetailValue} style={isExpired ? { color: "#e74c3c" } : {}}>
                        {formatDate(code.validUntil)}
                      </span>
                    </div>

                    {code.userLimit && (
                      <div className={styles.couponDetail}>
                        <span className={styles.couponDetailLabel}>
                          {t("Your Usage", "استفاده شما")}:
                        </span>
                        <span className={styles.couponDetailValue}>
                          {code.userUsageCount} / {code.userLimit}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

