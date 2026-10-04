"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import { FiX } from "react-icons/fi";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import ProvinceCitySelector from "@/components/checkout/ProvinceCitySelector";
import Button from "@/components/ui/Button";
import styles from "@/styles/components/_dashboard.module.scss";

interface Address {
  id: string;
  name: string;
  provinceId: number;
  cityId: number;
  address: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

interface AddressFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  address?: Address | null;
}

export default function AddressForm({
  isOpen,
  onClose,
  onSuccess,
  address,
}: AddressFormProps) {
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [provinceId, setProvinceId] = useState<number | null>(null);
  const [cityId, setCityId] = useState<number | null>(null);
  const [addressText, setAddressText] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (address) {
        // Edit mode
        setName(address.name);
        setProvinceId(address.provinceId);
        setCityId(address.cityId);
        setAddressText(address.address);
        setPostalCode(address.postalCode);
        setIsDefault(address.isDefault);
      } else {
        // Add mode
        setName("");
        setProvinceId(null);
        setCityId(null);
        setAddressText("");
        setPostalCode("");
        setIsDefault(false);
      }
      setErrors({});
    }
  }, [isOpen, address]);

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = t("Address name is required", "نام آدرس الزامی است");
    }

    if (!provinceId) {
      newErrors.province = t("Province is required", "استان الزامی است");
    }

    if (!cityId) {
      newErrors.city = t("City is required", "شهر الزامی است");
    }

    if (!addressText.trim()) {
      newErrors.address = t("Address is required", "آدرس الزامی است");
    }

    if (!postalCode.trim()) {
      newErrors.postalCode = t("Postal code is required", "کد پستی الزامی است");
    } else if (!/^\d{10}$/.test(postalCode.trim())) {
      newErrors.postalCode = t("Postal code must be exactly 10 digits", "کد پستی باید دقیقاً 10 رقم باشد");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      const url = address
        ? `/api/user/addresses/${address.id}`
        : "/api/user/addresses";
      const method = address ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          provinceId,
          cityId,
          address: addressText.trim(),
          postalCode: postalCode.trim(),
          isDefault,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save address");
      }

      toast.success(
        address
          ? t("Address updated successfully", "آدرس با موفقیت به‌روزرسانی شد")
          : t("Address added successfully", "آدرس با موفقیت اضافه شد")
      );
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast.error(error.message || t("Failed to save address", "خطا در ذخیره آدرس"));
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const formContent = (
    <>
      <div className={styles.modalHeader}>
        <h3 className={styles.modalTitle}>
          {address
            ? t("Edit Address", "ویرایش آدرس")
            : t("Add New Address", "افزودن آدرس جدید")}
        </h3>
        <button type="button" className={styles.modalClose} onClick={onClose}>
          <FiX />
        </button>
      </div>

      <form onSubmit={handleSubmit} className={styles.addressForm}>
        <Input
          label={t("Address Name", "نام آدرس")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("e.g., Home, Office", "مثال: خانه، دفتر")}
          error={errors.name}
        />

        <ProvinceCitySelector
          provinceId={provinceId}
          cityId={cityId}
          onProvinceChange={setProvinceId}
          onCityChange={setCityId}
          error={errors.province || errors.city}
        />

        <Textarea
          label={t("Address", "آدرس")}
          value={addressText}
          onChange={(e) => setAddressText(e.target.value)}
          placeholder={t("Enter full address", "آدرس کامل را وارد کنید")}
          rows={3}
          error={errors.address}
          className={styles.noResize}
        />

        <Input
          label={t("Postal Code", "کد پستی")}
          type="text"
          value={postalCode}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, ""); // Only digits
            if (value.length <= 10) {
              setPostalCode(value);
            }
          }}
          placeholder={t("1234567890", "1234567890")}
          maxLength={10}
          error={errors.postalCode}
        />

        <div className={styles.checkboxGroup}>
          <input
            type="checkbox"
            id="isDefault"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className={styles.checkbox}
          />
          <label htmlFor="isDefault" className={styles.checkboxLabel}>
            {t("Set as default address", "تنظیم به عنوان آدرس پیش‌فرض")}
          </label>
        </div>

        <div className={styles.modalActions}>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={saving}
          >
            {t("Cancel", "لغو")}
          </Button>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving
              ? t("Saving...", "در حال ذخیره...")
              : address
                ? t("Update", "به‌روزرسانی")
                : t("Add", "افزودن")}
          </Button>
        </div>
      </form>
    </>
  );

  return <div className={styles.addressFormInline}>{formContent}</div>;
}
