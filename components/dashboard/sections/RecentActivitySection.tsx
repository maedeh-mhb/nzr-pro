"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiPackage } from "react-icons/fi";
import styles from "@/styles/components/_dashboard.module.scss";

interface Activity {
  id: string;
  activityType: string;
  activityData: Record<string, any>;
  createdAt: Date | string;
}

interface RecentActivitySectionProps {
  setActiveSection?: (section: string) => void;
}

export default function RecentActivitySection({ setActiveSection }: RecentActivitySectionProps) {
  const { t, language } = useLanguage();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async (loadMore = false) => {
    try {
      setLoading(true);
      const currentPage = loadMore ? page + 1 : 1;
      const response = await fetch(`/api/user/activities?limit=3&page=${currentPage}`);
      if (response.ok) {
        const data = await response.json();
        const newActivities = data.data || [];

        if (loadMore) {
          setActivities((prev) => [...prev, ...newActivities]);
        } else {
          setActivities(newActivities);
        }

        setPage(currentPage);
        setHasMore(data.pagination?.hasNext || false);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    fetchActivities(true);
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  };

  const getActivityText = (activity: Activity) => {
    const date = formatDate(activity.createdAt);

    switch (activity.activityType) {
      case "phone_verified":
        return language === "fa"
          ? `شما شماره تلفن خود را در ${date} تأیید کردید`
          : `You verified your phone number on ${date}`;

      case "order_placed":
        const orderNumber = activity.activityData.orderNumber || "";
        return language === "fa"
          ? `شما سفارش #${orderNumber} را در ${date} ثبت کردید`
          : `You placed order #${orderNumber} on ${date}`;

      case "address_added":
        return language === "fa"
          ? `شما یک آدرس جدید در ${date} اضافه کردید`
          : `You added a new address on ${date}`;

      case "address_updated":
        return language === "fa"
          ? `شما یک آدرس را در ${date} به‌روزرسانی کردید`
          : `You updated an address on ${date}`;

      case "profile_updated":
        return language === "fa"
          ? `شما پروفایل خود را در ${date} به‌روزرسانی کردید`
          : `You updated your profile on ${date}`;

      case "email_verified":
        return language === "fa"
          ? `شما ایمیل خود را در ${date} تأیید کردید`
          : `You verified your email on ${date}`;

      case "discount_code_received":
        const discountPercentage = activity.activityData.discountPercentage || 0;
        const pointsUsed = activity.activityData.pointsUsed || 0;
        return language === "fa"
          ? `شما یک کد تخفیف ${discountPercentage}% با استفاده از ${pointsUsed} امتیاز در ${date} ایجاد کردید`
          : `You generated a ${discountPercentage}% discount code using ${pointsUsed} points on ${date}`;

      case "payment_verified":
        const verifiedOrderNumber = activity.activityData.orderNumber || "";
        return language === "fa"
          ? `پرداخت سفارش #${verifiedOrderNumber} در ${date} تأیید شد`
          : `Payment for order #${verifiedOrderNumber} was verified on ${date}`;

      case "payment_settings_changed":
        const enabledMethods = activity.activityData.enabledMethods || [];
        const enabledMethodsFa = activity.activityData.enabledMethodsFa || [];
        const methodsText = language === "fa"
          ? (enabledMethodsFa.length > 0 ? enabledMethodsFa.join("، ") : "هیچکدام")
          : (enabledMethods.length > 0 ? enabledMethods.join(", ") : "none");
        return language === "fa"
          ? `مدیر تنظیمات پرداخت شما را در ${date} تغییر داد. شما می‌توانید با ${methodsText} پرداخت کنید.`
          : `Admin has changed your payment settings on ${date}. You can pay by ${methodsText}.`;

      case "reward_earned":
        const rewardPoints = activity.activityData.points || 0;
        if (activity.activityData.source === "admin_grant") {
          const rewardReason = activity.activityData.reason;
          return language === "fa"
            ? `مدیر ${rewardPoints} امتیاز پاداش به حساب شما اضافه کرد${rewardReason ? ` (${rewardReason})` : ""} در ${date}`
            : `An administrator added ${rewardPoints} reward points to your account${rewardReason ? ` (${rewardReason})` : ""} on ${date}`;
        }
        const rewardProductName = activity.activityData.productName || "";
        const rewardQuantity = activity.activityData.quantity || 0;
        const rewardOrderNumber = activity.activityData.orderNumber || "";
        return language === "fa"
          ? `شما ${rewardPoints} امتیاز پاداش برای خرید ${rewardQuantity} عدد ${rewardProductName} از سفارش #${rewardOrderNumber} در ${date} دریافت کردید`
          : `You earned ${rewardPoints} reward points for purchasing ${rewardQuantity} ${rewardProductName} from order #${rewardOrderNumber} on ${date}`;

      default:
        // Show activity type for unknown activities with a readable format
        const readableType = activity.activityType
          .split('_')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');

        // Basic translations for common activity types in Farsi
        const activityTranslations: Record<string, string> = {
          'user_login': 'ورود کاربر',
          'user_logout': 'خروج کاربر',
          'account_created': 'ایجاد حساب کاربری',
          'password_changed': 'تغییر رمز عبور',
          'password_reset': 'بازنشانی رمز عبور',
          'wishlist_added': 'افزودن به علاقه‌مندی‌ها',
          'wishlist_removed': 'حذف از علاقه‌مندی‌ها',
          'cart_updated': 'به‌روزرسانی سبد خرید',
          'review_submitted': 'ثبت نظر',
          'message_sent': 'ارسال پیام',
          'notification_received': 'دریافت اعلان',
          'coupon_applied': 'اعمال کوپن',
          'settings_updated': 'به‌روزرسانی تنظیمات',
        };

        const faType = activityTranslations[activity.activityType] || readableType;

        return language === "fa"
          ? `${faType} در ${date}`
          : `${readableType} on ${date}`;
    }
  };

  return (
    <div className={styles.dashboardCard}>
      <div className={styles.cardHeader}>
        <h3 className={styles.cardTitle}>
          <span><FiPackage /></span>
          <span>{t("Recent Activities", "فعالیت‌های اخیر")}</span>
        </h3>
      </div>
      <div className={styles.recentActivities}>
        {loading && activities.length === 0 ? (
          <div className={styles.loadingText}>
            {t("Loading...", "در حال بارگذاری...")}
          </div>
        ) : activities.length === 0 ? (
          <div className={styles.emptyState}>
            {t("No recent activities", "هیچ فعالیت اخیری وجود ندارد")}
          </div>
        ) : (
          <>
            <div className={styles.activitiesList}>
              {activities.map((activity) => (
                <div key={activity.id} className={styles.activityItem}>
                  {getActivityText(activity)}
                </div>
              ))}
            </div>
            {hasMore && (
              <button
                className={styles.loadMoreButton}
                onClick={handleLoadMore}
                disabled={loading}
              >
                {loading
                  ? t("Loading...", "در حال بارگذاری...")
                  : t("Load More", "بارگذاری بیشتر")}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
