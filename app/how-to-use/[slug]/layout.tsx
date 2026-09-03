import type { Metadata } from "next";
import { getArticleBySlug } from "@/lib/data/articleDetails";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir";
  const locale = getRequestLocale();
  const url = `${baseUrl}/${locale}/how-to-use/${params.slug}`;
  const article = await getArticleBySlug(params.slug);

  if (!article) {
    return { title: "Article Not Found | Nazira" };
  }

  const title = (locale === "fa"
    ? article.seoTitle || article.titleFa || article.title
    : article.title || article.seoTitle || article.titleFa) || "مقاله نازیرا";
  const description = (locale === "fa"
    ? article.seoDescription || article.excerptFa || article.excerpt || article.contentFa?.replace(/<[^>]*>/g, "").slice(0, 160) || article.content?.replace(/<[^>]*>/g, "").slice(0, 160)
    : article.seoDescription || article.excerpt || article.content?.replace(/<[^>]*>/g, "").slice(0, 160) || article.excerptFa) || "راهنماها و مقالات کاربردی نازیرا درباره مراقبت طبیعی از پوست.";
  const image = article.ogImage || article.image || "/images/logo.png";
  const keywords = article.seoKeywords?.split(",").map((keyword) => keyword.trim()).filter(Boolean);

  const metadata = getLocaleMetadata(locale, `/how-to-use/${params.slug}`, `${title} | ${locale === "fa" ? "نازیرا" : "Nazira"}`, description);

  return {
    ...metadata,
    keywords,
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: image, alt: title }],
      publishedTime: (article.publishDate || article.createdAt)?.toISOString(),
      modifiedTime: article.updatedAt?.toISOString(),
      authors: [article.authorName],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return children;
}