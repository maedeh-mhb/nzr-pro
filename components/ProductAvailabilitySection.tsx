"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_productAvailabilitySection.module.scss";

interface AvailabilityData {
  availabilityTitleEn: string | null;
  availabilityTitleFa: string | null;
  availabilityDates: string[];
  availabilityIsEnabled: boolean;
}

export default function ProductAvailabilitySection() {
  const { language, t } = useLanguage();
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);

  useEffect(() => {
    fetch(`/api/home-note?_=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setAvailability(data))
      .catch(() => {});
  }, []);

  if (!availability?.availabilityIsEnabled || availability.availabilityDates.length === 0) {
    return null;
  }

  const title = language === "fa"
    ? availability.availabilityTitleFa || availability.availabilityTitleEn
    : availability.availabilityTitleEn || availability.availabilityTitleFa;

  return (
    <section className={styles.section} dir={language === "fa" ? "rtl" : "ltr"}>
      <div className={styles.content}>
        <p className={styles.eyebrow}>{t("PRODUCT AVAILABILITY", "زمان عرضه محصولات")}</p>
        <h2 className={styles.title}>{title || t("Products are available on these dates", "محصولات در تاریخ‌های زیر عرضه می‌شوند")}</h2>
        <div className={styles.dates}>
          {availability.availabilityDates.map((date) => (
            <span key={date} className={styles.date}>{date}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
