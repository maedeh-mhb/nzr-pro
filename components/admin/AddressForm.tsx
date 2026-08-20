"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Checkbox from "@/components/ui/Checkbox";
import ProvinceCitySelector from "../checkout/ProvinceCitySelector";
import formStyles from "@/styles/components/_adminForm.module.scss";

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

interface AddressFormProps {
  address?: UserAddress | null;
  onSave: (data: AddressFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const addressSchema = yup.object({
  name: yup.string().required("Address name is required"),
  address: yup.string().required("Address is required"),
  provinceId: yup.number().required("Province is required").positive(),
  cityId: yup.number().required("City is required").positive(),
  postalCode: yup.string().required("Postal code is required").matches(/^\d{10}$/, "Postal code must be 10 digits"),
  country: yup.string().required("Country is required"),
  isDefault: yup.boolean(),
});

export type AddressFormData = yup.InferType<typeof addressSchema>;

export default function AddressForm({ address, onSave, onCancel, isLoading }: AddressFormProps) {
  const { t } = useLanguage();
  const [selectedProvinceId, setSelectedProvinceId] = useState<number | null>(null);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<AddressFormData>({
    resolver: yupResolver(addressSchema),
    defaultValues: {
      name: "",
      address: "",
      provinceId: 0,
      cityId: 0,
      postalCode: "",
      country: "Iran",
      isDefault: false,
    },
  });

  // Initialize form data when address prop changes
  useEffect(() => {
    if (address) {
      const formData = {
        name: address.name,
        address: address.address,
        provinceId: address.provinceId,
        cityId: address.cityId,
        postalCode: address.postalCode,
        country: address.country,
        isDefault: address.isDefault || false,
      };
      
      reset(formData);
      setSelectedProvinceId(address.provinceId);
      setSelectedCityId(address.cityId);
    } else {
      const defaultData = {
        name: "",
        address: "",
        provinceId: 0,
        cityId: 0,
        postalCode: "",
        country: "Iran",
        isDefault: false,
      };
      
      reset(defaultData);
      setSelectedProvinceId(null);
      setSelectedCityId(null);
    }
  }, [address, reset]);

  const handleProvinceChange = (provinceId: number | null) => {
    setSelectedProvinceId(provinceId);
    setValue("provinceId", provinceId || 0);
    // Reset city when province changes
    setSelectedCityId(null);
    setValue("cityId", 0);
  };

  const handleCityChange = (cityId: number | null) => {
    setSelectedCityId(cityId);
    setValue("cityId", cityId || 0);
  };

  const onSubmit = (data: AddressFormData) => {
    onSave(data);
  };

  return (
    <div className={formStyles.largeFormContainer}>
      <form onSubmit={handleSubmit(onSubmit)} className={formStyles.formContainer}>
        <div className={formStyles.formFields}>
          <Input
            label={t("Address Name", "نام آدرس")}
            placeholder={t("e.g. Home, Office", "مثال: خانه، دفتر کار")}
            {...register("name")}
            error={errors.name?.message}
          />
          
          <Input
            label={t("Full Address", "آدرس کامل")}
            placeholder={t("Enter complete address", "آدرس کامل را وارد کنید")}
            {...register("address")}
            error={errors.address?.message}
          />

          <ProvinceCitySelector
            provinceId={selectedProvinceId}
            cityId={selectedCityId}
            onProvinceChange={handleProvinceChange}
            onCityChange={handleCityChange}
            error={errors.provinceId?.message || errors.cityId?.message}
          />

          <div className={formStyles.formRow}>
            <Input
              label={t("Postal Code", "کد پستی")}
              placeholder={t("10-digit postal code", "کد پستی ۱۰ رقمی")}
              {...register("postalCode")}
              error={errors.postalCode?.message}
            />
            
            <Input
              label={t("Country", "کشور")}
              {...register("country")}
              error={errors.country?.message}
            />
          </div>

          <Checkbox
            label={t("Set as default address", "تنظیم به عنوان آدرس پیشفرض")}
            checked={watch("isDefault") || false}
            onChange={(checked: boolean) => setValue("isDefault", checked)}
          />
        </div>

        <div className={formStyles.formActions}>
          <Button variant="save" type="submit" disabled={isLoading}>
            {isLoading ? t("Saving...", "در حال ذخیره...") : t("Save Address", "ذخیره آدرس")}
          </Button>
          <Button variant="outline" type="button" onClick={onCancel} disabled={isLoading}>
            {t("Cancel", "لغو")}
          </Button>
        </div>
      </form>
    </div>
  );
}
