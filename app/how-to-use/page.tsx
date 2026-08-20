"use client";

import { useState, useEffect, useRef } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import JournalCard from "@/components/journal/JournalCard";
import Select, { SelectOption } from "@/components/ui/Select";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/pages/_journal.module.scss";

interface JournalPost {
  id: string;
  title: string;
  titleFa: string | null;
  excerpt: string | null;
  excerptFa: string | null;
  image: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryNameFa: string | null;
  authorName: string;
  readTime: number;
  slug: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

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

export default function HowToUsePage() {
  const { t, language } = useLanguage();

  const [posts, setPosts] = useState<JournalPost[]>([]);
  const [categories, setCategories] = useState<JournalCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingRef = useRef(false);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/journal-categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      }
    };

    loadCategories();
  }, []);

  useEffect(() => {
    setPosts([]);
    setPage(1);
    setHasMore(true);
    setError(null);
  }, [selectedCategory]);

  useEffect(() => {
    if (!hasMore && page > 1) return;
    if (isFetchingRef.current) return;

    const fetchPosts = async () => {
      isFetchingRef.current = true;

      if (page === 1) setIsLoading(true);
      else setIsLoadingMore(true);

      try {
        const params = new URLSearchParams({
          page: String(page),
        });

        if (selectedCategory) {
          params.set("category", selectedCategory);
        }

        const response = await fetch(`/api/journal?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setPosts((prev) =>
          page === 1 ? data.posts || [] : [...prev, ...(data.posts || [])]
        );
        setHasMore(Boolean(data.hasMore));
      } catch (err: any) {
        console.error("Error fetching posts:", err);
        const errorMessage =
          err?.message || t("Failed to load posts", "خطا در بارگذاری مقالات");
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
        isFetchingRef.current = false;
      }
    };

    fetchPosts();
  }, [page, selectedCategory, hasMore, t]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMore &&
          !isLoading &&
          !isLoadingMore &&
          !isFetchingRef.current
        ) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, isLoading, isLoadingMore]);

  const categoryDropdownOptions: SelectOption[] = [
    { value: "", label: t("All Categories", "همه دسته‌بندی‌ها") },
    ...categories.map((category) => ({
      value: category.id,
      label: language === "fa" && category.nameFa ? category.nameFa : category.name,
    })),
  ];

  return (
    <>
      <Navbar />

      <section className={styles.pageHeader}>
        <h1>{t("How to Use", "نحوه استفاده")}</h1>
        <p>
          {t(
            "Guides and tips to get the most out of our products",
            "راهنما و نکات برای بهره‌برداری بهتر از محصولات ما"
          )}
        </p>
      </section>

      <div className={styles.container}>
        <div className={styles.categorySelection}>
          <label className={styles.categoryLabel}>
            {t("Select Category:", "انتخاب دسته‌بندی:")}
          </label>

          <div className={styles.mobileCategorySelect}>
            <Select
              options={categoryDropdownOptions}
              value={selectedCategory}
              onChange={(value) => setSelectedCategory(value)}
              placeholder={t("Select category", "انتخاب دسته‌بندی")}
            />
          </div>

          <div className={styles.desktopCategoryChips}>
            <button
              className={`${styles.categoryChip} ${
                selectedCategory === "" ? styles.active : ""
              }`}
              onClick={() => setSelectedCategory("")}
            >
              {t("All Categories", "همه دسته‌بندی‌ها")}
            </button>

            {categories.map((category) => (
              <button
                key={category.id}
                className={`${styles.categoryChip} ${
                  selectedCategory === category.id ? styles.active : ""
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {language === "fa" && category.nameFa ? category.nameFa : category.name}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className={styles.loading}>
            {t("Loading...", "در حال بارگذاری...")}
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : posts.length === 0 ? (
          <div className={styles.empty}>
            {t("No posts found", "هیچ مقاله‌ای یافت نشد")}
          </div>
        ) : (
          <>
            <div className={styles.journalGrid}>
              {posts.map((post) => (
  <JournalCard
    key={post.id}
    id={post.id}
    title={post.title}
    titleFa={post.titleFa}
    excerpt={post.excerpt}
    excerptFa={post.excerptFa}
    image={post.image}
    categoryName={post.categoryName}
    categoryNameFa={post.categoryNameFa}
    authorName={post.authorName}
    readTime={post.readTime}
    slug={post.slug}
    createdAt={post.createdAt}
  />
))}
            </div>

            {isLoadingMore && (
              <div className={styles.loading}>
                {t("Loading more...", "در حال بارگذاری بیشتر...")}
              </div>
            )}
            {!hasMore && posts.length > 0 && !isLoadingMore && (
              <div className={styles.empty}>
                {t("You have reached the end", "به انتهای مقالات رسیدید")}
              </div>
            )}

            <div ref={sentinelRef} style={{ height: 1 }} />
          </>
        )}
      </div>

      <Footer />
      <BottomBar />
    </>
  );
}
