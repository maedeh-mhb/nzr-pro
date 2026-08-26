"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import { FaTelegram, FaInstagram, FaWhatsapp, FaLink } from "react-icons/fa";
import styles from "@/styles/components/_footer.module.scss";

interface ContactSettings {
  telegram: string | null;
  instagram: string | null;
  whatsapp: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  addressFa: string | null;
}

interface SocialLink {
  id: string;
  nameEn: string;
  nameFa: string;
  url: string;
  icon: string | null;
  isActive: boolean;
}

export default function Footer() {
  const { t } = useLanguage();
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);

  const footerWarning = t(
    "© 2026 NAZIRA. All rights reserved. Any copying of website content without coordination with management will be legally pursued.",
    "© ۱۴۰۵ نازیرا. تمامی حقوق محفوظ است. هرگونه کپی برداری از محتوای وب‌سایت بدون هماهنگی با مدیریت، پیگرد قانونی خواهد داشت."
  );

  useEffect(() => {
    const loadFooterData = async () => {
      try {
        const [settingsResponse, linksResponse] = await Promise.all([
          fetch("/api/contact-settings"),
          fetch("/api/social-links"),
        ]);

        if (settingsResponse.ok) {
          const settingsData = await settingsResponse.json();
          setContactSettings(settingsData);
        }

        if (linksResponse.ok) {
          const linksData = await linksResponse.json();
          setSocialLinks(Array.isArray(linksData.links) ? linksData.links : []);
        }
      } catch (error) {
        console.error("Error loading footer data:", error);
      }
    };

    loadFooterData();
  }, []);

  const hasContactSocial = Boolean(
    contactSettings?.telegram || contactSettings?.instagram || contactSettings?.whatsapp
  );

  const getSocialIcon = (url: string, iconName?: string | null) => {
    if (/instagram/i.test(iconName || "") || /instagram/i.test(url)) return FaInstagram;
    if (/telegram/i.test(iconName || "") || /t\.me|telegram/i.test(url)) return FaTelegram;
    if (/whatsapp/i.test(iconName || "") || /wa\.me|whatsapp/i.test(url)) return FaWhatsapp;
    return FaLink;
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.linksSection}>
          <ul className={styles.links}>
            <li>
              <Link href="/" className={styles.link}>{t("Home", "صفحه‌ی اصلی")}</Link>
            </li>
            <li>
              <Link href="/about" className={styles.link}>{t("About", "درباره‌ی نازیرا")}</Link>
            </li>
            <li>
              <Link href="/instructions" className={styles.link}>{t("Instructions", "آموزش")}</Link>
            </li>
            <li>
              <Link href="/products" className={styles.link}>{t("Products", "محصولات")}</Link>
            </li>
            <li>
              <Link href="/how-to-use/how-to-use-products-1" className={styles.link}>{t("How to Use", "طرز استفاده از محصولات")}</Link>
            </li>
            <li>
              <Link href="/contact" className={styles.link}>{t("Contact", "تماس")}</Link>
            </li>
            <li>
              <Link href="/terms" className={styles.link}>{t("Terms", "شرایط و قوانین")}</Link>
            </li>
            <li>
              <Link href="/privacy" className={styles.link}>{t("Privacy", "حریم خصوصی")}</Link>
            </li>
          </ul>
          <div className={`${styles.footerText} ${styles.desktopOnly}`}>
            <p className={styles.warningText}>{footerWarning}</p>
          </div>
        </div>

        <div className={styles.trustSeal}>
          <a
            target="_blank"
            href="https://trustseal.enamad.ir/?id=742668&Code=pRI1sk00kHEJYOtFaidokVRnzK0PY2JZ"
          >
            <img
              src="https://trustseal.enamad.ir/logo.aspx?id=742668&Code=pRI1sk00kHEJYOtFaidokVRnzK0PY2JZ"
              alt=""
              style={{ cursor: "pointer" }}
              data-code="pRI1sk00kHEJYOtFaidokVRnzK0PY2JZ"
            />
          </a>
        </div>

        <div className={styles.socialSection}>
          <div className={styles.social}>
            {hasContactSocial ? (
              <>
                {contactSettings?.telegram && (
                  <a 
                    href={contactSettings.telegram.startsWith("http") ? contactSettings.telegram : `https://t.me/${contactSettings.telegram.replace(/^@/, "")}`}
                    className={styles.socialIcon} 
                    aria-label="Telegram"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaTelegram />
                  </a>
                )}
                {contactSettings?.instagram && (
                  <a 
                    href={contactSettings.instagram.startsWith("http") ? contactSettings.instagram : `https://instagram.com/${contactSettings.instagram.replace(/^@/, "")}`}
                    className={styles.socialIcon} 
                    aria-label="Instagram"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaInstagram />
                  </a>
                )}
                {contactSettings?.whatsapp && (
                  <a 
                    href={contactSettings.whatsapp.startsWith("http") ? contactSettings.whatsapp : `https://wa.me/${contactSettings.whatsapp.replace(/[^0-9]/g, "")}`}
                    className={styles.socialIcon} 
                    aria-label="WhatsApp"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaWhatsapp />
                  </a>
                )}
              </>
            ) : (
              socialLinks.map((link) => {
                const Icon = getSocialIcon(link.url, link.icon);
                return (
                  <a
                    key={link.id}
                    href={link.url}
                    className={styles.socialIcon}
                    aria-label={link.nameEn}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon />
                  </a>
                );
              })
            )}
          </div>
          <p className={styles.brandText}>NAZIRA | نازیرا</p>
          <div className={`${styles.footerText} ${styles.mobileOnly}`}>
            <p className={styles.warningText}>{footerWarning}</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
