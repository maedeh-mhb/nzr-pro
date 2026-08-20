"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiMapPin, FiEdit2, FiTrash2, FiStar } from "react-icons/fi";
import Button from "@/components/ui/Button";
import StatusBadge from "./StatusBadge";
import styles from "@/styles/components/_adminAddressCard.module.scss";

interface UserAddress {
  id: string;
  name: string;
  address: string;
  provinceId: number;
  cityId: number;
  postalCode: string;
  country: string;
  isDefault: boolean | null;
}

interface AddressCardProps {
  address: UserAddress;
  onEdit: (address: UserAddress) => void;
  onDelete: (address: UserAddress) => void;
  onSetDefault: (address: UserAddress) => void;
}

export default function AddressCard({ address, onEdit, onDelete, onSetDefault }: AddressCardProps) {
  const { t } = useLanguage();

  return (
    <div className={`${styles.addressCard} ${address.isDefault ? styles.defaultAddress : ''}`}>
      <div className={styles.addressHeader}>
        <div className={styles.addressTitle}>
          <FiMapPin />
          <span>{address.name}</span>
          {address.isDefault && (
              <StatusBadge 
                status="active" 
                label={t("Default", "پیشفرض")} 
                style={{ 
                  background: 'var(--success-color)', 
                  color: 'white',
                  fontWeight: '600',
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '12px'
                }} 
  />
          )}
        </div>
        <div className={styles.addressActions}>
          {!address.isDefault && (
            <Button
              variant="outline"
              size="small"
              title={t("Set as Default", "تنظیم به عنوان پیش‌فرض")}
              onClick={() => onSetDefault(address)}
            >
              <FiStar />
            </Button>
          )}
          <Button
            variant="primary"
            size="small"
            title={t("Edit", "ویرایش")}
            onClick={() => onEdit(address)}
          >
            <FiEdit2 />
          </Button>
          <Button
            variant="danger"
            size="small"
            title={t("Delete", "حذف")}
            onClick={() => onDelete(address)}
          >
            <FiTrash2 />
          </Button>
        </div>
      </div>
      <div className={styles.addressContent}>
        <p className={styles.addressText}>{address.address}</p>
        <div className={styles.addressDetails}>
          <span>{t("Province ID", "کد استان")}: {address.provinceId}</span>
          <span>{t("City ID", "کد شهر")}: {address.cityId}</span>
          <span>{t("Postal Code", "کد پستی")}: {address.postalCode}</span>
          <span>{t("Country", "کشور")}: {address.country}</span>
        </div>
      </div>
    </div>
  );
}
