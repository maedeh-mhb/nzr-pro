import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "شرایط استفاده از خدمات | نازیرا" : "Terms of Service | Nazira";
  const description = locale === "fa"
    ? "شرایط استفاده از خدمات نازیرا شامل اطلاعات حساب کاربری، سفارش‌ها، پرداخت، ارسال و استفاده از محصولات را بخوانید."
    : "Read Nazira's terms of service for information about accounts, orders, payments, shipping, and product use.";
  return getLocaleMetadata(locale, "/terms", title, description);
}

export default function TermsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
