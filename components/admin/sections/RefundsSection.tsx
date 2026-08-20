"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiDollarSign, FiCheckCircle, FiXCircle, FiClock, FiChevronDown, FiChevronUp, FiFilter, FiPlus, FiX } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import DataTable from "../DataTable";
import StatusBadge from "../StatusBadge";
import Button from "@/components/ui/Button";
import Modal from "../Modal";
import Select, { SelectOption } from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface Refund {
  id: string;
  orderId: string;
  orderNumber: string;
  amount: string;
  reason: string;
  status: string;
  createdBy: string;
  createdByName: string;
  processedBy: string | null;
  processedByName: string | null;
  processedAt: Date | string | null;
  notes: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function RefundsSection() {
  const { t, language, currency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundNotes, setRefundNotes] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedRefundId, setSelectedRefundId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Build query string from filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    return params.toString();
  }, [statusFilter]);

  // Load refunds from API
  useEffect(() => {
    const loadRefunds = async () => {
      setIsLoading(true);
      try {
        const url = `/api/admin/refunds${queryParams ? `?${queryParams}` : ""}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setRefunds(data.refunds || []);
        } else {
          toast.error(t("Failed to load refunds", "خطا در بارگذاری بازپرداخت‌ها"));
        }
      } catch (error) {
        console.error("Error loading refunds:", error);
        toast.error(t("An error occurred", "خطایی رخ داد"));
      } finally {
        setIsLoading(false);
      }
    };

    loadRefunds();
  }, [queryParams, t]);

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

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { type: "active" | "pending" | "inactive"; label: string }> = {
      pending: { type: "pending", label: t("Pending", "در انتظار") },
      processed: { type: "active", label: t("Processed", "پردازش شده") },
      rejected: { type: "inactive", label: t("Rejected", "رد شده") },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <StatusBadge status={statusInfo.type} label={statusInfo.label} />;
  };

  const handleCreateRefund = async () => {
    if (!selectedOrderId || !refundAmount || !refundReason.trim()) {
      toast.error(t("Please fill in all required fields", "لطفاً تمام فیلدهای الزامی را پر کنید"));
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/admin/refunds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          amount: refundAmount,
          reason: refundReason.trim(),
          notes: refundNotes.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success(t("Refund created successfully", "بازپرداخت با موفقیت ایجاد شد"));
        setShowCreateModal(false);
        setSelectedOrderId("");
        setRefundAmount("");
        setRefundReason("");
        setRefundNotes("");
        // Reload refunds
        const loadRefunds = async () => {
          const url = `/api/admin/refunds${queryParams ? `?${queryParams}` : ""}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            setRefunds(data.refunds || []);
          }
        };
        loadRefunds();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to create refund", "خطا در ایجاد بازپرداخت"));
      }
    } catch (error) {
      console.error("Error creating refund:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsCreating(false);
    }
  };

  const handleProcessRefund = async (refundId: string, status: "processed" | "rejected") => {
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/admin/refunds/${refundId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        toast.success(
          status === "processed"
            ? t("Refund processed successfully", "بازپرداخت با موفقیت پردازش شد")
            : t("Refund rejected", "بازپرداخت رد شد")
        );
        // Reload refunds
        const loadRefunds = async () => {
          const url = `/api/admin/refunds${queryParams ? `?${queryParams}` : ""}`;
          const response = await fetch(url);
          if (response.ok) {
            const data = await response.json();
            setRefunds(data.refunds || []);
          }
        };
        loadRefunds();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to process refund", "خطا در پردازش بازپرداخت"));
      }
    } catch (error) {
      console.error("Error processing refund:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsProcessing(false);
    }
  };

  const statusOptions: SelectOption[] = [
    { value: "", label: t("All Statuses", "همه وضعیت‌ها") },
    { value: "pending", label: t("Pending", "در انتظار") },
    { value: "processed", label: t("Processed", "پردازش شده") },
    { value: "rejected", label: t("Rejected", "رد شده") },
  ];

  const hasActiveFilters = statusFilter || searchQuery;

  // Filter refunds
  let filteredRefunds = refunds;
  if (searchQuery) {
    const searchLower = searchQuery.toLowerCase();
    filteredRefunds = refunds.filter(
      (refund) =>
        refund.orderNumber.toLowerCase().includes(searchLower) ||
        refund.reason.toLowerCase().includes(searchLower) ||
        refund.createdByName.toLowerCase().includes(searchLower)
    );
  }

  const columns = [
    {
      key: "orderNumber",
      label: t("Order Number", "شماره سفارش"),
    },
    {
      key: "amount",
      label: t("Amount", "مبلغ"),
      render: (value: string) => formatPrice(parseFloat(value), language, currency || "toman"),
    },
    {
      key: "reason",
      label: t("Reason", "دلیل"),
      render: (value: string) => (
        <div style={{ maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </div>
      ),
    },
    {
      key: "status",
      label: t("Status", "وضعیت"),
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: "createdByName",
      label: t("Created By", "ایجاد شده توسط"),
    },
    {
      key: "createdAt",
      label: t("Created At", "تاریخ ایجاد"),
      render: (value: Date | string) => formatDate(value),
    },
    {
      key: "actions",
      label: t("Actions", "اقدامات"),
      render: (_: any, row: Refund) => (
        <div className={tableStyles.tableActions}>
          {row.status === "pending" && (
            <>
              <Button
                variant="primary"
                size="small"
                onClick={() => handleProcessRefund(row.id, "processed")}
                disabled={isProcessing}
              >
                {t("Process", "پردازش")}
              </Button>
              <Button
                variant="outline"
                size="small"
                onClick={() => handleProcessRefund(row.id, "rejected")}
                disabled={isProcessing}
                style={{ color: "#e74c3c", borderColor: "#e74c3c" }}
              >
                {t("Reject", "رد")}
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiDollarSign />
            <span>{t("Refunds Management", "مدیریت بازپرداخت‌ها")}</span>
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <Button
              variant="primary"
              size="small"
              onClick={() => setShowCreateModal(true)}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FiPlus />
              {t("Create Refund", "ایجاد بازپرداخت")}
            </Button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                background: showFilters ? "#007bff" : "white",
                color: showFilters ? "white" : "#333",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginLeft: "auto",
              }}
            >
              <FiFilter />
              {t("Filters", "فیلترها")}
              {hasActiveFilters && (
                <span
                  style={{
                    background: showFilters ? "rgba(255,255,255,0.3)" : "#007bff",
                    color: "#fff",
                    borderRadius: "50%",
                    width: "20px",
                    height: "20px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.75rem",
                    marginLeft: "0.25rem",
                  }}
                >
                  {[statusFilter, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>
          </div>

          <SearchBar
            placeholder={t("Search by order number, reason, creator...", "جستجو بر اساس شماره سفارش، دلیل، ایجادکننده...")}
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {showFilters && (
            <div
              style={{
                padding: "1rem",
                background: "#f8f9fa",
                borderRadius: "0.5rem",
                border: "1px solid #e9ecef",
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                  {t("Filters", "فیلترها")}
                </h4>
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setStatusFilter("");
                      setSearchQuery("");
                    }}
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "none",
                      background: "transparent",
                      color: "#007bff",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <FiX />
                    {t("Clear All", "پاک کردن همه")}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <Select
                    label={t("Status", "وضعیت")}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder={t("All Statuses", "همه وضعیت‌ها")}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {isLoading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            {t("Loading...", "در حال بارگذاری...")}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className={styles.ordersMobileCards}>
              {filteredRefunds.length === 0 ? (
                <div className={styles.ordersMobileEmpty}>
                  {t("No refunds found", "هیچ بازپرداختی یافت نشد")}
                </div>
              ) : (
                filteredRefunds.map((refund) => (
                  <div key={refund.id} className={styles.orderMobileCard}>
                    <div className={styles.orderMobileCardHeader}>
                      <div className={styles.orderMobileCardMain}>
                        <div className={styles.orderMobileCardCustomer}>
                          <span>{t("Order", "سفارش")}: {refund.orderNumber}</span>
                        </div>
                        <div className={styles.orderMobileCardPayment}>
                          <span className={styles.orderMobileCardPaymentLabel}>
                            {t("Amount", "مبلغ")}:
                          </span>
                          <span className={styles.orderMobileCardPaymentValue}>
                            {formatPrice(parseFloat(refund.amount), language, currency || "toman")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={styles.orderMobileCardDetails}>
                      <div className={styles.orderMobileCardDetailRow}>
                        <span className={styles.orderMobileCardDetailLabel}>
                          {t("Reason", "دلیل")}:
                        </span>
                        <span className={styles.orderMobileCardDetailValue}>{refund.reason}</span>
                      </div>
                      <div className={styles.orderMobileCardDetailRow}>
                        <span className={styles.orderMobileCardDetailLabel}>
                          {t("Status", "وضعیت")}:
                        </span>
                        <span className={styles.orderMobileCardDetailValue}>
                          {getStatusBadge(refund.status)}
                        </span>
                      </div>
                      <div className={styles.orderMobileCardDetailRow}>
                        <span className={styles.orderMobileCardDetailLabel}>
                          {t("Created By", "ایجاد شده توسط")}:
                        </span>
                        <span className={styles.orderMobileCardDetailValue}>
                          {refund.createdByName}
                        </span>
                      </div>
                      <div className={styles.orderMobileCardDetailRow}>
                        <span className={styles.orderMobileCardDetailLabel}>
                          {t("Created At", "تاریخ ایجاد")}:
                        </span>
                        <span className={styles.orderMobileCardDetailValue}>
                          {formatDate(refund.createdAt)}
                        </span>
                      </div>
                      {refund.status === "pending" && (
                        <div className={styles.orderMobileCardActions}>
                          <Button
                            variant="primary"
                            size="small"
                            onClick={() => handleProcessRefund(refund.id, "processed")}
                            disabled={isProcessing}
                            style={{ marginRight: "0.5rem" }}
                          >
                            {t("Process", "پردازش")}
                          </Button>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => handleProcessRefund(refund.id, "rejected")}
                            disabled={isProcessing}
                            style={{ color: "#e74c3c", borderColor: "#e74c3c" }}
                          >
                            {t("Reject", "رد")}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className={styles.ordersDesktopTable}>
              <DataTable columns={columns} data={filteredRefunds} />
            </div>
          </>
        )}
      </AdminCard>

      {/* Create Refund Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setSelectedOrderId("");
          setRefundAmount("");
          setRefundReason("");
          setRefundNotes("");
        }}
        title={t("Create Refund", "ایجاد بازپرداخت")}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <Input
            label={t("Order ID", "شناسه سفارش")}
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            placeholder={t("Enter order ID", "شناسه سفارش را وارد کنید")}
          />
          <Input
            label={t("Refund Amount", "مبلغ بازپرداخت")}
            type="number"
            step="0.01"
            min="0"
            value={refundAmount}
            onChange={(e) => setRefundAmount(e.target.value)}
            placeholder={t("Enter refund amount", "مبلغ بازپرداخت را وارد کنید")}
          />
          <Textarea
            label={t("Reason", "دلیل")}
            value={refundReason}
            onChange={(e) => setRefundReason(e.target.value)}
            placeholder={t("Enter reason for refund", "دلیل بازپرداخت را وارد کنید")}
            rows={4}
          />
          <Textarea
            label={t("Notes", "یادداشت")}
            value={refundNotes}
            onChange={(e) => setRefundNotes(e.target.value)}
            placeholder={t("Additional notes (optional)", "یادداشت‌های اضافی (اختیاری)")}
            rows={3}
          />
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <Button
              variant="outline"
              size="small"
              onClick={() => {
                setShowCreateModal(false);
                setSelectedOrderId("");
                setRefundAmount("");
                setRefundReason("");
                setRefundNotes("");
              }}
              disabled={isCreating}
            >
              {t("Cancel", "انصراف")}
            </Button>
            <Button
              variant="primary"
              size="small"
              onClick={handleCreateRefund}
              disabled={isCreating}
            >
              {isCreating ? t("Creating...", "در حال ایجاد...") : t("Create", "ایجاد")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

