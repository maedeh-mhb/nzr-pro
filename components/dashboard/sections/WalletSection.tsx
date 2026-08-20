"use client";

import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import { FiBarChart2, FiArrowLeft } from "react-icons/fi";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_dashboard.module.scss";

interface WalletSectionProps {
  setActiveSection: (section: string) => void;
}

export default function WalletSection({ setActiveSection }: WalletSectionProps) {
  const { t, language, currency } = useLanguage();
  const displayCurrency = currency || "toman";

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
        <div className={styles.walletBalance}>
          <div className={styles.balanceLabel}>
            {t("Available Balance", "موجودی قابل دسترس")}
          </div>
          <div className={styles.balanceAmount}>{formatPrice(150000, language, displayCurrency)}</div>
          <div className={styles.walletActions}>
            <Button
              variant="primary"
              onClick={() => toast.success(t("Add Funds", "افزودن وجه"))}
            >
              {t("Add Funds", "افزودن وجه")}
            </Button>
            <Button
              variant="outline"
              onClick={() => toast.success(t("Withdraw", "برداشت"))}
            >
              {t("Withdraw", "برداشت")}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiBarChart2 /></span>
            <span>{t("Transaction History", "تاریخچه تراکنش")}</span>
          </h3>
        </div>
        <div className={styles.orderItem}>
          <div className={styles.orderHeader}>
            <span className={styles.orderProduct}>
              {t("Funds Added", "وجه اضافه شد")}
            </span>
            <span className={styles.transactionPositive}>
              +{formatPrice(100000, language, displayCurrency)}
            </span>
          </div>
          <div className={styles.orderDate}>December 15, 2025</div>
        </div>
        <div className={styles.orderItem}>
          <div className={styles.orderHeader}>
            <span className={styles.orderProduct}>
              {t("Purchase - Order #1235", "خرید - سفارش #1235")}
            </span>
            <span className={styles.transactionNegative}>
              -{formatPrice(199990, language, displayCurrency)}
            </span>
          </div>
          <div className={styles.orderDate}>December 15, 2025</div>
        </div>
        <div className={styles.orderItem}>
          <div className={styles.orderHeader}>
            <span className={styles.orderProduct}>
              {t("Refund - Order #1230", "بازپرداخت - سفارش #1230")}
            </span>
            <span className={styles.transactionPositive}>
              +{formatPrice(89990, language, displayCurrency)}
            </span>
          </div>
          <div className={styles.orderDate}>December 12, 2025</div>
        </div>
      </div>
    </>
  );
}
