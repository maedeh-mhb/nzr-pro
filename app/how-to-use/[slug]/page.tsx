import { notFound } from "next/navigation";
import { getArticleBySlug } from "@/lib/data/articleDetails";
import { getAbsoluteUrl, getRequestLocale, getSiteUrl } from "@/lib/seo/locale";
import ArticleDetailClient from "./ArticleDetailClient";

export default async function ArticlePage({
  params,
}: {
  params: { slug: string };
}) {
  const article = await getArticleBySlug(params.slug);

  if (!article) notFound();

  const locale = getRequestLocale();
  const baseUrl = getSiteUrl();
  const articleUrl = `${baseUrl}/${locale}/how-to-use/${encodeURIComponent(params.slug)}`;
  const articleTitle = locale === "fa" ? article.titleFa || article.title : article.title;
  const articleDescription = locale === "fa"
    ? article.seoDescription || article.excerptFa || article.excerpt || article.contentFa?.replace(/<[^>]*>/g, "").slice(0, 160)
    : article.seoDescription || article.excerpt || article.content?.replace(/<[^>]*>/g, "").slice(0, 160);
  const articleImage = article.ogImage || article.image || "/images/logo.png";
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: locale === "fa" ? "صفحه اصلی" : "Home", item: `${baseUrl}/${locale}` },
    { "@type": "ListItem", position: 2, name: locale === "fa" ? "راهنماها و مقالات" : "Guides and Articles", item: `${baseUrl}/${locale}/how-to-use` },
    { "@type": "ListItem", position: 3, name: articleTitle, item: articleUrl },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "BlogPosting",
                "@id": `${articleUrl}#article`,
                headline: articleTitle,
                description: articleDescription || undefined,
                image: [getAbsoluteUrl(articleImage, baseUrl)],
                author: { "@type": "Person", name: article.authorName },
                datePublished: (article.publishDate || article.createdAt)?.toISOString(),
                dateModified: article.updatedAt?.toISOString(),
                mainEntityOfPage: { "@type": "WebPage", "@id": articleUrl },
                publisher: {
                  "@type": "Organization",
                  name: "Nazira",
                  url: baseUrl,
                  logo: { "@type": "ImageObject", url: `${baseUrl}/images/logo.png` },
                },
              },
              {
                "@type": "BreadcrumbList",
                itemListElement: breadcrumbItems,
              },
            ],
          }),
        }}
      />
      <ArticleDetailClient initialArticle={article} />
    </>
  );
}
