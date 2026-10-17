"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_articlesSlider.module.scss";

interface Article {
  id: string;
  titleEn: string;
  titleFa: string;
  imageUrl: string;
}

const AUTOPLAY_MS = 4000;

function getSlidesPerView() {
  if (typeof window === "undefined") return 1;
  if (window.innerWidth >= 1024) return 3;
  if (window.innerWidth >= 640) return 2;
  return 1;
}

export default function ArticlesSlider({ initialArticles }: { initialArticles?: Article[] }) {
  const { t, language } = useLanguage();
  const [articles, setArticles] = useState<Article[]>(initialArticles ?? []);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (initialArticles !== undefined) return;
    fetch("/api/instruction-cards?latest=5")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setArticles(data?.cards || []))
      .catch((error) => console.error("Error loading articles:", error));
  }, []);

  useEffect(() => {
    const update = () => setPerView(getSlidesPerView());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxIndex = Math.max(0, articles.length - perView);

  useEffect(() => {
    setIndex((current) => Math.min(current, maxIndex));
  }, [maxIndex]);

  const next = useCallback(() => {
    setIndex((current) => (current >= maxIndex ? 0 : current + 1));
  }, [maxIndex]);

  useEffect(() => {
    if (paused || maxIndex === 0) return;
    const timer = setInterval(() => {
      if (!document.hidden) next();
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [paused, maxIndex, next]);

  if (articles.length === 0) return null;

  const isRtl = language === "fa";
  const offset = (isRtl ? 1 : -1) * index * (100 / perView);

  return (
    <section
      className={styles.section}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
    >
      <h2 className={styles.sectionTitle}>{t("Nazira Articles", "مقالات نازیرا")}</h2>

      <div className={styles.viewport} dir={isRtl ? "rtl" : "ltr"}>
        <div className={styles.track} style={{ transform: `translateX(${offset}%)` }}>
          {articles.map((article, index) => (
            <div key={article.id} className={styles.slide} style={{ flexBasis: `${100 / perView}%` }}>
              <Link href={`/instructions?card=${article.id}`} className={styles.card}>
                <div className={styles.imageWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={article.imageUrl}
                    alt={isRtl ? article.titleFa : article.titleEn}
                    className={styles.image}
                    loading={index < 3 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={index === 0 ? "high" : "auto"}
                  />
                </div>
                <h3 className={styles.title}>{isRtl ? article.titleFa : article.titleEn}</h3>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {maxIndex > 0 && (
        <div className={styles.dots}>
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dot} ${i === index ? styles.activeDot : ""}`}
              onClick={() => setIndex(i)}
              aria-label={`${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
