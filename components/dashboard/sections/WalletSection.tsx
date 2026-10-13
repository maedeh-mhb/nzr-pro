"use client";

import { useEffect, useState } from "react";
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
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<Array<{
    id: string;
    type: string;
    amount: string;
    description: string | null;
    createdAt: string;
  }>>([]);

  useEffect(() => {
    fetch("/api/user/wallet")
      .then(async (response) => {
        if (!response.ok) throw new Error("Failed to fetch wallet");
        return response.json();
      })
      .then((data) => {
        setBalance(Number(data.balance || 0));
        setTransactions(data.transactions || []);
      })
      .catch((error) => console.error("Error fetching wallet:", error));
  }, []);

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
          <div className={styles.balanceAmount}>{formatPrice(balance, language, displayCurrency)}</div>
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
        {transactions.map((transaction) => (
          <div className={styles.orderItem} key={transaction.id}>
            <div className={styles.orderHeader}>
              <span className={styles.orderProduct}>
                {transaction.description || t("Wallet transaction", "تراکنش کیف پول")}
              </span>
              <span className={transaction.type === "credit" ? styles.transactionPositive : styles.transactionNegative}>
                {transaction.type === "credit" ? "+" : "-"}
                {formatPrice(Number(transaction.amount), language, displayCurrency)}
              </span>
            </div>
            <div className={styles.orderDate}>
              {new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US").format(new Date(transaction.createdAt))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
