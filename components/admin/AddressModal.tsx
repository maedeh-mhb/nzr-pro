"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import Modal from "./Modal";
import AddressForm, { AddressFormData } from "./AddressForm";
import toast from "react-hot-toast";

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

interface AddressModalProps {
  isOpen: boolean;
  onClose: () => void;
  address?: UserAddress | null;
  userId: string;
  onSave: () => void;
}

export default function AddressModal({ isOpen, onClose, address, userId, onSave }: AddressModalProps) {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async (formData: AddressFormData) => {
    setIsLoading(true);
    try {
      const url = address 
        ? `/api/admin/users/${userId}/addresses/${address.id}`
        : `/api/admin/users/${userId}/addresses`;
      
      const method = address ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save address");
      }

      toast.success(
        address 
          ? t("Address updated successfully", "آدرس با موفقیت بهروزرسانی شد")
          : t("Address created successfully", "آدرس با موفقیت ایجاد شد")
      );
      
      onSave();
      onClose();
    } catch (error: any) {
      console.error("Error saving address:", error);
      toast.error(error.message || t("Failed to save address", "خطا در ذخیره آدرس"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel}
      title={address ? t("Edit Address", "ویرایش آدرس") : t("Add New Address", "افزودن آدرس جدید")}
    size="large"
    >
      <AddressForm
        address={address}
        onSave={handleSave}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </Modal>
  );
}
