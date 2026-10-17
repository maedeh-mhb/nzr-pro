"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_midPageBanner.module.scss";

interface MidPageBannerSettings {
  titleEn: string | null;
  titleFa: string | null;
  descriptionEn: string | null;
  descriptionFa: string | null;
  buttonTextEn: string | null;
  buttonTextFa: string | null;
  buttonLink: string | null;
  button2TextEn: string | null;
  button2TextFa: string | null;
  button2Link: string | null;
  backgroundImageUrl: string | null;
  isEnabled: boolean;
}

export default function MidPageBanner({ onEnabledChange }: { onEnabledChange?: (enabled: boolean) => void }) {
  const { t, language } = useLanguage();
  const [bannerSettings, setBannerSettings] = useState<MidPageBannerSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onEnabledChange?.(Boolean(bannerSettings?.isEnabled));
  }, [bannerSettings, onEnabledChange]);

  useEffect(() => {
    const loadBannerSettings = async () => {
      try {
        const response = await fetch(`/api/mid-page-banner?_=${Date.now()}`, {
          cache: 'no-store',
          next: { revalidate: 0 },
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setBannerSettings(data);
        }
      } catch (error) {
        console.error("Error loading mid-page banner:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadBannerSettings();
  }, []);

  if (isLoading || !bannerSettings?.isEnabled) {
    return null;
  }

  const description = language === "fa" ? bannerSettings.descriptionFa : bannerSettings.descriptionEn;
  const buttonText = language === "fa" ? bannerSettings.buttonTextFa : bannerSettings.buttonTextEn;
  const button2Text = language === "fa"
    ? bannerSettings.button2TextFa || bannerSettings.button2TextEn
    : bannerSettings.button2TextEn || bannerSettings.button2TextFa;

  const sectionStyle: React.CSSProperties & { "--banner-bg-image"?: string } = {};
  if (bannerSettings.backgroundImageUrl) {
    sectionStyle["--banner-bg-image"] = `url(${bannerSettings.backgroundImageUrl})`;
  }

  return (
    <section
      className={styles.banner}
      style={sectionStyle}
      data-main-banner
      data-has-bg-image={bannerSettings.backgroundImageUrl ? "true" : "false"}
    >
      <div className={styles.content}>
        {description && <p className={styles.description}>{description}</p>}
        {buttonText && (
          <Link href={bannerSettings.buttonLink || "/instructions"} className={`${styles.button} ${styles.buttonPrimary}`}>
            {buttonText}
          </Link>
        )}
        {button2Text && (
          <Link href={bannerSettings.button2Link || "/instructions"} className={`${styles.button} ${styles.buttonSecondary}`}>
            {button2Text}
          </Link>
        )}
      </div>
    </section>
  );
}
