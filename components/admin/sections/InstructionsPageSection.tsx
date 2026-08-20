"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiBook, FiImage, FiChevronDown, FiChevronUp, FiPlus, FiTrash2, FiEdit2, FiX } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import RichTextEditor from "@/components/ui/RichTextEditor";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminSettings.module.scss";

const pageSchema = yup.object({
  pageTitleEn: yup.string().required("Page title (English) is required"),
  pageTitleFa: yup.string().required("Page title (Farsi) is required"),
  pageIsEnabled: yup.boolean(),
  bannerTitleEn: yup.string().required("Banner title (English) is required"),
  bannerTitleFa: yup.string().required("Banner title (Farsi) is required"),
  bannerDescriptionEn: yup.string().required("Banner description (English) is required"),
  bannerDescriptionFa: yup.string().required("Banner description (Farsi) is required"),
  bannerButtonTextEn: yup.string().required("Button text (English) is required"),
  bannerButtonTextFa: yup.string().required("Button text (Farsi) is required"),
  bannerButtonLink: yup.string().required("Button link is required"),
  bannerBackgroundImageUrl: yup.string(),
  bannerIsEnabled: yup.boolean(),
});

const cardSchema = yup.object({
  titleEn: yup.string().required("Title (English) is required"),
  titleFa: yup.string().required("Title (Farsi) is required"),
  imageUrl: yup.string().required("Image is required"),
  contentEn: yup.string(),
  contentFa: yup.string(),
  audioUrl: yup.string(),
  sortOrder: yup.number(),
  isEnabled: yup.boolean(),
});

type PageFormData = yup.InferType<typeof pageSchema>;
type CardFormData = yup.InferType<typeof cardSchema>;

interface InstructionCard {
  id: string;
  titleEn: string;
  titleFa: string;
  imageUrl: string;
  contentEn: string | null;
  contentFa: string | null;
  audioUrl: string | null;
  sortOrder: number;
  isEnabled: boolean;
}

export default function InstructionsPageSection() {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cards, setCards] = useState<InstructionCard[]>([]);
  const [showCardForm, setShowCardForm] = useState(false);
  const [editingCard, setEditingCard] = useState<InstructionCard | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cardFileInputRef = useRef<HTMLInputElement>(null);

  const pageForm = useForm<PageFormData>({
    resolver: yupResolver(pageSchema),
    defaultValues: {
      pageTitleEn: "", pageTitleFa: "", pageIsEnabled: true,
      bannerTitleEn: "", bannerTitleFa: "",
      bannerDescriptionEn: "", bannerDescriptionFa: "",
      bannerButtonTextEn: "", bannerButtonTextFa: "",
      bannerButtonLink: "/instructions", bannerBackgroundImageUrl: "", bannerIsEnabled: true,
    },
  });

  const cardForm = useForm<CardFormData>({
    resolver: yupResolver(cardSchema),
    defaultValues: {
      titleEn: "", titleFa: "", imageUrl: "",
      contentEn: "", contentFa: "", audioUrl: "",
      sortOrder: 0, isEnabled: true,
    },
  });

  const cardContentEn = cardForm.watch("contentEn");
  const cardContentFa = cardForm.watch("contentFa");
  const bannerImageUrl = pageForm.watch("bannerBackgroundImageUrl");

  useEffect(() => {
    if (isExpanded) loadData();
  }, [isExpanded]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bannerRes, pageRes, cardsRes] = await Promise.all([
        fetch("/api/admin/mid-page-banner"),
        fetch("/api/admin/instructions-page"),
        fetch("/api/admin/instruction-cards"),
      ]);

      const bannerData = bannerRes.ok ? await bannerRes.json() : null;
      const pageData = pageRes.ok ? await pageRes.json() : null;

      if (bannerData || pageData) {
        pageForm.reset({
          pageTitleEn: pageData?.titleEn || "",
          pageTitleFa: pageData?.titleFa || "",
          pageIsEnabled: pageData?.isEnabled ?? true,
          bannerTitleEn: bannerData?.titleEn || "",
          bannerTitleFa: bannerData?.titleFa || "",
          bannerDescriptionEn: bannerData?.descriptionEn || "",
          bannerDescriptionFa: bannerData?.descriptionFa || "",
          bannerButtonTextEn: bannerData?.buttonTextEn || "",
          bannerButtonTextFa: bannerData?.buttonTextFa || "",
          bannerButtonLink: bannerData?.buttonLink || "/instructions",
          bannerBackgroundImageUrl: bannerData?.backgroundImageUrl || "",
          bannerIsEnabled: bannerData?.isEnabled ?? true,
        });
        if (bannerData?.backgroundImageUrl) setImagePreview(bannerData.backgroundImageUrl);
      }

      if (cardsRes.ok) {
        const cardsData = await cardsRes.json();
        setCards(cardsData.cards || []);
      }
    } catch (error) {
      console.error("Error loading instructions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onSavePage = async (data: PageFormData) => {
    try {
      const [bannerRes, pageRes] = await Promise.all([
        fetch("/api/admin/mid-page-banner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleEn: data.bannerTitleEn,
            titleFa: data.bannerTitleFa,
            descriptionEn: data.bannerDescriptionEn,
            descriptionFa: data.bannerDescriptionFa,
            buttonTextEn: data.bannerButtonTextEn,
            buttonTextFa: data.bannerButtonTextFa,
            buttonLink: data.bannerButtonLink,
            backgroundImageUrl: data.bannerBackgroundImageUrl,
            isEnabled: data.bannerIsEnabled,
          }),
        }),
        fetch("/api/admin/instructions-page", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            titleEn: data.pageTitleEn,
            titleFa: data.pageTitleFa,
            isEnabled: data.pageIsEnabled,
          }),
        }),
      ]);

      if (bannerRes.ok && pageRes.ok) {
        toast.success(t("Settings saved!", "تنظیمات ذخیره شد!"));
      } else {
        toast.error(t("Failed to save", "خطا در ذخیره"));
      }
    } catch {
      toast.error(t("Failed to save", "خطا در ذخیره"));
    }
  };

  const handleBannerImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        pageForm.setValue("bannerBackgroundImageUrl", data.url);
        setImagePreview(data.url);
        toast.success(t("Image uploaded", "تصویر آپلود شد"));
      }
    } catch {
      toast.error(t("Upload failed", "خطا در آپلود"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSaveCard = async (data: CardFormData) => {
    try {
      const body = editingCard ? { ...data, id: editingCard.id } : data;
      const res = await fetch("/api/admin/instruction-cards", {
        method: editingCard ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(t("Card saved!", "کارت ذخیره شد!"));
        setShowCardForm(false);
        setEditingCard(null);
        cardForm.reset({ titleEn: "", titleFa: "", imageUrl: "", contentEn: "", contentFa: "", audioUrl: "", sortOrder: 0, isEnabled: true });
        loadData();
      } else {
        toast.error(t("Failed to save card", "خطا در ذخیره کارت"));
      }
    } catch {
      toast.error(t("Failed to save card", "خطا در ذخیره کارت"));
    }
  };

  const onDeleteCard = async (id: string) => {
    if (!confirm(t("Delete this card?", "این کارت حذف شود؟"))) return;
    try {
      const res = await fetch(`/api/admin/instruction-cards?id=${id}`, { method: "DELETE" });
      if (res.ok) { toast.success(t("Card deleted", "کارت حذف شد")); loadData(); }
    } catch {
      toast.error(t("Failed to delete", "خطا در حذف"));
    }
  };

  const onEditCard = (card: InstructionCard) => {
    setEditingCard(card);
    cardForm.reset({
      titleEn: card.titleEn, titleFa: card.titleFa, imageUrl: card.imageUrl,
      contentEn: card.contentEn || "", contentFa: card.contentFa || "",
      audioUrl: card.audioUrl || "", sortOrder: card.sortOrder, isEnabled: card.isEnabled,
    });
    setShowCardForm(true);
  };

  const handleCardImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
      if (res.ok) { const data = await res.json(); cardForm.setValue("imageUrl", data.url); toast.success(t("Image uploaded", "تصویر آپلود شد")); }
    } catch { toast.error(t("Upload failed", "خطا در آپلود")); }
  };

  const handleRichTextImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/admin/upload-image", { method: "POST", body: formData });
    if (res.ok) { const data = await res.json(); return data.url; }
    throw new Error("Failed to upload");
  };

  const handleRichTextAudioUpload = async (file: File): Promise<string> => {
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
          <FiBook />
          <span>{t("Instructions", "آموزش")}</span>
        </h3>
        <div className={styles.expandIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
      </div>

      {isExpanded && (
        <div className={styles.expandableContent}>
          {isLoading ? (
            <div style={{ padding: "1rem", textAlign: "center" }}>{t("Loading...", "در حال بارگذاری...")}</div>
          ) : (
            <>
              <form onSubmit={pageForm.handleSubmit(onSavePage)}>
                {/* Banner Section */}
                <div className={styles.sectionDivider}>
                  <h4 className={styles.sectionDividerTitle}>
                    <FiImage />
                    <span>{t("Homepage Banner", "بنر صفحه اصلی")}</span>
                  </h4>
                  <p className={styles.sectionDividerDescription}>
                    {t("Banner shown between categories and featured products", "بنری که بین دسته‌بندی‌ها و محصولات ویژه نمایش داده می‌شود")}
                  </p>
                </div>
                <div className={formStyles.formGrid}>
                  <Input label={t("Banner Title (English)", "عنوان بنر (انگلیسی)")} {...pageForm.register("bannerTitleEn")} error={pageForm.formState.errors.bannerTitleEn?.message} />
                  <Input label={t("Banner Title (Farsi)", "عنوان بنر (فارسی)")} {...pageForm.register("bannerTitleFa")} error={pageForm.formState.errors.bannerTitleFa?.message} />
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Banner Description (English)", "توضیحات بنر (انگلیسی)")}</label>
                  <textarea rows={3} className={formStyles.formTextarea} {...pageForm.register("bannerDescriptionEn")} />
                  {pageForm.formState.errors.bannerDescriptionEn && <span className={formStyles.formError}>{pageForm.formState.errors.bannerDescriptionEn.message}</span>}
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Banner Description (Farsi)", "توضیحات بنر (فارسی)")}</label>
                  <textarea rows={3} className={formStyles.formTextarea} {...pageForm.register("bannerDescriptionFa")} />
                  {pageForm.formState.errors.bannerDescriptionFa && <span className={formStyles.formError}>{pageForm.formState.errors.bannerDescriptionFa.message}</span>}
                </div>
                <div className={formStyles.formGrid}>
                  <Input label={t("Button Text (English)", "متن دکمه (انگلیسی)")} {...pageForm.register("bannerButtonTextEn")} error={pageForm.formState.errors.bannerButtonTextEn?.message} />
                  <Input label={t("Button Text (Farsi)", "متن دکمه (فارسی)")} {...pageForm.register("bannerButtonTextFa")} error={pageForm.formState.errors.bannerButtonTextFa?.message} />
                </div>
                <Input label={t("Button Link", "لینک دکمه")} {...pageForm.register("bannerButtonLink")} error={pageForm.formState.errors.bannerButtonLink?.message} placeholder="/instructions" />
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Background Image", "تصویر پس‌زمینه")}</label>
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleBannerImageUpload} style={{ display: "none" }} />
                  <Button type="button" variant="outline" disabled={isUploadingImage} onClick={() => fileInputRef.current?.click()} style={{ width: "100%", marginBottom: "0.5rem" }}>
                    {isUploadingImage ? t("Uploading...", "در حال آپلود...") : t("Upload from Local Drive", "آپلود از درایو محلی")}
                  </Button>
                  <Input type="text" placeholder={t("Or enter image URL", "یا آدرس تصویر را وارد کنید")} {...pageForm.register("bannerBackgroundImageUrl")} />
                  {imagePreview && (
                    <div style={{ marginTop: "0.5rem", position: "relative" }}>
                      <img src={imagePreview} alt="Preview" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "8px" }} />
                      <button type="button" onClick={() => { setImagePreview(""); pageForm.setValue("bannerBackgroundImageUrl", ""); }} style={{ position: "absolute", top: "8px", right: "8px", background: "#fff", border: "none", borderRadius: "50%", width: "24px", height: "24px", cursor: "pointer" }}>×</button>
                    </div>
                  )}
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" {...pageForm.register("bannerIsEnabled")} style={{ width: "auto" }} />
                    <span>{t("Enable Homepage Banner", "فعال‌سازی بنر صفحه اصلی")}</span>
                  </label>
                </div>

                {/* Page Settings */}
                <div className={styles.sectionDivider}>
                  <h4 className={styles.sectionDividerTitle}>
                    <FiBook />
                    <span>{t("Page Settings", "تنظیمات صفحه")}</span>
                  </h4>
                </div>
                <div className={formStyles.formGrid}>
                  <Input label={t("Page Title (English)", "عنوان صفحه (انگلیسی)")} {...pageForm.register("pageTitleEn")} error={pageForm.formState.errors.pageTitleEn?.message} />
                  <Input label={t("Page Title (Farsi)", "عنوان صفحه (فارسی)")} {...pageForm.register("pageTitleFa")} error={pageForm.formState.errors.pageTitleFa?.message} />
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input type="checkbox" {...pageForm.register("pageIsEnabled")} style={{ width: "auto" }} />
                    <span>{t("Enable Instructions Page", "فعال‌سازی صفحه آموزش")}</span>
                  </label>
                </div>
                <div className={formStyles.formActions}>
                  <Button variant="save" type="submit">{t("Save Settings", "ذخیره تنظیمات")}</Button>
                </div>
              </form>

              {/* Cards Section */}
              <div className={styles.sectionDivider}>
                <h4 className={styles.sectionDividerTitle}>
                  <FiImage />
                  <span>{t("Instruction Cards", "کارت‌های آموزش")}</span>
                </h4>
                <p className={styles.sectionDividerDescription}>
                  {t("Create and manage instruction cards", "ایجاد و مدیریت کارت‌های آموزش")}
                </p>
              </div>

              {!showCardForm ? (
                <>
                  <Button variant="outline" onClick={() => { setEditingCard(null); cardForm.reset({ titleEn: "", titleFa: "", imageUrl: "", contentEn: "", contentFa: "", audioUrl: "", sortOrder: 0, isEnabled: true }); setShowCardForm(true); }} style={{ marginBottom: "1rem" }}>
                    <FiPlus /> {t("Add Card", "افزودن کارت")}
                  </Button>
                  {cards.length === 0 ? (
                    <p style={{ color: "#666", padding: "1rem" }}>{t("No cards yet", "هنوز کارتی وجود ندارد")}</p>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                      {cards.map((card) => (
                        <div key={card.id} style={{ border: "1px solid #e5e7eb", borderRadius: "8px", overflow: "hidden", background: "#fff" }}>
                          <img src={card.imageUrl} alt={card.titleEn} style={{ width: "100%", height: "120px", objectFit: "cover" }} />
                          <div style={{ padding: "0.75rem" }}>
                            <p style={{ fontWeight: 600, margin: "0 0 0.25rem", fontSize: "0.9rem" }}>{card.titleEn}</p>
                            <p style={{ color: "#666", margin: "0 0 0.5rem", fontSize: "0.8rem" }}>{card.titleFa}</p>
                            <div style={{ display: "flex", gap: "0.5rem" }}>
                              <button onClick={() => onEditCard(card)} style={{ border: "none", background: "none", cursor: "pointer", color: "#2563eb" }}><FiEdit2 /></button>
                              <button onClick={() => onDeleteCard(card.id)} style={{ border: "none", background: "none", cursor: "pointer", color: "#dc2626" }}><FiTrash2 /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <form onSubmit={cardForm.handleSubmit(onSaveCard)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                    <h4 style={{ margin: 0 }}>{editingCard ? t("Edit Card", "ویرایش کارت") : t("New Card", "کارت جدید")}</h4>
                    <button type="button" onClick={() => { setShowCardForm(false); setEditingCard(null); }} style={{ border: "none", background: "none", cursor: "pointer" }}><FiX size={20} /></button>
                  </div>
                  <div className={formStyles.formGrid}>
                    <Input label={t("Title (English)", "عنوان (انگلیسی)")} {...cardForm.register("titleEn")} error={cardForm.formState.errors.titleEn?.message} />
                    <Input label={t("Title (Farsi)", "عنوان (فارسی)")} {...cardForm.register("titleFa")} error={cardForm.formState.errors.titleFa?.message} />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>{t("Cover Image", "تصویر کاور")}</label>
                    <input ref={cardFileInputRef} type="file" accept="image/*" onChange={handleCardImageUpload} style={{ display: "none" }} />
                    <Button type="button" variant="outline" onClick={() => cardFileInputRef.current?.click()} style={{ width: "100%", marginBottom: "0.5rem" }}>{t("Upload Image", "آپلود تصویر")}</Button>
                    <Input type="text" placeholder={t("Or enter image URL", "یا آدرس تصویر")} {...cardForm.register("imageUrl")} error={cardForm.formState.errors.imageUrl?.message} />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>{t("Content (English)", "محتوا (انگلیسی)")}</label>
                    <RichTextEditor value={cardContentEn || ""} onChange={(html) => cardForm.setValue("contentEn", html)} onImageUpload={handleRichTextImageUpload} onAudioUpload={handleRichTextAudioUpload} />
                  </div>
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>{t("Content (Farsi)", "محتوا (فارسی)")}</label>
                    <RichTextEditor value={cardContentFa || ""} onChange={(html) => cardForm.setValue("contentFa", html)} onImageUpload={handleRichTextImageUpload} onAudioUpload={handleRichTextAudioUpload} />
                  </div>
                  <div className={formStyles.formGrid}>
                    <Input type="number" label={t("Sort Order", "ترتیب")} {...cardForm.register("sortOrder")} />
                    <div className={formStyles.formGroup}>
                      <label className={formStyles.formLabel} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <input type="checkbox" {...cardForm.register("isEnabled")} style={{ width: "auto" }} />
                        <span>{t("Enabled", "فعال")}</span>
                      </label>
                    </div>
                  </div>
                  <div className={formStyles.formActions}>
                    <Button type="button" variant="outline" onClick={() => { setShowCardForm(false); setEditingCard(null); }}>{t("Cancel", "لغو")}</Button>
                    <Button variant="save" type="submit">{t("Save Card", "ذخیره کارت")}</Button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      )}
    </AdminCard>
  );
}
