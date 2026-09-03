"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
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

interface ArticleDetailClientProps {
  initialArticle: JournalPost;
}

export default function ArticleDetailClient({ initialArticle }: ArticleDetailClientProps) {
  const router = useRouter();
  const { t, language } = useLanguage();
  const [post] = useState<JournalPost>(initialArticle);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

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
          <Image
            src={post.image}
            alt={displayTitle}
            fill
            priority
            sizes="(max-width: 768px) 100vw, 1200px"
            unoptimized
            className={styles.image}
          />
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
