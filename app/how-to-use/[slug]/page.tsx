"use client";


import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import BackButton from "@/components/ui/BackButton";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/pages/_journalPost.module.scss";

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
  readTime: number;
  slug: string | null;
  pdfUrl: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function HowToUsePostPage() {
  const params = useParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const [post, setPost] = useState<JournalPost | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPost = async () => {
      if (!params?.slug) return;

      setIsLoading(true);
      setError(null);
      try {
        const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
        const response = await fetch(`/api/journal/${slug}`);

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Post not found");
          }
          throw new Error("Failed to fetch post");
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setPost(data.post);
      } catch (err: any) {
        console.error("Error fetching post:", err);
        const errorMessage =
          err?.message || t("Failed to load post", "خطا در بارگذاری مقاله");
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [params?.slug, t]);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.loading}>
            <p>{t("Loading...", "در حال بارگذاری...")}</p>
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (error || !post) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.error}>
            <p>{error || t("Post not found", "مقاله یافت نشد")}</p>
            <BackButton
              href="/how-to-use"
              label={t("Back to How to Use", "بازگشت")}
            />
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  const displayTitle = language === "fa" && post.titleFa ? post.titleFa : post.title;
  const displayContent = language === "fa" && post.contentFa ? post.contentFa : post.content;
  const displayCategory = language === "fa" && post.categoryNameFa ? post.categoryNameFa : post.categoryName;

  return (
    <>
      <Navbar />
      <article className={styles.container}>
        <BackButton
          href="/how-to-use"
          label={t("Back to How to Use", "بازگشت")}
        />
        {post.image && (
          <div className={styles.imageContainer}>
            <img src={post.image} alt={displayTitle} className={styles.image} />
            {displayCategory && (
              <span className={styles.category}>{displayCategory.toUpperCase()}</span>
            )}
          </div>
        )}
        <div className={styles.content}>
          <div className={styles.meta}>
            <span className={styles.metaItem}>
              <span>📅</span>
              <span>{formatDate(post.createdAt)}</span>
            </span>
            <span className={styles.metaItem}>
              <span>⏱️</span>
              <span>{post.readTime} {t("min read", "دقیقه مطالعه")}</span>
            </span>
            <span className={styles.metaItem}>
              <span>✍️</span>
              <span>{t("By", "نویسنده")} {post.authorName}</span>
            </span>
          </div>
          <h1 className={styles.title}>{displayTitle}</h1>
          {post.pdfUrl && (
            <a
              href={post.pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              download
              className={styles.pdfDownloadButton}
            >
              📄 {t("Download PDF", "دانلود PDF")}
            </a>
          )}
          {displayContent && (
            <div
              className={styles.body}
              dangerouslySetInnerHTML={{ __html: displayContent }}
            />
          )}
        </div>
      </article>
      <Footer />
      <BottomBar />
    </>
  );
}
