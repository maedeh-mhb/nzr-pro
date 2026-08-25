"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_checkoutNotice.module.scss";

interface CheckoutNoticeSettings {
  checkoutNoticeEn?: string;
  checkoutNoticeFa?: string;
}

export default function CheckoutNotice() {
  const { language } = useLanguage();
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadNotice = async () => {
      try {
        const response = await fetch(`/api/site-settings?_=${Date.now()}`, {
          cache: "no-store",
        });
        if (!response.ok) return;

        const data = await response.json();
        const settings = data.settings as CheckoutNoticeSettings;
        const localizedNotice = language === "fa"
          ? settings.checkoutNoticeFa || settings.checkoutNoticeEn
          : settings.checkoutNoticeEn || settings.checkoutNoticeFa;

        if (isMounted) setNotice(localizedNotice || "");
      } catch (error) {
        console.error("Error loading checkout notice:", error);
      }
    };

    loadNotice();

    return () => {
      isMounted = false;
    };
  }, [language]);

  if (!notice.trim()) return null;

  return (
    <div className={styles.notice} role="note">
      {notice.split("\n").map((line, index) => (
        <p key={`${index}-${line}`}>{line || "\u00a0"}</p>
      ))}
    </div>
  );
}
