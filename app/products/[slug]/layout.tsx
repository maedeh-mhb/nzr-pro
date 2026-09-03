// app/products/[slug]/layout.tsx
import { Metadata } from "next";
import { getProductBySlug } from "@/lib/data/productDetails";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir";
  const locale = getRequestLocale();
  const url = `${baseUrl}/${locale}/products/${params.slug}`;
  
  try {
    const product = await getProductBySlug(params.slug);
    if (!product) {
      return {
        title: "Product Not Found | Nazira Organic Soaps",
      };
    }

    const title = (locale === "fa"
      ? product.seoTitle || product.nameFa || product.name
      : product.name || product.seoTitle || product.nameFa) || "محصول نازیرا";
    const description = (locale === "fa"
      ? product.seoDescription || product.shortDescriptionFa || product.shortDescription || product.longDescriptionFa || product.longDescription
      : product.seoDescription || product.shortDescription || product.longDescription || product.shortDescriptionFa) || "محصولات طبیعی و ارگانیک نازیرا با مواد اولیه باکیفیت.";
    const keywords = product.seoKeywords;
    const image = product.ogImage || product.image || "/images/logo.png";

    const metadata = getLocaleMetadata(
      locale,
      `/products/${params.slug}`,
      `${title} | ${locale === "fa" ? "نازیرا" : "Nazira"}`,
      description,
    );

    return {
      ...metadata,
      keywords: keywords ? keywords.split(",").map((k: string) => k.trim()) : ["organic soap", "natural soap", "handmade soap"],
      openGraph: {
        ...metadata.openGraph,
        images: [{ url: image, alt: title }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | ${locale === "fa" ? "نازیرا" : "Nazira"}`,
        description: description || "Handcrafted organic soaps made with natural, high-quality ingredients.",
        images: [image],
      },
    };
  } catch (error) {
    console.error("Error generating product metadata:", error);
    return {
      title: "Nazira Organic Soaps",
    };
  }
}

export default function ProductLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
