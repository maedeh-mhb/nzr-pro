"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiFileText, FiChevronDown, FiChevronUp } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Button from "@/components/ui/Button";
import RichTextEditor from "@/components/ui/RichTextEditor";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";

export default function HomeNoteSection() {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [contentEn, setContentEn] = useState("");
  const [contentFa, setContentFa] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);

  useEffect(() => {
    if (isExpanded) loadData();
  }, [isExpanded]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/home-note");
      if (res.ok) {
        const data = await res.json();
        if (data.note) {
          setContentEn(data.note.contentEn || "");
          setContentFa(data.note.contentFa || "");
          setIsEnabled(data.note.isEnabled ?? true);
        }
      }
    } catch (error) {
      console.error("Error loading home note:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const res = await fetch("/api/admin/home-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentEn, contentFa, isEnabled }),
      });
      if (res.ok) {
        toast.success(t("Note saved!", "یادداشت ذخیره شد!"));
      } else {
        toast.error(t("Failed to save", "خطا در ذخیره"));
      }
    } catch {
      toast.error(t("Failed to save", "خطا در ذخیره"));
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
    if (res.ok) { const data = await res.json(); return data.url; }
    throw new Error("Failed to upload");
  };

  const handleAudioUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload-audio", { method: "POST", body: formData });
    if (res.ok) { const data = await res.json(); return data.url; }
    throw new Error("Failed to upload");
  };

  return (
    <AdminCard className={isExpanded ? cardStyles.expanded : ""}>
      <div className={`${cardStyles.cardHeader} ${styles.expandableHeader}`} onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className={cardStyles.cardTitle}>
          <FiFileText />
          <span>{t("Home Note", "یادداشت صفحه اصلی")}</span>
        </h3>
        <div className={styles.expandIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
      </div>

      {isExpanded && (
        <div className={styles.expandableContent}>
          {isLoading ? (
            <div style={{ padding: "1rem", textAlign: "center" }}>{t("Loading...", "در حال بارگذاری...")}</div>
          ) : (
            <>
              <div className={styles.sectionDivider}>
                <h4 className={styles.sectionDividerTitle}>
                  <FiFileText />
                  <span>{t("Note Content", "محتوای یادداشت")}</span>
                </h4>
                <p className={styles.sectionDividerDescription}>
                  {t("Text displayed between hero and categories on homepage", "متن نمایش داده شده بین بنر و دسته‌بندی‌ها در صفحه اصلی")}
                </p>
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel}>{t("Content (English)", "محتوا (انگلیسی)")}</label>
                <RichTextEditor
                  value={contentEn}
                  onChange={setContentEn}
                  placeholder={t("Enter note content in English...", "محتوای یادداشت را به انگلیسی بنویسید...")}
                  onImageUpload={handleImageUpload}
                  onAudioUpload={handleAudioUpload}
                />
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel}>{t("Content (Farsi)", "محتوا (فارسی)")}</label>
                <RichTextEditor
                  value={contentFa}
                  onChange={setContentFa}
                  placeholder={t("Enter note content in Farsi...", "محتوای یادداشت را به فارسی بنویسید...")}
                  onImageUpload={handleImageUpload}
                  onAudioUpload={handleAudioUpload}
                />
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input
                    type="checkbox"
                    checked={isEnabled}
                    onChange={(e) => setIsEnabled(e.target.checked)}
                    style={{ width: "auto" }}
                  />
                  <span>{t("Enable Note", "فعال‌سازی یادداشت")}</span>
                </label>
              </div>

              <div className={formStyles.formActions}>
                <Button variant="save" onClick={handleSave}>
                  {t("Save Note", "ذخیره یادداشت")}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </AdminCard>
  );
}
