"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { FiFileText, FiTag, FiChevronDown, FiChevronUp, FiEdit2, FiTrash2, FiEye } from "react-icons/fi";
import AdminCard from "../AdminCard";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import RichTextEditor from "@/components/ui/RichTextEditor";
import Button from "@/components/ui/Button";
import Select, { SelectOption } from "@/components/ui/Select";
import PersianDatePicker from "@/components/ui/PersianDatePicker";
import DataTable from "../DataTable";
import toast from "react-hot-toast";
import { jalaliToGregorian, gregorianToJalali } from "@/lib/utils/jalaliToGregorian";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";

interface JournalCategory {
  id: string;
  name: string;
  nameFa: string | null;
  description: string | null;
  descriptionFa: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface JournalPost {
  id: string;
  title: string;
  titleFa: string | null;
  excerpt: string | null;
  excerptFa: string | null;
  content: string | null;
  contentFa: string | null;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryNameFa: string | null;
  authorName: string;
  authorNameFa: string | null;
  readTime: number;
  slug: string | null;
  publishDate: Date | string | null;
  isPublished: boolean;
  seoTitle: string | null;
  seoTitleFa: string | null;
  seoDescription: string | null;
  seoDescriptionFa: string | null;
  seoKeywords: string | null;
  seoKeywordsFa: string | null;
  ogImage: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function ContentSection() {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<JournalCategory[]>([]);
  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(false);
  const [isCreatePostExpanded, setIsCreatePostExpanded] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [categoryNameFa, setCategoryNameFa] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Image upload state
  const [postImagePreview, setPostImagePreview] = useState<string>("");
  const [postImageUrl, setPostImageUrl] = useState<string>("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const postFileInputRef = useRef<HTMLInputElement>(null);

  // PDF upload state
  const [postPdfUrl, setPostPdfUrl] = useState<string>("");
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const postPdfInputRef = useRef<HTMLInputElement>(null);

  // Form schema
  const postSchema = yup.object({
    authorName: yup.string().required(t("Author name is required", "نام نویسنده الزامی است")),
    authorNameFa: yup.string(),
    title: yup.string().required(t("Title is required", "عنوان الزامی است")),
    titleFa: yup.string(),
    excerpt: yup.string(),
    excerptFa: yup.string(),
    content: yup.string(),
    contentFa: yup.string(),
    readTime: yup.number().required(t("Read time is required", "زمان مطالعه الزامی است")).min(1, t("Read time must be at least 1 minute", "زمان مطالعه باید حداقل 1 دقیقه باشد")),
    categoryId: yup.string(),
    slug: yup.string(),
    publishDate: yup.string(),
    publishDateJalali: yup.string(),
    image: yup.string(),
    seoTitle: yup.string(),
    seoTitleFa: yup.string(),
    seoDescription: yup.string(),
    seoDescriptionFa: yup.string(),
    seoKeywords: yup.string(),
    seoKeywordsFa: yup.string(),
    ogImage: yup.string(),
  });

  type PostFormData = yup.InferType<typeof postSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<PostFormData>({
    resolver: yupResolver(postSchema),
  });

  // Load categories and posts
  useEffect(() => {
    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch("/api/admin/journal-categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        } else {
          throw new Error("Failed to load categories");
        }
      } catch (error) {
        console.error("Error loading journal categories:", error);
        toast.error(t("Failed to load categories", "خطا در بارگذاری دسته‌بندی‌ها"));
      } finally {
        setIsLoadingCategories(false);
      }
    };

    const loadPosts = async () => {
      setIsLoadingPosts(true);
      try {
        const response = await fetch("/api/admin/journal");
        if (response.ok) {
          const data = await response.json();
          // Filter to show only published posts
          const publishedPosts = (data.posts || []).filter((post: JournalPost) => post.isPublished);
          setPosts(publishedPosts);
        } else {
          throw new Error("Failed to load posts");
        }
      } catch (error) {
        console.error("Error loading journal posts:", error);
        toast.error(t("Failed to load posts", "خطا در بارگذاری مقالات"));
      } finally {
        setIsLoadingPosts(false);
      }
    };

    loadCategories();
    loadPosts();
  }, [t]);

  // Refresh posts helper function
  const refreshPosts = async () => {
    try {
      const response = await fetch("/api/admin/journal");
      if (response.ok) {
        const data = await response.json();
        const publishedPosts = (data.posts || []).filter((post: JournalPost) => post.isPublished);
        setPosts(publishedPosts);
      }
    } catch (error) {
      console.error("Error refreshing posts:", error);
    }
  };

  // Handle card expansion (only one at a time)
  const handleCategoriesToggle = () => {
    if (isCreatePostExpanded) {
      setIsCreatePostExpanded(false);
    }
    setIsCategoriesExpanded(!isCategoriesExpanded);
  };

  const handleCreatePostToggle = () => {
    if (isCategoriesExpanded) {
      setIsCategoriesExpanded(false);
    }
    if (editingPostId) {
      setEditingPostId(null);
      reset();
      setPostImagePreview("");
      setPostImageUrl("");
      setPostPdfUrl("");
    }
    setIsCreatePostExpanded(!isCreatePostExpanded);
  };

  // Load post for editing
  const handleEditPost = async (post: JournalPost) => {
    try {
      // Close categories if open
      if (isCategoriesExpanded) {
        setIsCategoriesExpanded(false);
      }

      // Expand create post form
      setIsCreatePostExpanded(true);
      setEditingPostId(post.id);

      // Format publish date for form
      let publishDate = "";
      let publishDateJalali = "";
      if (post.publishDate) {
        try {
          const date = typeof post.publishDate === "string" ? new Date(post.publishDate) : (post.publishDate instanceof Date ? post.publishDate : new Date(post.publishDate));
          if (!isNaN(date.getTime())) {
            // Format as YYYY-MM-DD for Gregorian input
            publishDate = date.toISOString().split("T")[0];
            // Convert to Jalali for the Jalali date picker
            const jalaliDate = gregorianToJalali(date);
            if (jalaliDate) {
              publishDateJalali = jalaliDate;
            }
          } else {
            console.warn("Invalid date value when loading post:", post.publishDate);
          }
        } catch (error) {
          console.error("Error parsing date when loading post:", error, post.publishDate);
        }
      }

      // Populate form with post data
      reset({
        authorName: post.authorName || "",
        authorNameFa: post.authorNameFa || "",
        title: post.title || "",
        titleFa: post.titleFa || "",
        excerpt: post.excerpt || "",
        excerptFa: post.excerptFa || "",
        content: post.content || "",
        contentFa: post.contentFa || "",
        readTime: post.readTime || 1,
        categoryId: post.categoryId || "",
        slug: post.slug || "",
        publishDate: publishDate,
        publishDateJalali: publishDateJalali,
        image: post.image || "",
        seoTitle: post.seoTitle || "",
        seoTitleFa: post.seoTitleFa || "",
        seoDescription: post.seoDescription || "",
        seoDescriptionFa: post.seoDescriptionFa || "",
        seoKeywords: post.seoKeywords || "",
        seoKeywordsFa: post.seoKeywordsFa || "",
        ogImage: post.ogImage || "",
      });

      // Set image preview
      if (post.image) {
        setPostImagePreview(post.image);
        setPostImageUrl(post.image);
      } else {
        setPostImagePreview("");
        setPostImageUrl("");
      }

      // Set PDF url
      setPostPdfUrl((post as any).pdfUrl || "");
    } catch (error) {
      console.error("Error loading post for editing:", error);
      toast.error(t("Failed to load post", "خطا در بارگذاری مقاله"));
    }
  };

  // Handle category creation
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryName.trim()) {
      toast.error(t("Category name is required", "نام دسته‌بندی الزامی است"));
      return;
    }

    setIsCreatingCategory(true);
    try {
      const response = await fetch("/api/admin/journal-categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: categoryName.trim(),
          nameFa: categoryNameFa.trim() || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create category");
      }

      const data = await response.json();
      setCategories([...categories, data.category]);
      setCategoryName("");
      setCategoryNameFa("");
      toast.success(t("Category created successfully", "دسته‌بندی با موفقیت ایجاد شد"));
    } catch (error: any) {
      console.error("Error creating category:", error);
      toast.error(error.message || t("Failed to create category", "خطا در ایجاد دسته‌بندی"));
    } finally {
      setIsCreatingCategory(false);
    }
  };

  // Handle image upload from local storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-journal-image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      setPostImageUrl(data.url);
      setPostImagePreview(data.url);
      setValue("image", data.url);
      toast.success(t("Image uploaded successfully", "تصویر با موفقیت آپلود شد"));
    } catch (err: any) {
      console.error("Error uploading image:", err);
      toast.error(t("Failed to upload image", "خطا در آپلود تصویر"));
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handle image URL input
  const handleImageUrlChange = (url: string) => {
    setPostImageUrl(url);
    setPostImagePreview(url);
    setValue("image", url);
  };

  // Handle PDF upload
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPdf(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/admin/upload-journal-pdf", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to upload PDF");
      }
      const data = await response.json();
      setPostPdfUrl(data.url);
      toast.success(t("PDF uploaded successfully", "فایل PDF با موفقیت آپلود شد"));
    } catch (err: any) {
      toast.error(err.message || t("Failed to upload PDF", "خطا در آپلود فایل PDF"));
    } finally {
      setIsUploadingPdf(false);
      if (postPdfInputRef.current) postPdfInputRef.current.value = "";
    }
  };

  // Handle post creation/update
  const onSubmitPost = async (data: PostFormData) => {
    setIsSubmittingPost(true);
    try {
      // Convert publish date if provided (prioritize Jalali if both provided)
      let publishDate: string | null = null;
      if (data.publishDateJalali && data.publishDateJalali.trim()) {
        const gregorianDate = jalaliToGregorian(data.publishDateJalali);
        if (gregorianDate && !isNaN(gregorianDate.getTime())) {
          publishDate = gregorianDate.toISOString();
        }
      } else if (data.publishDate && data.publishDate.trim()) {
        const date = new Date(data.publishDate);
        if (!isNaN(date.getTime())) {
          publishDate = date.toISOString();
        }
      }

      // Generate OG image URL if not provided
      let ogImageUrl = data.ogImage || null;
      if (!ogImageUrl && data.title) {
        // Auto-generate OG image URL
        const slug = data.slug || data.title.toLowerCase().replace(/\s+/g, "-");
        const params = new URLSearchParams({
          title: data.title,
          titleFa: data.titleFa || "",
          excerpt: data.excerpt || "",
          image: data.image || "",
          lang: language,
        });
        ogImageUrl = `/api/og/journal/${slug}?${params.toString()}`;
      }

      const postData = {
        authorName: data.authorName,
        authorNameFa: data.authorNameFa || null,
        title: data.title,
        titleFa: data.titleFa || null,
        excerpt: data.excerpt || null,
        excerptFa: data.excerptFa || null,
        content: data.content || null,
        contentFa: data.contentFa || null,
        readTime: data.readTime,
        categoryId: data.categoryId || null,
        slug: data.slug || null,
        publishDate: publishDate,
        image: data.image || null,
        seoTitle: data.seoTitle || null,
        seoTitleFa: data.seoTitleFa || null,
        seoDescription: data.seoDescription || null,
        seoDescriptionFa: data.seoDescriptionFa || null,
        seoKeywords: data.seoKeywords || null,
        seoKeywordsFa: data.seoKeywordsFa || null,
        ogImage: ogImageUrl,
        pdfUrl: postPdfUrl || null,
        isPublished: true,
      };

      let response;
      if (editingPostId) {
        // Update existing post
        response = await fetch(`/api/admin/journal/${editingPostId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update post");
        }

        toast.success(t("Post updated successfully", "مقاله با موفقیت به‌روزرسانی شد"));
      } else {
        // Create new post
        response = await fetch("/api/admin/journal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create post");
        }

        const responseData = await response.json();
        const createdPost = responseData.post;

        // Generate OG image URL after post creation (now we have the actual slug)
        if (createdPost && createdPost.slug && !ogImageUrl) {
          const params = new URLSearchParams({
            title: data.title,
            titleFa: data.titleFa || "",
            excerpt: data.excerpt || "",
            image: data.image || "",
            lang: language,
          });
          const generatedOgImageUrl = `/api/og/journal/${createdPost.slug}?${params.toString()}`;

          // Update the post with OG image URL
          try {
            await fetch(`/api/admin/journal/${createdPost.id}`, {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                ogImage: generatedOgImageUrl,
              }),
            });
          } catch (ogError) {
            console.error("Error updating OG image:", ogError);
            // Don't fail the whole operation if OG image update fails
          }
        }

        toast.success(t("Post created successfully", "مقاله با موفقیت ایجاد شد"));
      }

      // Reset form and state
      reset();
      setPostImagePreview("");
      setPostImageUrl("");
      setPostPdfUrl("");
      setIsCreatePostExpanded(false);
      setEditingPostId(null);

      // Refresh posts list
      await refreshPosts();
    } catch (error: any) {
      console.error(`Error ${editingPostId ? "updating" : "creating"} post:`, error);
      toast.error(error.message || t(`Failed to ${editingPostId ? "update" : "create"} post`, `خطا در ${editingPostId ? "به‌روزرسانی" : "ایجاد"} مقاله`));
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Category options for select
  const categoryOptions: SelectOption[] = [
    { value: "", label: t("Select Category", "انتخاب دسته‌بندی") },
    ...categories.map((cat) => ({
      value: cat.id,
      label: language === "fa" && cat.nameFa ? cat.nameFa : cat.name,
    })),
  ];

  // Table columns
  const columns: Array<{
    key: string;
    label: string;
    render?: (value: any, row: JournalPost, index?: number) => React.ReactNode;
  }> = [
      {
        key: "id",
        label: t("ID", "شناسه"),
        render: (_: any, row: JournalPost, index?: number) => {
          // On large viewports, show index instead of ID
          return (
            <span className={tableStyles.indexCell}>
              <span className={tableStyles.indexDesktop}>{(index || 0) + 1}</span>
              <span className={tableStyles.indexMobile}>{row.id}</span>
            </span>
          );
        },
      },
      {
        key: "title",
        label: t("Title", "عنوان"),
        render: (value: string, row: JournalPost) => (
          <span>{language === "fa" && row.titleFa ? row.titleFa : value}</span>
        ),
      },
      { key: "authorName", label: t("Author", "نویسنده") },
      {
        key: "categoryName",
        label: t("Category", "دسته‌بندی"),
        render: (value: string, row: JournalPost) => (
          <span>{language === "fa" && row.categoryNameFa ? row.categoryNameFa : (value || "-")}</span>
        ),
      },
      {
        key: "publishDate",
        label: t("Date", "تاریخ"),
        render: (value: Date | string | null, row: JournalPost) => {
          // Try to get date from row if value is null/undefined
          const dateValue = value ?? row.publishDate ?? null;
          if (!dateValue) return "-";
          try {
            const date = typeof dateValue === "string" ? new Date(dateValue) : (dateValue instanceof Date ? dateValue : new Date(dateValue));
            if (isNaN(date.getTime())) {
              console.warn("Invalid date value:", dateValue, "for post:", row.id);
              return "-";
            }
            return date.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            });
          } catch (error) {
            console.error("Error formatting date:", error, dateValue, "for post:", row.id);
            return "-";
          }
        },
      },
      {
        key: "actions",
        label: t("Actions", "اقدامات"),
        render: (_: any, row: JournalPost) => (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <Button
              variant="outline"
              size="small"
              onClick={() => {
                // TODO: Implement view/edit
                toast(t("View/Edit functionality coming soon", "عملکرد مشاهده/ویرایش به زودی"));
              }}
            >
              <FiEye />
            </Button>
            <Button
              variant="outline"
              size="small"
              onClick={() => {
                handleEditPost(row);
              }}
            >
              <FiEdit2 />
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={async () => {
                if (!confirm(t("Are you sure you want to delete this post?", "آیا از حذف این مقاله اطمینان دارید؟"))) {
                  return;
                }
                try {
                  const response = await fetch(`/api/admin/journal/${row.id}`, {
                    method: "DELETE",
                  });
                  if (!response.ok) throw new Error("Failed to delete post");
                  toast.success(t("Post deleted successfully", "مقاله با موفقیت حذف شد"));
                  // Refresh posts
                  await refreshPosts();
                } catch (error) {
                  toast.error(t("Failed to delete post", "خطا در حذف مقاله"));
                }
              }}
            >
              <FiTrash2 />
            </Button>
          </div>
        ),
      },
    ];

  return (
    <>
      {/* Journal Categories Card */}
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiTag />
                    <span>{t("How to Use Categories", "دسته‌بندی‌های نحوه استفاده")}</span>
          </h3>
          <button
            className={cardStyles.cardAction}
            onClick={handleCategoriesToggle}
          >
            {isCategoriesExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
        {isCategoriesExpanded && (
          <div className={cardStyles.expandableContent}>
            <form onSubmit={handleCreateCategory} className={formStyles.formGrid}>
              <Input
                label={t("Category Name (English)", "نام دسته‌بندی (انگلیسی)")}
                placeholder={t("Enter category name", "نام دسته‌بندی را وارد کنید")}
                value={categoryName}
                onChange={(e) => setCategoryName(e.target.value)}
                required
              />
              <Input
                label={t("Category Name (Farsi)", "نام دسته‌بندی (فارسی)")}
                placeholder={t("Enter category name in Farsi", "نام دسته‌بندی به فارسی را وارد کنید")}
                value={categoryNameFa}
                onChange={(e) => setCategoryNameFa(e.target.value)}
              />
            </form>
            <div className={formStyles.formActions}>
              <Button
                variant="primary"
                onClick={handleCreateCategory}
                disabled={isCreatingCategory}
              >
                {isCreatingCategory
                  ? t("Saving...", "در حال ذخیره...")
                  : t("Save Category", "ذخیره دسته‌بندی")}
              </Button>
            </div>

            {/* Current Categories List */}
            <div style={{ marginTop: "1rem" }}>
              <h4 style={{ margin: 0, marginBottom: "0.75rem", fontWeight: 600 }}>
                {t("Current Categories", "دسته‌بندی‌های موجود")}
              </h4>
              {isLoadingCategories ? (
                <div style={{ padding: "0.75rem 0", color: "#666" }}>
                  {t("Loading...", "در حال بارگذاری...")}
                </div>
              ) : categories.length === 0 ? (
                <div style={{ padding: "0.75rem 0", color: "#666" }}>
                  {t("No categories yet", "هنوز دسته‌بندی‌ای وجود ندارد")}
                </div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                  {categories.map((cat) => {
                    const label = language === "fa" && cat.nameFa ? cat.nameFa : cat.name;
                    return (
                      <span
                        key={cat.id}
                        title={label}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "0.35rem 0.75rem",
                          borderRadius: "999px",
                          background: "var(--tertiary)",
                          color: "var(--text-dark)",
                          fontSize: "0.9rem",
                          border: "1px solid rgba(0,0,0,0.06)",
                        }}
                      >
                        <FiTag style={{ opacity: 0.7 }} />
                        <span style={{ maxWidth: 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </AdminCard>

      {/* Create/Edit Journal Post Card */}
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiFileText />
            <span>
              {editingPostId
                ? t("Edit Post", "ویرایش مقاله")
                : t("Create Post", "ایجاد مقاله")}
            </span>
          </h3>
          <button
            className={cardStyles.cardAction}
            onClick={handleCreatePostToggle}
          >
            {isCreatePostExpanded ? <FiChevronUp /> : <FiChevronDown />}
          </button>
        </div>
        {isCreatePostExpanded && (
          <div className={cardStyles.expandableContent}>
            <div className={formStyles.formCompact}>
              <form onSubmit={handleSubmit(onSubmitPost)}>
                {/* Author Name */}
                <div className={formStyles.formGrid}>
                  <Input
                    label={t("Author Name (English)", "نام نویسنده (انگلیسی)")}
                    placeholder={t("Enter author name", "نام نویسنده را وارد کنید")}
                    {...register("authorName")}
                    error={errors.authorName?.message}
                  />
                  <Input
                    label={t("Author Name (Farsi)", "نام نویسنده (فارسی)")}
                    placeholder={t("Enter author name in Farsi", "نام نویسنده به فارسی را وارد کنید")}
                    {...register("authorNameFa")}
                  />
                </div>

                {/* Post Title */}
                <div className={formStyles.formGrid}>
                  <Input
                    label={t("Post Title (English)", "عنوان مقاله (انگلیسی)")}
                    placeholder={t("Enter post title", "عنوان مقاله را وارد کنید")}
                    {...register("title")}
                    error={errors.title?.message}
                  />
                  <Input
                    label={t("Post Title (Farsi)", "عنوان مقاله (فارسی)")}
                    placeholder={t("Enter post title in Farsi", "عنوان مقاله به فارسی را وارد کنید")}
                    {...register("titleFa")}
                  />
                </div>

                {/* Short Text (Excerpt) */}
                <div className={formStyles.formGrid}>
                  <Textarea
                    label={t("Short Text (English)", "متن کوتاه (انگلیسی)")}
                    placeholder={t("Enter short description", "توضیحات کوتاه را وارد کنید")}
                    rows={3}
                    {...register("excerpt")}
                  />
                  <Textarea
                    label={t("Short Text (Farsi)", "متن کوتاه (فارسی)")}
                    placeholder={t("Enter short description in Farsi", "توضیحات کوتاه به فارسی را وارد کنید")}
                    rows={3}
                    {...register("excerptFa")}
                  />
                </div>

                {/* Long Text (Content) */}
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Long Text (English)", "متن کامل (انگلیسی)")}</label>
                  <RichTextEditor
                    value={watch("content") || ""}
                    onChange={(html) => setValue("content", html)}
                    placeholder={t("Enter full content", "محتوای کامل را وارد کنید")}
                    onImageUpload={async (file) => {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/admin/upload-journal-image", { method: "POST", body: formData });
                      if (res.ok) { const data = await res.json(); return data.url; }
                      throw new Error("Failed to upload");
                    }}
                    onAudioUpload={async (file) => {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/admin/upload-audio", { method: "POST", body: formData });
                      if (res.ok) { const data = await res.json(); return data.url; }
                      throw new Error("Failed to upload");
                    }}
                  />
                </div>
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>{t("Long Text (Farsi)", "متن کامل (فارسی)")}</label>
                  <RichTextEditor
                    value={watch("contentFa") || ""}
                    onChange={(html) => setValue("contentFa", html)}
                    placeholder={t("Enter full content in Farsi", "محتوای کامل به فارسی را وارد کنید")}
                    onImageUpload={async (file) => {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/admin/upload-journal-image", { method: "POST", body: formData });
                      if (res.ok) { const data = await res.json(); return data.url; }
                      throw new Error("Failed to upload");
                    }}
                    onAudioUpload={async (file) => {
                      const formData = new FormData();
                      formData.append("file", file);
                      const res = await fetch("/api/admin/upload-audio", { method: "POST", body: formData });
                      if (res.ok) { const data = await res.json(); return data.url; }
                      throw new Error("Failed to upload");
                    }}
                  />
                </div>

                {/* Read Time and Category */}
                <div className={formStyles.formGrid}>
                  <Input
                    type="number"
                    label={t("Minutes to Read", "دقیقه مطالعه")}
                    placeholder={t("Enter read time in minutes", "زمان مطالعه به دقیقه را وارد کنید")}
                    {...register("readTime")}
                    error={errors.readTime?.message}
                  />
                  <div className={formStyles.formGroup}>
                    <label className={formStyles.formLabel}>
                      {t("Category", "دسته‌بندی")}
                    </label>
                    <Select
                      options={categoryOptions}
                      value={watch("categoryId") || ""}
                      onChange={(value) => setValue("categoryId", value)}
                    />
                  </div>
                </div>

                {/* Image Upload */}
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    {t("Image", "تصویر")}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <Input
                      placeholder={t("Image URL", "آدرس تصویر")}
                      value={postImageUrl}
                      onChange={(e) => handleImageUrlChange(e.target.value)}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <input
                        type="file"
                        ref={postFileInputRef}
                        onChange={handleImageUpload}
                        accept="image/*"
                        style={{ display: "none" }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => postFileInputRef.current?.click()}
                        disabled={isUploadingImage}
                      >
                        {isUploadingImage
                          ? t("Uploading...", "در حال آپلود...")
                          : t("Upload from Local", "آپلود از سیستم")}
                      </Button>
                    </div>
                    {postImagePreview && (
                      <div style={{ marginTop: "1rem" }}>
                        <img
                          src={postImagePreview}
                          alt="Preview"
                          style={{
                            maxWidth: "100%",
                            maxHeight: "300px",
                            borderRadius: "8px",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Upload */}
                <div className={formStyles.formGroup}>
                  <label className={formStyles.formLabel}>
                    {t("Downloadable PDF", "فایل PDF قابل دانلود")}
                  </label>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                      <input
                        type="file"
                        ref={postPdfInputRef}
                        onChange={handlePdfUpload}
                        accept="application/pdf"
                        style={{ display: "none" }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => postPdfInputRef.current?.click()}
                        disabled={isUploadingPdf}
                      >
                        {isUploadingPdf
                          ? t("Uploading...", "در حال آپلود...")
                          : t("Upload PDF", "آپلود PDF")}
                      </Button>
                      {postPdfUrl && (
                        <Button
                          type="button"
                          variant="danger"
                          size="small"
                          onClick={() => setPostPdfUrl("")}
                        >
                          {t("Remove PDF", "حذف PDF")}
                        </Button>
                      )}
                    </div>
                    {postPdfUrl && (
                      <a
                        href={postPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: "0.875rem", color: "#367260", wordBreak: "break-all" }}
                      >
                        {postPdfUrl}
                      </a>
                    )}
                  </div>
                </div>

                {/* Slug */}
                <Input
                  label={t("Slug (Optional)", "نامک (اختیاری)")}
                  placeholder={t("Auto-generated if empty", "در صورت خالی بودن، به صورت خودکار تولید می‌شود")}
                  {...register("slug")}
                />

                {/* Publish Date */}
                <div className={formStyles.formGrid}>
                  <Input
                    type="date"
                    label={t("Publish Date (Western)", "تاریخ انتشار (میلادی)")}
                    {...register("publishDate")}
                  />
                  <PersianDatePicker
                    label={t("Publish Date (Jalali)", "تاریخ انتشار (شمسی)")}
                    placeholder={t("Select date", "انتخاب تاریخ")}
                    value={watch("publishDateJalali") || ""}
                    onChange={(value) => setValue("publishDateJalali", value)}
                  />
                </div>

                {/* SEO Section */}
                <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e8e9ea" }}>
                  <h4 style={{ marginBottom: "1rem", fontSize: "1.1rem", fontWeight: 600 }}>
                    {t("SEO Settings", "تنظیمات SEO")}
                  </h4>
                  <div className={formStyles.formGrid}>
                    <Input
                      label={t("SEO Title (English)", "عنوان SEO (انگلیسی)")}
                      placeholder={t("Enter SEO title", "عنوان SEO را وارد کنید")}
                      {...register("seoTitle")}
                    />
                    <Input
                      label={t("SEO Title (Farsi)", "عنوان SEO (فارسی)")}
                      placeholder={t("Enter SEO title in Farsi", "عنوان SEO به فارسی را وارد کنید")}
                      {...register("seoTitleFa")}
                    />
                  </div>
                  <div className={formStyles.formGrid}>
                    <Textarea
                      label={t("SEO Description (English)", "توضیحات SEO (انگلیسی)")}
                      placeholder={t("Enter SEO description", "توضیحات SEO را وارد کنید")}
                      rows={3}
                      {...register("seoDescription")}
                    />
                    <Textarea
                      label={t("SEO Description (Farsi)", "توضیحات SEO (فارسی)")}
                      placeholder={t("Enter SEO description in Farsi", "توضیحات SEO به فارسی را وارد کنید")}
                      rows={3}
                      {...register("seoDescriptionFa")}
                    />
                  </div>
                  <div className={formStyles.formGrid}>
                    <Input
                      label={t("Meta Keywords (English)", "کلمات کلیدی (انگلیسی)")}
                      placeholder={t("Comma-separated keywords", "کلمات کلیدی جدا شده با کاما")}
                      {...register("seoKeywords")}
                    />
                    <Input
                      label={t("Meta Keywords (Farsi)", "کلمات کلیدی (فارسی)")}
                      placeholder={t("Comma-separated keywords", "کلمات کلیدی جدا شده با کاما")}
                      {...register("seoKeywordsFa")}
                    />
                  </div>
                  <Input
                    label={t("OG Image URL", "آدرس تصویر OG")}
                    placeholder={t("Open Graph image URL (optional)", "آدرس تصویر Open Graph (اختیاری)")}
                    {...register("ogImage")}
                  />
                </div>

                <div className={formStyles.formActions}>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmittingPost}
                  >
                    {isSubmittingPost
                      ? t("Saving...", "در حال ذخیره...")
                      : editingPostId
                        ? t("Update Post", "به‌روزرسانی مقاله")
                        : t("Create Post", "ایجاد مقاله")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      reset();
                      setPostImagePreview("");
                      setPostImageUrl("");
                      setPostPdfUrl("");
                      setEditingPostId(null);
                    }}
                    disabled={isSubmittingPost}
                  >
                    {t("Reset", "بازنشانی")}
                  </Button>
                  {editingPostId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        reset();
                        setPostImagePreview("");
                        setPostImageUrl("");
                        setEditingPostId(null);
                        setIsCreatePostExpanded(false);
                      }}
                      disabled={isSubmittingPost}
                    >
                      {t("Cancel", "لغو")}
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </div>
        )}
      </AdminCard>

      {/* Posts Table */}
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiFileText />
            <span>{t("Published Posts", "مقالات منتشر شده")}</span>
          </h3>
        </div>
        {isLoadingPosts ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            {t("Loading posts...", "در حال بارگذاری مقالات...")}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className={tableStyles.desktopTable}>
              <DataTable
                columns={columns}
                data={posts}
                emptyMessage={t("No posts found", "هیچ مقاله‌ای یافت نشد")}
              />
            </div>

            {/* Mobile Card View */}
            <div className={tableStyles.mobileCards}>
              {posts.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center" }}>
                  {t("No posts found", "هیچ مقاله‌ای یافت نشد")}
                </div>
              ) : (
                posts.map((post) => (
                  <div
                    key={post.id}
                    className={`${tableStyles.postCard} ${expandedPostId === post.id ? tableStyles.expanded : ""}`}
                    onClick={() => setExpandedPostId(expandedPostId === post.id ? null : post.id)}
                  >
                    <div className={tableStyles.postCardHeader}>
                      <div className={tableStyles.postCardContent}>
                        <h4 className={tableStyles.postCardTitle}>
                          {language === "fa" && post.titleFa ? post.titleFa : post.title}
                        </h4>
                        <div className={tableStyles.postCardDate}>
                          {post.publishDate
                            ? new Date(post.publishDate).toLocaleDateString(
                              language === "fa" ? "fa-IR" : "en-US"
                            )
                            : "-"}
                        </div>
                      </div>
                      <div className={tableStyles.postCardChevron}>
                        {expandedPostId === post.id ? <FiChevronUp /> : <FiChevronDown />}
                      </div>
                    </div>
                    {expandedPostId === post.id && (
                      <div className={tableStyles.postCardDetails}>
                        <div className={tableStyles.postCardDetailRow}>
                          <span className={tableStyles.postCardDetailLabel}>
                            {t("Author", "نویسنده")}:
                          </span>
                          <span className={tableStyles.postCardDetailValue}>
                            {language === "fa" && post.authorNameFa ? post.authorNameFa : post.authorName}
                          </span>
                        </div>
                        <div className={tableStyles.postCardDetailRow}>
                          <span className={tableStyles.postCardDetailLabel}>
                            {t("Category", "دسته‌بندی")}:
                          </span>
                          <span className={tableStyles.postCardDetailValue}>
                            {language === "fa" && post.categoryNameFa
                              ? post.categoryNameFa
                              : post.categoryName || "-"}
                          </span>
                        </div>
                        <div className={tableStyles.postCardActions}>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              toast(t("View/Edit functionality coming soon", "عملکرد مشاهده/ویرایش به زودی"));
                            }}
                          >
                            <FiEye />
                            <span>{t("View", "مشاهده")}</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditPost(post);
                            }}
                          >
                            <FiEdit2 />
                            <span>{t("Edit", "ویرایش")}</span>
                          </Button>
                          <Button
                            variant="danger"
                            size="small"
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!confirm(t("Are you sure you want to delete this post?", "آیا از حذف این مقاله اطمینان دارید؟"))) {
                                return;
                              }
                              try {
                                const response = await fetch(`/api/admin/journal/${post.id}`, {
                                  method: "DELETE",
                                });
                                if (!response.ok) throw new Error("Failed to delete post");
                                toast.success(t("Post deleted successfully", "مقاله با موفقیت حذف شد"));
                                // Refresh posts
                                await refreshPosts();
                                setExpandedPostId(null);
                              } catch (error) {
                                toast.error(t("Failed to delete post", "خطا در حذف مقاله"));
                              }
                            }}
                          >
                            <FiTrash2 />
                            <span>{t("Delete", "حذف")}</span>
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </AdminCard>
    </>
  );
}
