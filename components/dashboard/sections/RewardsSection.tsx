"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiGift, FiArrowLeft, FiCheck, FiRefreshCw } from "react-icons/fi";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_dashboard.module.scss";

interface RewardsSectionProps {
  setActiveSection: (section: string) => void;
}

interface RewardThreshold {
  value: number;
  discount: number;
}

export default function RewardsSection({ setActiveSection }: RewardsSectionProps) {
  const { t, language } = useLanguage();
  const [totalPoints, setTotalPoints] = useState<number>(0);
  const [thresholds, setThresholds] = useState<RewardThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConverting, setIsConverting] = useState<number | null>(null); // Track which threshold is being converted

  useEffect(() => {
    fetchRewardData();
  }, []);

  // Refetch data when component becomes visible (user navigates to rewards section)
  // This ensures threshold updates from admin panel are reflected
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRewardData();
    }, 30000); // Refetch every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const fetchRewardData = async () => {
    try {
      setIsLoading(true);

      // Fetch total points from dashboard stats
      const statsResponse = await fetch("/api/dashboard/stats");
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setTotalPoints(statsData.stats?.points || 0);
      }

      // Fetch thresholds from API (with cache-busting to ensure fresh data)
      const thresholdsResponse = await fetch(`/api/admin/reward-thresholds?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      if (thresholdsResponse.ok) {
        const thresholdsData = await thresholdsResponse.json();
        if (thresholdsData.thresholds && Array.isArray(thresholdsData.thresholds)) {
          setThresholds(thresholdsData.thresholds.map((t: any) => ({
            value: parseInt(t.value, 10),
            discount: parseInt(t.discount, 10),
          })));
        } else {
          setThresholds([]);
        }
      } else {
        console.error("Failed to fetch thresholds:", thresholdsResponse.status, thresholdsResponse.statusText);
        setThresholds([]);
      }
    } catch (error) {
      console.error("Error fetching reward data:", error);
      setThresholds([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertPoints = async (thresholdIndex: number) => {
    const threshold = thresholds[thresholdIndex];
    if (!threshold) return;

    if (totalPoints < threshold.value) {
      toast.error(
        language === "fa"
          ? `شما به حداقل ${threshold.value} امتیاز نیاز دارید`
          : `You need at least ${threshold.value} points`
      );
      return;
    }

    setIsConverting(thresholdIndex);
    try {
      const response = await fetch("/api/user/rewards/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pointsToConvert: threshold.value,
          thresholdIndex: thresholdIndex,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Show success message WITHOUT the code (as per requirements)
        toast.success(
          language === "fa"
            ? `کد تخفیف ${threshold.discount}% شما با موفقیت ایجاد شد!`
            : `Your ${threshold.discount}% discount code has been created successfully!`
        );

        // Refresh points
        await fetchRewardData();

        // Small delay before navigating to ensure toast is visible
        setTimeout(() => {
          // Navigate to coupons section to see the new code
          setActiveSection("coupons");
        }, 500);
      } else {
        toast.error(data.error || (language === "fa" ? "خطا در تبدیل امتیاز" : "Error converting points"));
      }
    } catch (error) {
      console.error("Error converting points:", error);
      toast.error(language === "fa" ? "خطا در تبدیل امتیاز" : "Error converting points");
    } finally {
      setIsConverting(null);
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
              <FiGift />
            </span>
            <span>{t("Reward Points", "امتیازهای پاداش")}</span>
          </h3>
          <button
            onClick={fetchRewardData}
            disabled={isLoading}
            className={styles.refreshButton}
            style={{
              padding: "0.5rem 1rem",
              background: "transparent",
              border: "1px solid #ddd",
              borderRadius: "8px",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              color: "#666",
              opacity: isLoading ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              transition: "all 0.2s",
              fontFamily: language === "fa" ? "'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit",
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = "#f5f5f5";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
            title={t("Refresh", "به‌روزرسانی")}
          >
            <FiRefreshCw style={{ width: "1rem", height: "1rem" }} />
            <span>{t("Refresh", "به‌روزرسانی")}</span>
          </button>
        </div>

        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center", color: "#666" }}>
            {t("Loading...", "در حال بارگذاری...")}
          </div>
        ) : (
          <div className={styles.rewardsContent}>
            <div className={styles.rewardsSummary}>
              <div className={styles.rewardsPointsDisplay}>
                <div className={styles.rewardsPointsValue}>{totalPoints}</div>
                <div className={styles.rewardsPointsLabel}>
                  {t("Total Points", "امتیاز کل")}
                </div>
              </div>
            </div>

            <div className={styles.rewardsConversion}>
              <h4 className={styles.rewardsConversionTitle}>
                {t("Convert Points to Discount Code", "تبدیل امتیاز به کد تخفیف")}
              </h4>

              {thresholds.length === 0 ? (
                <p className={styles.rewardsConversionDescription} style={{ color: "#666", textAlign: "center", padding: "2rem" }}>
                  {language === "fa"
                    ? "هیچ آستانه پاداشی تنظیم نشده است."
                    : "No reward thresholds configured."}
                </p>
              ) : (
                <div style={{ marginTop: "1rem" }}>
                  <table className={styles.rewardsThresholdsTable}>
                    <thead>
                      <tr>
                        <th className={styles.tableHeaderCell}>
                          {t("Points Required", "امتیاز مورد نیاز")}
                        </th>
                        <th className={styles.tableHeaderCell}>
                          {t("Discount", "تخفیف")}
                        </th>
                        <th className={`${styles.tableHeaderCell} ${styles.tableHeaderCellAction}`}>
                          {t("Action", "عملیات")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {thresholds.map((threshold, index) => {
                        const canConvert = totalPoints >= threshold.value;
                        const isConvertingThis = isConverting === index;

                        return (
                          <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell}>
                              {threshold.value} {t("points", "امتیاز")}
                            </td>
                            <td className={`${styles.tableCell} ${styles.tableCellDiscount}`}>
                              {threshold.discount}%
                            </td>
                            <td className={`${styles.tableCell} ${styles.tableCellAction}`}>
                              {canConvert ? (
                                <Button
                                  variant="primary"
                                  size="small"
                                  onClick={() => handleConvertPoints(index)}
                                  disabled={isConvertingThis}
                                >
                                  {isConvertingThis
                                    ? t("Generating...", "در حال ایجاد...")
                                    : t("Generate Code", "ایجاد کد")}
                                </Button>
                              ) : (
                                <span className={styles.tableCellInactive}>
                                  {language === "fa"
                                    ? `${threshold.value - totalPoints} امتیاز دیگر`
                                    : `${threshold.value - totalPoints} more points`}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={styles.rewardsInfo}>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "1rem" }}>
                {language === "fa"
                  ? "امتیازهای پاداش شما با هر خرید تأیید شده به حساب شما اضافه می‌شود."
                  : "Your reward points are added to your account with each verified purchase."}
              </p>
              <p style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>
                {language === "fa"
                  ? "کد تخفیف شما تا 24 ساعت معتبر است"
                  : "Your Code is Valid for 24 hours"}
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

