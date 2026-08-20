"use client";

import { useState, useEffect, useMemo } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useSession } from "next-auth/react";
import {
  FiActivity,
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiEye,
  FiRotateCcw,
} from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import DataTable from "../DataTable";
import Modal from "../Modal";
import TableSkeleton from "@/components/ui/TableSkeleton";
import ErrorState from "@/components/ui/ErrorState";
import EmptyState from "@/components/ui/EmptyState";
import { showSuccess, showError } from "@/lib/utils/toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface AuditEntry {
  id: string;
  adminId: string;
  action: string;
  entityType: string;
  entityId?: string;
  description: string;
  descriptionFa?: string;
  beforeState?: any;
  afterState?: any;
  metadata?: any;
  canRollback: boolean;
  rolledBack: boolean;
  rolledBackAt?: Date;
  rolledBackBy?: string;
  createdAt: Date;
}

export default function AuditTrailSection() {
  const { t, language } = useLanguage();
  const { data: session } = useSession();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [selectedEntityType, setSelectedEntityType] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AuditEntry | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRollbackModalOpen, setIsRollbackModalOpen] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);

  const fetchEntries = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedAction) params.append("action", selectedAction);
      if (selectedEntityType) params.append("entityType", selectedEntityType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("limit", "50");

      const response = await fetch(`/api/admin/audit-trail?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch audit trail");
      }

      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err: any) {
      setError(err.message || t("Failed to load audit trail", "خطا در بارگذاری سوابق"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [searchQuery, selectedAction, selectedEntityType, startDate, endDate]);

  const handleRollback = async () => {
    if (!selectedEntry) return;

    setIsRollingBack(true);
    try {
      const response = await fetch("/api/admin/audit-trail/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: selectedEntry.id }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rollback");
      }

      showSuccess(
        t("Action rolled back successfully", "عملیات با موفقیت بازگردانده شد")
      );
      setIsRollbackModalOpen(false);
      setSelectedEntry(null);
      fetchEntries();
    } catch (err: any) {
      showError(err.message || t("Failed to rollback", "خطا در بازگردانی"));
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedAction) params.append("action", selectedAction);
      if (selectedEntityType) params.append("entityType", selectedEntityType);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      params.append("format", "csv");

      const response = await fetch(`/api/admin/audit-trail/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to export");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-trail-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess(t("Export successful", "خروجی با موفقیت انجام شد"));
    } catch (err: any) {
      showError(err.message || t("Failed to export", "خطا در خروجی"));
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "action",
        label: t("Action", "عملیات"),
        render: (value: string) => (
          <span style={{ fontWeight: 500 }}>{value}</span>
        ),
      },
      {
        key: "entityType",
        label: t("Entity Type", "نوع موجودیت"),
      },
      {
        key: "entityId",
        label: t("Entity ID", "شناسه موجودیت"),
        render: (value: string) => value || "-",
      },
      {
        key: "description",
        label: t("Description", "توضیحات"),
        render: (value: string, row: AuditEntry) => (
          <span>
            {language === "fa" && row.descriptionFa
              ? row.descriptionFa
              : value}
          </span>
        ),
      },
      {
        key: "createdAt",
        label: t("Date", "تاریخ"),
        render: (value: Date) => new Date(value).toLocaleString(),
      },
      {
        key: "actions",
        label: t("Actions", "اقدامات"),
        render: (_: any, row: AuditEntry) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="primary"
              size="small"
              onClick={() => {
                setSelectedEntry(row);
                setIsDetailModalOpen(true);
              }}
            >
              <FiEye />
            </Button>
            {row.canRollback && !row.rolledBack && (
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  setSelectedEntry(row);
                  setIsRollbackModalOpen(true);
                }}
              >
                <FiRotateCcw />
              </Button>
            )}
          </div>
        ),
      },
    ],
    [t, language]
  );

  const actionOptions = [
    { value: "", label: t("All Actions", "همه عملیات") },
    { value: "product_created", label: t("Product Created", "محصول ایجاد شد") },
    { value: "product_updated", label: t("Product Updated", "محصول به‌روزرسانی شد") },
    { value: "product_deleted", label: t("Product Deleted", "محصول حذف شد") },
    { value: "order_created", label: t("Order Created", "سفارش ایجاد شد") },
    { value: "order_status_changed", label: t("Order Status Changed", "وضعیت سفارش تغییر کرد") },
    { value: "user_created", label: t("User Created", "کاربر ایجاد شد") },
    { value: "user_updated", label: t("User Updated", "کاربر به‌روزرسانی شد") },
    { value: "settings_updated", label: t("Settings Updated", "تنظیمات به‌روزرسانی شد") },
  ];

  const entityTypeOptions = [
    { value: "", label: t("All Types", "همه انواع") },
    { value: "product", label: t("Product", "محصول") },
    { value: "order", label: t("Order", "سفارش") },
    { value: "user", label: t("User", "کاربر") },
    { value: "settings", label: t("Settings", "تنظیمات") },
  ];

  return (
    <AdminCard>
      <div className={cardStyles.cardHeader}>
        <h3 className={cardStyles.cardTitle}>
          <FiActivity />
          <span>{t("Audit Trail", "سوابق حسابرسی")}</span>
        </h3>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <Button variant="outline" size="small" onClick={fetchEntries}>
            <FiRefreshCw />
          </Button>
          <Button variant="primary" size="small" onClick={handleExport}>
            <FiDownload />
            <span>{t("Export", "خروجی")}</span>
          </Button>
        </div>
      </div>

      <div className={styles.filterSection}>
        <div className={styles.filtersRow}>
          <SearchBar
            placeholder={t("Search audit trail...", "جستجوی سوابق...")}
            value={searchQuery}
            onChange={setSearchQuery}
          />
          <Select
            value={selectedAction}
            onChange={setSelectedAction}
            options={[
              { value: "", label: t("All Actions", "همه عملیات‌ها") },
              { value: "create", label: t("Create", "ایجاد") },
              { value: "update", label: t("Update", "ویرایش") },
              { value: "delete", label: t("Delete", "حذف") },
              { value: "login", label: t("Login", "ورود") },
            ]}
          />
          <Select
            value={selectedEntityType}
            onChange={setSelectedEntityType}
            options={[
              { value: "", label: t("All Types", "همه انواع") },
              { value: "user", label: t("User", "کاربر") },
              { value: "product", label: t("Product", "محصول") },
              { value: "order", label: t("Order", "سفارش") },
              { value: "setting", label: t("Setting", "تنظیمات") },
            ]}
          />
        </div>
      </div>

      <div className={styles.auditContent}>
        {isLoading ? (
          <TableSkeleton rows={5} columns={5} />
        ) : entries.length === 0 ? (
          <EmptyState
            icon={<FiActivity />}
            title={t("No Audit Entries", "هیچ سابقه‌ای وجود ندارد")}
          />
        ) : (
          <DataTable
            columns={[
              { key: "action", label: t("Action", "عملیات") },
              { key: "entityType", label: t("Entity Type", "نوع موجودیت") },
              { key: "description", label: t("Description", "توضیحات") },
              { key: "createdAt", label: t("Date", "تاریخ") },
            ]}
            data={entries}
          />
        )}
      </div>
    </AdminCard>
  );
}

