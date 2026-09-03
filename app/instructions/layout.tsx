import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "راهنمای استفاده از محصولات | نازیرا" : "Product Instructions | Nazira";
  const description = locale === "fa"
    ? "روش استفاده از صابون‌های ارگانیک و محصولات مراقبت طبیعی پوست نازیرا را با راهنماهای کاربردی یاد بگیرید."
    : "Learn how to use Nazira's organic soaps and natural skincare products with practical product instructions.";
  return getLocaleMetadata(locale, "/instructions", title, description);
}

export default function InstructionsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
