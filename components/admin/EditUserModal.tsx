"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import Modal from "./Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Select, { SelectOption } from "@/components/ui/Select";
import UserAddresses from "./UserAddresses";
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

interface User {
  id: string;
  name: string | null;
  surname: string | null;
  email: string;
  phone: string | null;
  role: "user" | "admin" | "superadmin";
  emailVerified: Date | null;
  phoneVerified: Date | null;
  addresses: UserAddress[];
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSave: (data: any) => void;
}

const editUserSchema = yup.object({
  name: yup.string().required("Name is required"),
  surname: yup.string(),
  email: yup.string().email("Invalid email").required("Email is required"),
  phone: yup.string(),
  role: yup.string().oneOf(["user", "admin", "superadmin"]).required(),
});

type EditUserFormData = yup.InferType<typeof editUserSchema>;

export default function EditUserModal({ isOpen, onClose, user, onSave }: EditUserModalProps) {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<"profile" | "addresses">("profile");
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<EditUserFormData>({
    resolver: yupResolver(editUserSchema),
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const roleOptions: SelectOption[] = [
    { value: "user", label: t("User", "کاربر") },
    { value: "admin", label: t("Admin", "مدیر") },
    { value: "superadmin", label: t("Super Admin", "سوپر ادمین") },
  ];

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || "",
        surname: user.surname || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "user",
      });
      setActiveTab("profile");
    }
  }, [user, reset]);

  const onSubmit = (data: EditUserFormData) => {
    onSave(data);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={t("Edit User", "ویرایش کاربر")}
      size="large"
    >
      <div className={formStyles.tabContainer}>
        <div className={formStyles.tabHeader}>
          <button
            type="button"
            className={`${formStyles.tabButton} ${activeTab === "profile" ? formStyles.active : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            {t("Profile Information", "اطلاعات پروفایل")}
          </button>
          <button
            type="button"
            className={`${formStyles.tabButton} ${activeTab === "addresses" ? formStyles.active : ""}`}
            onClick={() => setActiveTab("addresses")}
          >
            {t("Address Management", "مدیریت آدرس")}
          </button>
        </div>

        <div className={formStyles.tabContent}>
          {activeTab === "profile" ? (
            <form onSubmit={handleSubmit(onSubmit)} className={formStyles.formContainer}>
              <div className={formStyles.formFields}>
                <Input
                  label={t("Name", "نام")}
                  {...register("name")}
                  error={errors.name?.message}
                />
                <Input
                  label={t("Surname", "نام خانوادگی")}
                  {...register("surname")}
                  error={errors.surname?.message}
                />
                <Input
                  label={t("Email", "ایمیل")}
                  type="email"
                  {...register("email")}
                  error={errors.email?.message}
                />
                <Input
                  label={t("Phone Number", "شماره تلفن")}
                  type="tel"
                  {...register("phone")}
                  error={errors.phone?.message}
                />
                <Select
                  label={t("Role", "نقش")}
                  options={roleOptions}
                  value={watch("role")}
                  onChange={(value) => {
                    setValue("role", value as "user" | "admin" | "superadmin");
                  }}
                  error={errors.role?.message}
                  placeholder={t("Select role", "نقش را انتخاب کنید")}
                />
              </div>
              <div className={formStyles.formActions}>
                <Button variant="save" type="submit">
                  {t("Save Changes", "ذخیره تغییرات")}
                </Button>
                <Button variant="outline" type="button" onClick={onClose}>
                  {t("Cancel", "لغو")}
                </Button>
              </div>
            </form>
          ) : (
            user && (
              <UserAddresses 
                userId={user.id} 
                initialAddresses={user.addresses || []} 
              />
            )
          )}
        </div>
      </div>
    </Modal>
  );
}
