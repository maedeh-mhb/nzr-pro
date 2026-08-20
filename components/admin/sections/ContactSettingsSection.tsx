"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";
import { FaTelegram, FaInstagram, FaWhatsapp } from "react-icons/fa";
import AdminCard from "../AdminCard";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import settingsStyles from "@/styles/components/_adminSettings.module.scss";
import styles from "@/styles/components/_adminContactSettings.module.scss";

const contactSettingsSchema = yup.object({
  telegram: yup.string().nullable(),
  instagram: yup.string().nullable(),
  whatsapp: yup.string().nullable(),
  rubika: yup.string().nullable(),
  phone: yup.string().nullable(),
  email: yup.string().email("Invalid email").nullable(),
  address: yup.string().nullable(),
  addressFa: yup.string().nullable(),
});

type ContactSettingsFormData = yup.InferType<typeof contactSettingsSchema>;

export default function ContactSettingsSection() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactSettingsFormData>({
    resolver: yupResolver(contactSettingsSchema),
  });

  // Load contact settings
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/contact-settings");
        if (response.ok) {
          const data = await response.json();
          reset({
            telegram: data.telegram || "",
            instagram: data.instagram || "",
            whatsapp: data.whatsapp || "",
            rubika: data.rubika || "",
            phone: data.phone || "",
            email: data.email || "",
            address: data.address || "",
            addressFa: data.addressFa || "",
          });
        } else {
          throw new Error("Failed to load settings");
        }
      } catch (error) {
        console.error("Error loading contact settings:", error);
        toast.error(t("Failed to load contact settings", "خطا در بارگذاری تنظیمات تماس"));
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [reset, t]);

  const onSubmit = async (data: ContactSettingsFormData) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/contact-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegram: data.telegram || null,
          instagram: data.instagram || null,
          whatsapp: data.whatsapp || null,
          rubika: data.rubika || null, 
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          addressFa: data.addressFa || null,
        }),
      });

      if (response.ok) {
        toast.success(t("Contact settings updated successfully", "تنظیمات تماس با موفقیت به‌روزرسانی شد"));
      } else {
        throw new Error("Failed to update settings");
      }
    } catch (error) {
      console.error("Error updating contact settings:", error);
      toast.error(t("Failed to update contact settings", "خطا در به‌روزرسانی تنظیمات تماس"));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className={settingsStyles.settingsContainer}>
        <AdminCard>
          <p>{t("Loading...", "در حال بارگذاری...")}</p>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={settingsStyles.settingsContainer}>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h2 className={cardStyles.cardTitle}>
            <FiMail />
            {t("Contact Settings", "تنظیمات تماس")}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className={`${formStyles.form} ${styles.contactSettingsForm}`}>
          <div className={`${formStyles.formSection} ${styles.socialMediaSection}`}>
            <h3 className={`${formStyles.sectionTitle} ${styles.sectionTitle}`}>
              <FaTelegram />
              {t("Social Media", "شبکه‌های اجتماعی")}
            </h3>

            <div className={styles.socialMediaFields}>
              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("Telegram", "تلگرام")}
                  placeholder="@username"
                  {...register("telegram")}
                  error={errors.telegram?.message}
                />
              </div>

              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("Instagram", "اینستاگرام")}
                  placeholder="@username"
                  {...register("instagram")}
                  error={errors.instagram?.message}
                />
              </div>

              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("WhatsApp", "واتساپ")}
                  placeholder="+1234567890"
                  {...register("whatsapp")}
                  error={errors.whatsapp?.message}
                />
              </div>

              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("Rubika", "روبیکا")}
                  placeholder="@username"
                  {...register("rubika")}
                  error={errors.rubika?.message}
                />
              </div>
            </div>
          </div>

          <div className={`${formStyles.formSection} ${styles.contactInfoSection}`}>
            <h3 className={`${formStyles.sectionTitle} ${styles.sectionTitle}`}>
              <FiPhone />
              {t("Contact Information", "اطلاعات تماس")}
            </h3>

            <div className={styles.contactInfoFields}>
              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("Phone", "تلفن")}
                  type="tel"
                  placeholder="+1234567890"
                  {...register("phone")}
                  error={errors.phone?.message}
                />
              </div>

              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Input
                  label={t("Email", "ایمیل")}
                  type="email"
                  placeholder="info@example.com"
                  {...register("email")}
                  error={errors.email?.message}
                />
              </div>
            </div>
          </div>

          <div className={`${formStyles.formSection} ${styles.addressSection}`}>
            <h3 className={`${formStyles.sectionTitle} ${styles.sectionTitle}`}>
              <FiMapPin />
              {t("Address", "آدرس")}
            </h3>

            <div className={styles.addressFields}>
              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Textarea
                  label={t("Address (English)", "آدرس (انگلیسی)")}
                  placeholder={t("Enter address in English", "آدرس را به انگلیسی وارد کنید")}
                  {...register("address")}
                  error={errors.address?.message}
                  rows={3}
                />
              </div>

              <div className={`${formStyles.formRow} ${styles.formRow}`}>
                <Textarea
                  label={t("Address (Farsi)", "آدرس (فارسی)")}
                  placeholder={t("Enter address in Farsi", "آدرس را به فارسی وارد کنید")}
                  {...register("addressFa")}
                  error={errors.addressFa?.message}
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className={formStyles.formActions}>
            <Button type="submit" variant="save" disabled={isSaving}>
              {isSaving
                ? t("Saving...", "در حال ذخیره...")
                : t("Save Settings", "ذخیره تنظیمات")}
            </Button>
          </div>
        </form>
      </AdminCard>
    </div>
  );
}

