"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiCalendar, FiFileText, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
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
  const [availabilityTitleEn, setAvailabilityTitleEn] = useState("");
  const [availabilityTitleFa, setAvailabilityTitleFa] = useState("");
  const [availabilityDates, setAvailabilityDates] = useState<string[]>([]);
  const [availabilityAudioUrl, setAvailabilityAudioUrl] = useState("");
  const [availabilityIsEnabled, setAvailabilityIsEnabled] = useState(true);
  const [isEnabled, setIsEnabled] = useState(true);
  const [isUploadingAvailabilityAudio, setIsUploadingAvailabilityAudio] = useState(false);
  const availabilityAudioInputRef = useRef<HTMLInputElement>(null);

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
          setAvailabilityTitleEn(data.note.availabilityTitleEn || "");
          setAvailabilityTitleFa(data.note.availabilityTitleFa || "");
          setAvailabilityDates(data.note.availabilityDates || []);
          setAvailabilityAudioUrl(data.note.availabilityAudioUrl || "");
          setAvailabilityIsEnabled(data.note.availabilityIsEnabled ?? true);
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
        body: JSON.stringify({ contentEn, contentFa, availabilityTitleEn, availabilityTitleFa, availabilityDates, availabilityAudioUrl, availabilityIsEnabled, isEnabled }),
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

  const handleAvailabilityAudioUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvailabilityAudio(true);
    try {
      setAvailabilityAudioUrl(await handleAudioUpload(file));
      toast.success(t("Voice uploaded successfully", "فایل صوتی با موفقیت آپلود شد"));
    } catch {
      toast.error(t("Failed to upload voice", "آپلود فایل صوتی ناموفق بود"));
    } finally {
      setIsUploadingAvailabilityAudio(false);
      event.target.value = "";
    }
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

              <div className={styles.sectionDivider}>
                <h4 className={styles.sectionDividerTitle}>
                  <FiCalendar />
                  <span>{t("Product Availability", "زمان عرضه محصولات")}</span>
                </h4>
                <p className={styles.sectionDividerDescription}>
                  {t("This section appears before categories and shows the dates products are available.", "این بخش قبل از دسته‌بندی‌ها نمایش داده می‌شود و تاریخ‌های عرضه محصولات را نشان می‌دهد.")}
                </p>
              </div>

              <div className={formStyles.formGrid}>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Title (English)", "عنوان (انگلیسی)")}</label>
                  <input className={formStyles.formInput} value={availabilityTitleEn} onChange={(event) => setAvailabilityTitleEn(event.target.value)} placeholder="Products are available on these dates" />
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Title (Farsi)", "عنوان (فارسی)")}</label>
                  <input className={formStyles.formInput} value={availabilityTitleFa} onChange={(event) => setAvailabilityTitleFa(event.target.value)} placeholder="محصولات در این تاریخ‌ها عرضه می‌شوند" dir="rtl" />
                </div>
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel}>{t("Product availability dates", "تاریخ‌های عرضه محصولات")}</label>
                <textarea
                  rows={3}
                  className={formStyles.formTextarea}
                  value={availabilityDates.join("\n")}
                  onChange={(event) => setAvailabilityDates(event.target.value.split("\n").map((date) => date.trim()).filter(Boolean))}
                  placeholder={t("Enter one date per line, for example: 2026-09-20", "هر تاریخ را در یک خط وارد کنید، مثال: ۱۴۰۵/۰۶/۲۹")}
                  dir="ltr"
                />
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel}>{t("Availability voice", "فایل صوتی زمان عرضه")}</label>
                <div className={styles.uploadOptions}>
                  <div className={styles.uploadOption}>
                    <input
                      ref={availabilityAudioInputRef}
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/m4a,audio/mp4"
                      onChange={handleAvailabilityAudioUpload}
                      disabled={isUploadingAvailabilityAudio}
                      style={{ display: "none" }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isUploadingAvailabilityAudio}
                      onClick={() => availabilityAudioInputRef.current?.click()}
                      style={{ width: "100%" }}
                    >
                      {isUploadingAvailabilityAudio
                        ? t("Uploading...", "در حال آپلود...")
                        : t("Upload voice file", "آپلود فایل صوتی")}
                    </Button>
                  </div>
                  <div className={styles.uploadOption}>
                    <input
                      type="url"
                      value={availabilityAudioUrl}
                      onChange={(event) => setAvailabilityAudioUrl(event.target.value)}
                      className={formStyles.formInput}
                      placeholder={t("Or enter an external audio URL", "یا لینک خارجی فایل صوتی را وارد کنید")}
                      dir="ltr"
                    />
                  </div>
                </div>
                {availabilityAudioUrl && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginTop: "0.75rem" }}>
                    <audio controls preload="metadata" src={availabilityAudioUrl} style={{ flex: 1, minWidth: 0 }} />
                    <button
                      type="button"
                      onClick={() => setAvailabilityAudioUrl("")}
                      className={styles.removeImageBtn}
                      title={t("Remove voice", "حذف فایل صوتی")}
                      aria-label={t("Remove voice", "حذف فایل صوتی")}
                    >
                      <FiX />
                    </button>
                  </div>
                )}
              </div>

              <div className={formStyles.formGroup}>
                <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <input type="checkbox" checked={availabilityIsEnabled} onChange={(event) => setAvailabilityIsEnabled(event.target.checked)} style={{ width: "auto" }} />
                  <span>{t("Enable Product Availability", "فعال‌سازی زمان عرضه محصولات")}</span>
                </label>
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
