"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiTruck, FiPlus, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiMail, FiPhone, FiUser } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Button from "@/components/ui/Button";
import Modal from "../Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";

interface Seller {
  id: string;
  nameEn: string;
  nameFa: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function SellersSection() {
  const { t, language } = useLanguage();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeller, setEditingSeller] = useState<Seller | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nameEn: "",
    nameFa: "",
    status: "active",
  });

  // Fetch sellers
  const fetchSellers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/sellers");
      if (response.ok) {
        const data = await response.json();
        setSellers(data.data?.sellers || data.sellers || []);
      } else {
        toast.error(t("Failed to load sellers", "خطا در بارگذاری فروشندگان"));
        console.error("API response not OK:", response.status);
      }
    } catch (error) {
      console.error("Error fetching sellers:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isExpanded) {
      fetchSellers();
    }
  }, [isExpanded]);

  const handleSubmit = async () => {
    if (!formData.nameEn.trim() || !formData.nameFa.trim()) {
      toast.error(t("Name is required", "نام الزامی است"));
      return;
    }

    setIsSaving(true);
    try {
      const url = editingSeller
        ? `/api/admin/sellers/${editingSeller.id}`
        : "/api/admin/sellers";
      const method = editingSeller ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingSeller
            ? t("Seller updated successfully", "فروشنده با موفقیت به‌روزرسانی شد")
            : t("Seller created successfully", "فروشنده با موفقیت ایجاد شد")
        );
        setIsModalOpen(false);
        resetForm();
        fetchSellers();
      } else {
        const error = await response.json();
        toast.error(error.error || t("Failed to save seller", "خطا در ذخیره فروشنده"));
      }
    } catch (error) {
      console.error("Error saving seller:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (seller: Seller) => {
    if (!confirm(t("Are you sure you want to delete this seller?", "آیا از حذف این فروشنده اطمینان دارید؟"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/sellers/${seller.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(t("Seller deleted successfully", "فروشنده با موفقیت حذف شد"));
        fetchSellers();
      } else {
        const error = await response.json();
        toast.error(error.error || t("Failed to delete seller", "خطا در حذف فروشنده"));
      }
    } catch (error) {
      console.error("Error deleting seller:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    }
  };

  const resetForm = () => {
    setFormData({
      nameEn: "",
      nameFa: "",
      status: "active",
    });
    setEditingSeller(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (seller: Seller) => {
    setEditingSeller(seller);
    setFormData({
      nameEn: seller.nameEn,
      nameFa: seller.nameFa,
      status: seller.status,
    });
    setIsModalOpen(true);
  };

  const statusOptions = [
    { value: "active", label: t("Active", "فعال") },
    { value: "inactive", label: t("Inactive", "غیرفعال") },
  ];

  return (
    <>
      <AdminCard>
        <div
          className={`${cardStyles.cardHeader} ${styles.expandableHeader}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h3 className={cardStyles.cardTitle}>
            <FiTruck />
            <span>{t("Sellers / Vendors", "فروشندگان")}</span>
          </h3>
          <div className={styles.expandIcon}>
            {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </div>
        </div>
        {isExpanded && (
          <div className={styles.expandableContent}>
            {isLoading ? (
              <div style={{ padding: "1rem", textAlign: "center" }}>
                {t("Loading...", "در حال بارگذاری...")}
              </div>
            ) : sellers.length > 0 ? (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1rem" }}>
                  {sellers.map((seller) => (
                    <div
                      key={seller.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.75rem 1rem",
                        background: seller.status === "inactive" ? "rgba(231, 76, 60, 0.05)" : "var(--tertiary)",
                        borderRadius: "0.5rem",
                        border: seller.status === "inactive" ? "1px solid rgba(231, 76, 60, 0.3)" : "none",
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <strong>
                            {language === "fa" ? seller.nameFa : seller.nameEn}
                          </strong>
                          {seller.status === "inactive" && (
                            <span style={{ fontSize: "0.7rem", color: "#e74c3c", background: "#ffe5e5", padding: "2px 6px", borderRadius: "4px" }}>
                              {t("Inactive", "غیرفعال")}
                            </span>
                          )}
                        </div>

                      </div>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <Button
                          variant="outline"
                          size="small"
                          onClick={() => openEditModal(seller)}
                        >
                          <FiEdit2 />
                        </Button>
                        <Button
                          variant="danger"
                          size="small"
                          onClick={() => handleDelete(seller)}
                        >
                          <FiTrash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button variant="primary" onClick={openCreateModal}>
                  <FiPlus style={{ marginRight: "0.5rem" }} />
                  {t("Add Seller", "افزودن فروشنده")}
                </Button>
              </>
            ) : (
              <div style={{ padding: "1rem 0" }}>
                <p style={{ color: "var(--text-dark)", opacity: 0.6, marginBottom: "1rem" }}>
                  {t("No sellers found. Add a seller first.", "هیچ فروشنده‌ای یافت نشد. ابتدا یک فروشنده اضافه کنید.")}
                </p>
                <Button variant="primary" onClick={openCreateModal}>
                  <FiPlus style={{ marginRight: "0.5rem" }} />
                  {t("Add Seller", "افزودن فروشنده")}
                </Button>
              </div>
            )}
          </div>
        )}
      </AdminCard>

      {/* Add/Edit Seller Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          resetForm();
        }}
        title={editingSeller ? t("Edit Seller", "ویرایش فروشنده") : t("Add Seller", "افزودن فروشنده")}
        size="large"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Input
              label={t("Name (English)", "نام (انگلیسی)")}
              placeholder={t("Enter seller name in English", "نام فروشنده را به انگلیسی وارد کنید")}
              value={formData.nameEn}
              onChange={(e) => setFormData({ ...formData, nameEn: e.target.value })}
              required
            />
            <Input
              label={t("Name (Farsi)", "نام (فارسی)")}
              placeholder={t("Enter seller name in Farsi", "نام فروشنده را به فارسی وارد کنید")}
              value={formData.nameFa}
              onChange={(e) => setFormData({ ...formData, nameFa: e.target.value })}
              className="farsi"
              required
            />
          </div>


          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <Select
              label={t("Status", "وضعیت")}
              options={statusOptions}
              value={formData.status}
              onChange={(value) => setFormData({ ...formData, status: value })}
            />
          </div>


          <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end", marginTop: "1rem" }}>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              {t("Cancel", "لغو")}
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? t("Saving...", "در حال ذخیره...") : (editingSeller ? t("Update", "به‌روزرسانی") : t("Create", "ایجاد"))}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}