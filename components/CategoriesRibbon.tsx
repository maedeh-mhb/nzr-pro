"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import { renderIcon } from "@/lib/utils/iconRenderer";
import styles from "@/styles/components/_categoriesRibbon.module.scss";

interface Category {
  id: string;
  name: string;
  nameFa: string | null;
  icon: string | null;
}

export default function CategoriesRibbon({ initialCategories }: { initialCategories?: Category[] }) {
  const { t, language } = useLanguage();
  const [categories, setCategories] = useState<Category[]>(initialCategories ?? []);

  useEffect(() => {
    if (initialCategories !== undefined) return;
    fetch("/api/categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => setCategories(data.categories || []))
      .catch((error) => console.error("Error loading categories:", error));
  }, []);

  if (categories.length === 0) return null;

  return (
    <section className={styles.ribbonSection} aria-label={t("Our Categories", "دسته بندی های نازیرا")}>
      <h2 className={styles.title}>{t("Our Categories", "دسته بندی های نازیرا")}</h2>
      <div className={styles.ribbon}>
        {categories.map((category) => {
          const name = language === "fa" && category.nameFa ? category.nameFa : category.name;
          return (
            <Link key={category.id} href={`/products?category=${category.id}`} className={styles.item}>
              <span className={styles.icon}>
                {renderIcon(category.icon, undefined, { width: "1.5rem", height: "1.5rem", color: "inherit" })}
              </span>
              <span className={styles.name}>{name}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
