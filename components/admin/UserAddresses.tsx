"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiPlus, FiMapPin } from "react-icons/fi";
import Button from "@/components/ui/Button";
import AddressCard from "./AddressCard";
import AddressModal from "./AddressModal";
import toast from "react-hot-toast";
import styles from "@/styles/components/_adminUserAddresses.module.scss";

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

interface UserAddressesProps {
  userId: string;
  initialAddresses: UserAddress[];
}

export default function UserAddresses({ userId, initialAddresses }: UserAddressesProps) {
  const { t } = useLanguage();
  const [addresses, setAddresses] = useState<UserAddress[]>(initialAddresses);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<UserAddress | null>(null);

  const fetchAddresses = async () => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/addresses`);
      if (!response.ok) throw new Error("Failed to fetch addresses");
      
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      console.error("Error fetching addresses:", error);
      toast.error(t("Failed to load addresses", "خطا در بارگذاری آدرس‌ها"));
    }
  };

  const handleSetDefault = async (address: UserAddress) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/addresses/${address.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...address, isDefault: true }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to set default address");
      }

      toast.success(t("Default address updated", "آدرس پیشفرض به روزرسانی شد"));
      fetchAddresses();
    } catch (error: any) {
      console.error("Error setting default address:", error);
      toast.error(error.message || t("Failed to set default address", "خطا در تنظیم آدرس پیشفرض"));
    }
  };

  const handleDelete = async (address: UserAddress) => {
    if (!confirm(t("Are you sure you want to delete this address?", "آیا مطمئن هستید این آدرس حذف شود؟"))) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/addresses/${address.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete address");
      }

      toast.success(t("Address deleted successfully", "آدرس با موفقیت حذف شد"));
      fetchAddresses();
    } catch (error: any) {
      console.error("Error deleting address:", error);
      toast.error(error.message || t("Failed to delete address", "خطا در حذف آدرس"));
    }
  };

  const handleEdit = (address: UserAddress) => {
    setEditingAddress(address);
  };

  const handleModalSave = () => {
    fetchAddresses();
  };

  const handleCloseModals = () => {
    setIsAddModalOpen(false);
    setEditingAddress(null);
  };

  return (
    <div className={styles.userAddresses}>
      <div className={styles.addressesHeader}>
        <h4 className={styles.addressesTitle}>
          <FiMapPin />
          <span>{t("Addresses", "آدرس‌ها")}</span>
          <span className={styles.addressCount}>({addresses.length})</span>
        </h4>
        <Button
          variant="primary"
          size="small"
          onClick={() => setIsAddModalOpen(true)}
        >
          <FiPlus />
          {t("Add Address", "افزودن آدرس")}
        </Button>
      </div>

      <div className={styles.addressesList}>
        {addresses.length === 0 ? (
          <div className={styles.emptyState}>
            <FiMapPin />
            <p>{t("No addresses found", "آدرسی یافت نشد")}</p>
          </div>
        ) : (
          addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onSetDefault={handleSetDefault}
            />
          ))
        )}
      </div>

      <AddressModal
        isOpen={isAddModalOpen}
        onClose={handleCloseModals}
        userId={userId}
        onSave={handleModalSave}
      />

      <AddressModal
        isOpen={!!editingAddress}
        onClose={handleCloseModals}
        address={editingAddress}
        userId={userId}
        onSave={handleModalSave}
      />
    </div>
  );
}
