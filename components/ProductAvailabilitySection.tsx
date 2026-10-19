"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_productAvailabilitySection.module.scss";

interface AvailabilityData {
  availabilityTitleEn: string | null;
  availabilityTitleFa: string | null;
  availabilityDates: string[];
  availabilityAudioUrl: string | null;
  availabilityIsEnabled: boolean;
}

export default function ProductAvailabilitySection({
  initialData,
  showAudio = false,
}: {
  initialData?: AvailabilityData | null;
  showAudio?: boolean;
}) {
  const { language, t } = useLanguage();
  const [availability, setAvailability] = useState<AvailabilityData | null>(initialData ?? null);

  useEffect(() => {
    if (initialData !== undefined) return;
    fetch(`/api/home-note?_=${Date.now()}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => data && setAvailability(data))
      .catch(() => {});
  }, [initialData]);

  if (
    !availability?.availabilityIsEnabled ||
    (availability.availabilityDates.length === 0 &&
      !(showAudio && availability.availabilityAudioUrl))
  ) {
    return null;
  }

  const title = language === "fa"
    ? availability.availabilityTitleFa || availability.availabilityTitleEn
    : availability.availabilityTitleEn || availability.availabilityTitleFa;

  return (
    <section className={styles.section} dir={language === "fa" ? "rtl" : "ltr"}>
      <div className={styles.content}><p className={styles.eyebrow}>{t("PRODUCT AVAILABILITY", "زمان عرضه محصولات")}</p>
        {/* <h2 className={styles.title}>{title || t("Products are available on these dates", "محصولات در تاریخ‌های زیر عرضه می‌شوند")}</h2> */}
        {availability.availabilityDates.length > 0 && (
          <div className={styles.dates}>
            {availability.availabilityDates.map((date) => (
              <span key={date} className={styles.date}>{date}</span>
            ))}
          </div>
        )}
        {showAudio && availability.availabilityAudioUrl && (
          <audio
            className={styles.audio}
            controls
            preload="metadata"
            src={availability.availabilityAudioUrl}
          >
            {t("Your browser does not support audio playback.", "مرورگر شما از پخش صوت پشتیبانی نمی‌کند.")}
          </audio>
        )}
      </div>
    </section>
  );
}
