import type { Metadata } from "next";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export function generateMetadata(): Metadata {
  const locale = getRequestLocale();
  const title = locale === "fa" ? "خرید صابون‌های ارگانیک و محصولات مراقبت پوست | نازیرا" : "Organic Soaps & Natural Skincare | Nazira";
  const description = locale === "fa"
    ? "صابون‌های ارگانیک دست‌ساز و محصولات مراقبت طبیعی پوست نازیرا را با مواد اولیه باکیفیت خریداری کنید."
    : "Shop Nazira's handcrafted organic soaps and natural skincare products made with premium ingredients.";
  return getLocaleMetadata(locale, "/products", title, description);
}

export default function ProductsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
