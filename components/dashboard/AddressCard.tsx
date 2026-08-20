"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiEdit2, FiTrash2, FiMapPin, FiCheck } from "react-icons/fi";
import SwipeableItem from "./SwipeableItem";
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

interface AddressCardProps {
  address: Address;
  onEdit: () => void;
  onDelete: () => void;
  onSetDefault?: () => void;
  t: (en: string, fa: string) => string;
}

export default function AddressCard({ address, onEdit, onDelete, onSetDefault, t }: AddressCardProps) {
  const { language } = useLanguage();
  const [provinceName, setProvinceName] = useState("");
  const [cityName, setCityName] = useState("");

  useEffect(() => {
    const loadNames = async () => {
      // Load province name
      try {
        const provinceFile = language === "fa" ? "provinces-fa.json" : "provinces-en.json";
        const provinceResponse = await fetch(`/data/${provinceFile}`);
        if (provinceResponse.ok) {
          const provinceData = await provinceResponse.json();
          const province = provinceData.find((p: any) => p.id === address.provinceId);
          setProvinceName(province?.name || "");
        }
      } catch (error) {
        console.error("Error loading province:", error);
      }

      // Load city name
      try {
        const cityFile = language === "fa" ? "cities-fa.json" : "cities-en.json";
        const cityResponse = await fetch(`/data/${cityFile}`);
        if (cityResponse.ok) {
          const cityData = await cityResponse.json();
          const city = cityData.find(
            (c: any) => c.id === address.cityId && c.province_id === address.provinceId
          );
          setCityName(city?.name || "");
        }
      } catch (error) {
        console.error("Error loading city:", error);
      }
    };

    loadNames();
  }, [address.provinceId, address.cityId, language]);

  return (
    <SwipeableItem
      onDelete={onDelete}
      deleteLabel={t("Delete", "حذف")}
    >
      <div className={`${styles.addressCard} ${address.isDefault ? styles['addressCard--default'] : ''}`}>
        <div className={styles.addressHeader}>
          <div className={styles.addressType}>
            <span><FiMapPin /></span>
            <span>{address.name}</span>
            {address.isDefault && (
              <span className={styles.defaultBadge}>
                {t("Default", "پیش‌فرض")}
              </span>
            )}
          </div>
        </div>
        <div className={styles.addressText}>
          <div>{address.address}</div>
          <div className={styles.addressDetails}>
            {cityName && provinceName && (
              <span>
                {cityName}, {provinceName}
              </span>
            )}
            {address.postalCode && (
              <span>
                {t("Postal Code", "کد پستی")}: {address.postalCode}
              </span>
            )}
            <span>{address.country}</span>
          </div>
        </div>
        <div className={styles.addressActions}>
          <div className={`${styles.btnPrimary} ${styles.btnSmall} ${styles.addressEditBtn}`} onClick={onEdit} role="button" tabIndex={0}>
            <FiEdit2 /> {t("Edit", "ویرایش")}
          </div>
          {!address.isDefault && onSetDefault && (
            <div className={`${styles.btnPrimary} ${styles.btnSmall}`} onClick={onSetDefault} role="button" tabIndex={0}>
              <FiCheck /> {t("Default", "پیش‌فرض")}
            </div>
          )}
          <div className={`${styles.btnOutline} ${styles.btnSmall}`} onClick={onDelete} role="button" tabIndex={0}>
            <FiTrash2 /> {t("Delete", "حذف")}
          </div>
        </div>
      </div>
    </SwipeableItem>
  );
}

