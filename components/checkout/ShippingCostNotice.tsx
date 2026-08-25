"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import styles from "@/styles/components/_checkoutNotice.module.scss";

interface ShippingCostNoticeSettings {
  shippingCostNoticeEn?: string;
  shippingCostNoticeFa?: string;
}

export default function ShippingCostNotice() {
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
        const settings = data.settings as ShippingCostNoticeSettings;
        const localizedNotice = language === "fa"
          ? settings.shippingCostNoticeFa || settings.shippingCostNoticeEn
          : settings.shippingCostNoticeEn || settings.shippingCostNoticeFa;

        if (isMounted) setNotice(localizedNotice || "");
      } catch (error) {
        console.error("Error loading shipping cost notice:", error);
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