import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "تماس با نازیرا | صابون‌های ارگانیک و مراقبت طبیعی پوست" : "Contact Nazira | Organic Soaps & Natural Skincare";
  const description = locale === "fa"
    ? "برای پرسش درباره صابون‌های ارگانیک دست‌ساز، محصولات مراقبت طبیعی پوست، سفارش‌ها و پشتیبانی با نازیرا تماس بگیرید."
    : "Contact Nazira for questions about our handcrafted organic soaps, natural skincare products, orders, and support.";
  return getLocaleMetadata(locale, "/contact", title, description);
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
