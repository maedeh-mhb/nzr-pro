"use client";

import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import { FiArrowRight } from "react-icons/fi";
import styles from "@/styles/components/_journalCard.module.scss";

interface JournalCardProps {
  id: string;
  title: string;
  titleFa: string | null;
  excerpt: string | null;
  excerptFa: string | null;
  image: string | null;
  categoryName: string | null;
  categoryNameFa: string | null;
  authorName: string;
  readTime: number;
  slug: string | null;
  createdAt: Date | string;
}

export default function JournalCard({
  title,
  titleFa,
  excerpt,
  excerptFa,
  image,
  categoryName,
  categoryNameFa,
  authorName,
  readTime,
  slug,
  createdAt,
}: JournalCardProps) {
  const { t, language } = useLanguage();

  // Format date
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) return "";
    return d.toLocaleDateString(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const displayTitle = language === "fa" && titleFa ? titleFa : title;
  const displayExcerpt = language === "fa" && excerptFa ? excerptFa : (excerpt || "");
  const displayCategory = language === "fa" && categoryNameFa ? categoryNameFa : categoryName;

  const postUrl = slug ? `/journal/${slug}` : "#";

  return (
    <Link href={postUrl} className={styles.journalCard}>
      <div className={styles.imageContainer}>
        {image ? (
          <img src={image} alt={displayTitle} className={styles.image} />
        ) : (
          <div className={styles.imagePlaceholder} />
        )}
        {displayCategory && (
          <span className={styles.category}>{displayCategory.toUpperCase()}</span>
        )}
      </div>
      <div className={styles.content}>
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <span>📅</span>
            <span>{formatDate(createdAt)}</span>
          </span>
          <span className={styles.metaItem}>
            <span>⏱️</span>
            <span>{readTime} {t("min read", "دقیقه مطالعه")}</span>
          </span>
        </div>
        <h3 className={styles.title}>{displayTitle}</h3>
        {displayExcerpt && displayExcerpt.trim() && (
          <p className={styles.excerpt}>{displayExcerpt}</p>
        )}
        <div className={styles.footer}>
          <span className={styles.authorName}>
            {t("By", "نویسنده")} {authorName}
          </span>
          <span className={styles.readMore}>
            {t("Read More", "ادامه مطلب")}
            <FiArrowRight className={styles.arrowIcon} />
          </span>
        </div>
      </div>
    </Link>
  );
}

