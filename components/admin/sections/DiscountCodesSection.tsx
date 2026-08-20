"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  FiTag,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiX,
  FiSearch,
  FiChevronDown,
  FiChevronUp,
  FiUsers,
  FiClock,
} from "react-icons/fi";
import AdminCard from "../AdminCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select, { SelectOption } from "@/components/ui/Select";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";

interface User {
  id: string;
  name: string;
  surname: string | null;
  email: string;
  phone?: string | null;
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
  validFrom: string;
  validUntil: string;
  isActive: boolean;
  description: string | null;
  descriptionFa: string | null;
  userIds?: string[];
  isExpired?: boolean;
}


const discountCodeSchema = yup.object({
  code: yup.string().required("Code is required"),
  type: yup.string().oneOf(["global", "personal"]).required("Type is required"),
  discountType: yup
    .string()
    .oneOf(["percentage", "fixed_amount", "free_shipping"])
    .required("Discount type is required"),
  discountValue: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null || originalValue === undefined ? null : value;
    })
    .when("discountType", {
      is: (val: string) => val !== "free_shipping",
      then: (schema) => schema.required("Discount value is required"),
    }),
  minPurchaseAmount: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null || originalValue === undefined ? null : value;
    }),
  maxDiscountAmount: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null || originalValue === undefined ? null : value;
    }),
  usageLimit: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null || originalValue === undefined ? null : value;
    }),
  userLimit: yup
    .number()
    .nullable()
    .transform((value, originalValue) => {
      return originalValue === "" || originalValue === null || originalValue === undefined ? null : value;
    }),
  validFrom: yup.string().required("Valid from date is required"),
  validUntil: yup.string().required("Valid until date is required"),
  description: yup.string().nullable(),
  descriptionFa: yup.string().nullable(),
});

type DiscountCodeFormData = yup.InferType<typeof discountCodeSchema>;

export default function DiscountCodesSection() {
  const { t, language } = useLanguage();
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormExpanded, setIsFormExpanded] = useState(false);
  const [editingCode, setEditingCode] = useState<DiscountCode | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterActive, setFilterActive] = useState<string>("all");
  const [filterExpiration, setFilterExpiration] = useState<string>("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<DiscountCodeFormData>({
    resolver: yupResolver(discountCodeSchema),
    defaultValues: {
      type: "global",
      discountType: "percentage",
      discountValue: null,
      minPurchaseAmount: null,
      maxDiscountAmount: null,
      usageLimit: null,
      userLimit: null,
      description: null,
    },
  });

  const discountType = watch("discountType");
  const codeType = watch("type");

  // Fetch discount codes
  const fetchCodes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterType !== "all") params.append("type", filterType);
      if (filterActive !== "all") params.append("isActive", filterActive);

      const response = await fetch(`/api/admin/discount-codes?${params}`);
      if (response.ok) {
        const data = await response.json();
        setCodes(data.codes || []);
      } else {
        toast.error(t("Failed to fetch discount codes", "خطا در دریافت کدهای تخفیف"));
      }
    } catch (error) {
      console.error("Error fetching codes:", error);
      toast.error(t("Failed to fetch discount codes", "خطا در دریافت کدهای تخفیف"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCodes();
  }, [searchQuery, filterType, filterActive]);

  // Search users
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const response = await fetch(`/api/admin/users?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        // Handle paginated response format: { success: true, data: [...] }
        setSearchResults(data.data || data.users || []);
      }
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userSearchQuery]);

  // Handle form submit
  const onSubmit = async (data: DiscountCodeFormData) => {
    try {
      const payload: any = {
        ...data,
        minPurchaseAmount: data.minPurchaseAmount ?? null,
        maxDiscountAmount: data.maxDiscountAmount ?? null,
        usageLimit: data.usageLimit ?? null,
        userLimit: data.userLimit ?? null,
        userIds: codeType === "personal" ? selectedUsers.map((u) => u.id) : [],
      };

      if (editingCode) {
        // Update
        const response = await fetch(`/api/admin/discount-codes/${editingCode.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast.success(t("Discount code updated", "کد تخفیف به‌روزرسانی شد"));
          reset();
          setEditingCode(null);
          setIsFormExpanded(false);
          setSelectedUsers([]);
          fetchCodes();
        } else {
          const error = await response.json();
          toast.error(error.error || t("Failed to update", "خطا در به‌روزرسانی"));
        }
      } else {
        // Create
        const response = await fetch("/api/admin/discount-codes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          toast.success(t("Discount code created", "کد تخفیف ایجاد شد"));
          reset();
          setIsFormExpanded(false);
          setSelectedUsers([]);
          fetchCodes();
        } else {
          const error = await response.json();
          toast.error(error.error || t("Failed to create", "خطا در ایجاد"));
        }
      }
    } catch (error) {
      console.error("Error saving code:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    }
  };

  // Handle edit
  const handleEdit = (code: DiscountCode) => {
    setEditingCode(code);
    setValue("code", code.code);
    setValue("type", code.type);
    setValue("discountType", code.discountType);
    setValue("discountValue", code.discountValue ? parseFloat(code.discountValue) : null);
    setValue("minPurchaseAmount", code.minPurchaseAmount ? parseFloat(code.minPurchaseAmount) : null);
    setValue("maxDiscountAmount", code.maxDiscountAmount ? parseFloat(code.maxDiscountAmount) : null);
    setValue("usageLimit", code.usageLimit);
    setValue("userLimit", code.userLimit);
    setValue("validFrom", new Date(code.validFrom).toISOString().slice(0, 16));
    setValue("validUntil", new Date(code.validUntil).toISOString().slice(0, 16));
    setValue("description", code.description || null);
    setValue("descriptionFa", code.descriptionFa || null);
    setSelectedUsers([]); // Will need to fetch users if personal
    setIsFormExpanded(true);
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    if (!confirm(t("Are you sure?", "آیا مطمئن هستید؟"))) return;

    try {
      const response = await fetch(`/api/admin/discount-codes/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("Discount code deleted", "کد تخفیف حذف شد"));
        fetchCodes();
      } else {
        toast.error(t("Failed to delete", "خطا در حذف"));
      }
    } catch (error) {
      console.error("Error deleting code:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    }
  };

  // Add user to selection
  const addUser = (user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchQuery("");
    setSearchResults([]);
  };

  // Remove user from selection
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter((u) => u.id !== userId));
  };

  const typeOptions: SelectOption[] = [
    { value: "global", label: t("Global", "عمومی") },
    { value: "personal", label: t("Personal", "شخصی") },
  ];

  const discountTypeOptions: SelectOption[] = [
    { value: "percentage", label: t("Percentage", "درصدی") },
    { value: "fixed_amount", label: t("Fixed Amount", "مبلغ ثابت") },
    { value: "free_shipping", label: t("Free Shipping", "ارسال رایگان") },
  ];

  const filterTypeOptions: SelectOption[] = [
    { value: "all", label: t("All Types", "همه انواع") },
    { value: "global", label: t("Global", "عمومی") },
    { value: "personal", label: t("Personal", "شخصی") },
  ];

  const filterActiveOptions: SelectOption[] = [
    { value: "all", label: t("All", "همه") },
    { value: "true", label: t("Active", "فعال") },
    { value: "false", label: t("Inactive", "غیرفعال") },
  ];

  const filterExpirationOptions: SelectOption[] = [
    { value: "all", label: t("All", "همه") },
    { value: "active", label: t("Not Expired", "منقضی نشده") },
    { value: "expired", label: t("Expired", "منقضی شده") },
  ];

  // Expanded state for mobile cards
  const [expandedCards, setExpandedCards] = useState<{ [id: string]: boolean }>({});
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 600;

  return (
    <AdminCard className={isFormExpanded ? cardStyles.expanded : ""}>
      <div
        className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
        onClick={() => setIsFormExpanded(!isFormExpanded)}
      >
        <h3 className={cardStyles.cardTitle}>
          <FiTag />
          <span>{t("Discount Codes", "کدهای تخفیف")}</span>
        </h3>
        <div className={styles.expandIcon}>
          {isFormExpanded ? <FiChevronUp /> : <FiChevronDown />}
        </div>
      </div>

      {isFormExpanded && (
        <div className={styles.expandableContent}>
          {/* Codes List - Show at top when expanded */}
          <div style={{ marginBottom: "2rem" }}>
            <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <Input
                  placeholder={t("Search codes...", "جستجوی کدها...")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div style={{ minWidth: "150px" }}>
                <Select
                  options={filterTypeOptions}
                  value={filterType}
                  onChange={(value) => setFilterType(value)}
                />
              </div>
              <div style={{ minWidth: "150px" }}>
                <Select
                  options={filterActiveOptions}
                  value={filterActive}
                  onChange={(value) => setFilterActive(value)}
                />
              </div>
              <div style={{ minWidth: "150px" }}>
                <Select
                  options={filterExpirationOptions}
                  value={filterExpiration}
                  onChange={(value) => setFilterExpiration(value)}
                />
              </div>
            </div>

            {isLoading ? (
              <div style={{ textAlign: "center", padding: "2rem" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : codes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                {t("No discount codes found", "کد تخفیفی یافت نشد")}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {codes.map((code) => {
                  const isExpired = code.isExpired || (code.validUntil && new Date(code.validUntil) < new Date());
                  if (filterExpiration === "expired" && !isExpired) return null;
                  if (filterExpiration === "active" && isExpired) return null;

                  if (isMobile) {
                    const expanded = expandedCards[code.id] || false;
                    return (
                      <div
                        key={code.id}
                        style={{
                          border: isExpired ? "1.5px solid #e74c3c" : "1px solid #ddd",
                          borderRadius: "8px",
                          backgroundColor: isExpired ? "#fff5f5" : code.isActive ? "#fff" : "#f8f9fa",
                          opacity: isExpired ? 0.85 : 1,
                          position: "relative",
                          boxShadow: isExpired ? "0 0 0 2px #ffeaea" : undefined,
                          cursor: "pointer",
                          padding: 0,
                        }}
                        onClick={() => setExpandedCards((prev) => ({ ...prev, [code.id]: !expanded }))}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem" }}>
                          <span style={{
                            padding: "2px 10px",
                            borderRadius: 5,
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            background: code.type === "global" ? "#e3f2fd" : "#fff3e0",
                            color: code.type === "global" ? "#1976d2" : "#e65100",
                            border: code.type === "global" ? "1px solid #90caf9" : "1px solid #ffb74d",
                          }}>{code.type === "global" ? t("Global", "عمومی") : t("Personal", "شخصی")}</span>
                          <span style={{
                            padding: "2px 10px",
                            borderRadius: 5,
                            fontSize: "0.95rem",
                            fontWeight: 600,
                            background: isExpired ? "#e74c3c" : code.isActive ? "#43a047" : "#bdbdbd",
                            color: "#fff",
                            border: isExpired ? "1px solid #e74c3c" : code.isActive ? "1px solid #43a047" : "1px solid #bdbdbd",
                            marginLeft: 4,
                            letterSpacing: 0.2,
                          }}>{isExpired ? t("Expired", "منقضی شده") : code.isActive ? t("Active", "فعال") : t("Inactive", "غیرفعال")}</span>
                          <span style={{ marginLeft: 8 }}>{expanded ? <FiChevronUp /> : <FiChevronDown />}</span>
                        </div>
                        {expanded && (
                          <div style={{ padding: "1rem", borderTop: "1px solid #eee" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                              <strong style={{ fontSize: "1.1rem" }}>{code.code}</strong>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.875rem", color: "#666" }}>
                              <span>
                                <strong>{t("Type", "نوع")}:</strong>{" "}
                                {code.discountType === "percentage"
                                  ? t("Percentage", "درصدی")
                                  : code.discountType === "fixed_amount"
                                    ? t("Fixed Amount", "مبلغ ثابت")
                                    : t("Free Shipping", "ارسال رایگان")}
                              </span>
                              {code.discountValue && (
                                <span>
                                  <strong>{t("Value", "مقدار")}:</strong>{" "}
                                  {code.discountType === "percentage"
                                    ? `${code.discountValue}%`
                                    : `${code.discountValue} ${t("Tomans", "تومان")}`}
                                </span>
                              )}
                              <span>
                                <strong>{t("Usage", "استفاده")}:</strong> {code.usageCount}
                                {code.usageLimit && ` / ${code.usageLimit}`}
                              </span>
                              <span>
                                <FiClock style={{ display: "inline", marginRight: "0.25rem" }} />
                                {new Date(code.validUntil).toLocaleDateString()}
                              </span>
                            </div>
                            {(code.description || code.descriptionFa) && (
                              <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
                                {language === "fa" && code.descriptionFa
                                  ? code.descriptionFa
                                  : code.description || code.descriptionFa}
                              </div>
                            )}
                            <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleEdit(code); }}
                                style={{
                                  padding: "0.5rem",
                                  border: "1px solid #1976d2",
                                  background: "rgba(25, 118, 210, 0.1)",
                                  cursor: "pointer",
                                  color: "#1976d2",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  transition: "all 0.2s",
                                }}
                                title={t("Edit", "ویرایش")}
                              >
                                <FiEdit2 />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(code.id); }}
                                style={{
                                  padding: "0.5rem",
                                  border: "1px solid #d32f2f",
                                  background: "rgba(211, 47, 47, 0.1)",
                                  cursor: "pointer",
                                  color: "#d32f2f",
                                  borderRadius: "4px",
                                  fontWeight: 600,
                                  transition: "all 0.2s",
                                }}
                                title={t("Delete", "حذف")}
                              >
                                <FiTrash2 />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Desktop: show all details, not expandable
                  return (
                    <div
                      key={code.id}
                      style={{
                        padding: "1rem",
                        border: isExpired ? "1.5px solid #e74c3c" : "1px solid #ddd",
                        borderRadius: "8px",
                        backgroundColor: isExpired ? "#fff5f5" : code.isActive ? "#fff" : "#f8f9fa",
                        opacity: isExpired ? 0.85 : 1,
                        position: "relative",
                        boxShadow: isExpired ? "0 0 0 2px #ffeaea" : undefined,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                        <strong style={{ fontSize: "1.1rem" }}>{code.code}</strong>
                        <span style={{
                          padding: "2px 10px",
                          borderRadius: 5,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          background: code.type === "global" ? "#e3f2fd" : "#fff3e0",
                          color: code.type === "global" ? "#1976d2" : "#e65100",
                          border: code.type === "global" ? "1px solid #90caf9" : "1px solid #ffb74d",
                        }}>{code.type === "global" ? t("Global", "عمومی") : t("Personal", "شخصی")}</span>
                        <span style={{
                          padding: "2px 10px",
                          borderRadius: 5,
                          fontSize: "0.95rem",
                          fontWeight: 600,
                          background: isExpired ? "#e74c3c" : code.isActive ? "#43a047" : "#bdbdbd",
                          color: "#fff",
                          border: isExpired ? "1px solid #e74c3c" : code.isActive ? "1px solid #43a047" : "1px solid #bdbdbd",
                          marginLeft: 4,
                          letterSpacing: 0.2,
                        }}>{isExpired ? t("Expired", "منقضی شده") : code.isActive ? t("Active", "فعال") : t("Inactive", "غیرفعال")}</span>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", fontSize: "0.875rem", color: "#666" }}>
                        <span>
                          <strong>{t("Type", "نوع")}:</strong>{" "}
                          {code.discountType === "percentage"
                            ? t("Percentage", "درصدی")
                            : code.discountType === "fixed_amount"
                              ? t("Fixed Amount", "مبلغ ثابت")
                              : t("Free Shipping", "ارسال رایگان")}
                        </span>
                        {code.discountValue && (
                          <span>
                            <strong>{t("Value", "مقدار")}:</strong>{" "}
                            {code.discountType === "percentage"
                              ? `${code.discountValue}%`
                              : `${code.discountValue} ${t("Tomans", "تومان")}`}
                          </span>
                        )}
                        <span>
                          <strong>{t("Usage", "استفاده")}:</strong> {code.usageCount}
                          {code.usageLimit && ` / ${code.usageLimit}`}
                        </span>
                        <span>
                          <FiClock style={{ display: "inline", marginRight: "0.25rem" }} />
                          {new Date(code.validUntil).toLocaleDateString()}
                        </span>
                      </div>
                      {(code.description || code.descriptionFa) && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
                          {language === "fa" && code.descriptionFa
                            ? code.descriptionFa
                            : code.description || code.descriptionFa}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                        <button
                          onClick={() => handleEdit(code)}
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #1976d2",
                            background: "rgba(25, 118, 210, 0.1)",
                            cursor: "pointer",
                            color: "#1976d2",
                            borderRadius: "4px",
                            fontWeight: 600,
                            transition: "all 0.2s",
                          }}
                          title={t("Edit", "ویرایش")}
                        >
                          <FiEdit2 />
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          style={{
                            padding: "0.5rem",
                            border: "1px solid #d32f2f",
                            background: "rgba(211, 47, 47, 0.1)",
                            cursor: "pointer",
                            color: "#d32f2f",
                            borderRadius: "4px",
                            fontWeight: 600,
                            transition: "all 0.2s",
                          }}
                          title={t("Delete", "حذف")}
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className={formStyles.form}>
            <div className={formStyles.formGrid}>
              <Input
                label={t("Code", "کد")}
                {...register("code")}
                error={errors.code?.message}
                disabled={!!editingCode}
              />

              <Select
                label={t("Type", "نوع")}
                options={typeOptions}
                value={watch("type")}
                onChange={(value) => setValue("type", value as "global" | "personal")}
                error={errors.type?.message}
              />

              <Select
                label={t("Discount Type", "نوع تخفیف")}
                options={discountTypeOptions}
                value={watch("discountType")}
                onChange={(value) => setValue("discountType", value as any)}
                error={errors.discountType?.message}
              />

              {discountType !== "free_shipping" && (
                <Input
                  label={t("Discount Value", "مقدار تخفیف")}
                  type="number"
                  step="0.01"
                  {...register("discountValue", { valueAsNumber: true })}
                  error={errors.discountValue?.message}
                />
              )}

              <Input
                label={t("Min Purchase Amount (Optional)", "حداقل مبلغ خرید (اختیاری)")}
                type="number"
                step="0.01"
                placeholder={t("e.g., 100000", "مثال: 100000")}
                {...register("minPurchaseAmount", { valueAsNumber: true })}
                error={errors.minPurchaseAmount?.message}
              />

              {discountType === "percentage" && (
                <Input
                  label={t("Max Discount Amount (Optional)", "حداکثر مبلغ تخفیف (اختیاری)")}
                  type="number"
                  step="0.01"
                  placeholder={t("e.g., 50000", "مثال: 50000")}
                  {...register("maxDiscountAmount", { valueAsNumber: true })}
                  error={errors.maxDiscountAmount?.message}
                />
              )}

              <Input
                label={t("Usage Limit (Optional)", "حد استفاده (اختیاری)")}
                type="number"
                placeholder={t("e.g., 100", "مثال: 100")}
                {...register("usageLimit", { valueAsNumber: true })}
                error={errors.usageLimit?.message}
              />

              <Input
                label={t("User Limit (Optional)", "حد استفاده کاربر (اختیاری)")}
                type="number"
                placeholder={t("e.g., 3", "مثال: 3")}
                {...register("userLimit", { valueAsNumber: true })}
                error={errors.userLimit?.message}
              />

              <Input
                label={t("Valid From", "معتبر از")}
                type="datetime-local"
                {...register("validFrom")}
                error={errors.validFrom?.message}
              />

              <Input
                label={t("Valid Until", "معتبر تا")}
                type="datetime-local"
                {...register("validUntil")}
                error={errors.validUntil?.message}
              />

              <Input
                label={t("Description (English)", "توضیحات (انگلیسی)")}
                {...register("description")}
                error={errors.description?.message}
              />

              <Input
                label={t("Description (Farsi)", "توضیحات (فارسی)")}
                {...register("descriptionFa")}
                error={errors.descriptionFa?.message}
              />
            </div>

            {codeType === "personal" && (
              <div className={formStyles.formGroup}>
                <label className={formStyles.label}>
                  {t("Select Users", "انتخاب کاربران")}
                </label>
                <div style={{ position: "relative", marginBottom: "1rem" }}>
                  <Input
                    placeholder={t("Search by email, name, or phone", "جستجو با ایمیل، نام یا شماره تلفن")}
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                  />
                  {searchResults.length > 0 && (
                    <div
                      style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        right: 0,
                        backgroundColor: "white",
                        border: "1px solid #ddd",
                        borderRadius: "4px",
                        maxHeight: "200px",
                        overflowY: "auto",
                        zIndex: 1000,
                        marginTop: "4px",
                      }}
                    >
                      {searchResults.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => addUser(user)}
                          style={{
                            padding: "0.5rem",
                            cursor: "pointer",
                            borderBottom: "1px solid #eee",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f5f5f5";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "white";
                          }}
                        >
                          <div style={{ fontWeight: 500 }}>{user.name}</div>
                          <div style={{ fontSize: "0.875rem", color: "#666" }}>{user.email}</div>
                          {user.phone && (
                            <div style={{ fontSize: "0.875rem", color: "#666" }}>{user.phone}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedUsers.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {selectedUsers.map((user) => (
                      <div
                        key={user.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.25rem 0.5rem",
                          backgroundColor: "#e3f2fd",
                          borderRadius: "4px",
                        }}
                      >
                        <span>{user.name} ({user.email})</span>
                        <button
                          type="button"
                          onClick={() => removeUser(user.id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <FiX size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className={formStyles.formActions}>
              <Button type="submit" variant="primary">
                {editingCode
                  ? t("Update Discount Code", "به‌روزرسانی کد تخفیف")
                  : t("Create Discount Code", "ایجاد کد تخفیف")}
              </Button>
              {editingCode && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setEditingCode(null);
                    setSelectedUsers([]);
                  }}
                >
                  {t("Cancel", "لغو")}
                </Button>
              )}
            </div>
          </form>
        </div>
      )}
    </AdminCard>
  );
}

