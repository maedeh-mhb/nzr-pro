import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "سیاست حفظ حریم خصوصی | نازیرا" : "Privacy Policy | Nazira";
  const description = locale === "fa"
    ? "سیاست حفظ حریم خصوصی نازیرا درباره نحوه جمع‌آوری، استفاده و حفاظت از اطلاعات مشتریان را بخوانید."
    : "Read Nazira's privacy policy to learn how we collect, use, and protect customer information.";
  return getLocaleMetadata(locale, "/privacy", title, description);
}

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
