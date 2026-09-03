import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "راهنمای مراقبت طبیعی از پوست و مقالات | نازیرا" : "Natural Skincare Guides & Articles | Nazira";
  const description = locale === "fa"
    ? "راهنماها و مقالات کاربردی نازیرا درباره مراقبت طبیعی از پوست، صابون‌های ارگانیک و خودمراقبتی سالم را بخوانید."
    : "Explore Nazira's practical guides and articles about natural skincare, organic soaps, and healthy self-care.";
  return getLocaleMetadata(locale, "/how-to-use", title, description);
}

export default function HowToUseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
