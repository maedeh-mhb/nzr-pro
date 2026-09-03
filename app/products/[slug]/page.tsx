import { notFound } from "next/navigation";
import { getProductBySlug } from "@/lib/data/productDetails";
import { getAbsoluteUrl, getRequestLocale, getSiteUrl } from "@/lib/seo/locale";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProductBySlug(params.slug);

  if (!product) notFound();

  const locale = getRequestLocale();
  const baseUrl = getSiteUrl();
  const productUrl = `${baseUrl}/${locale}/products/${encodeURIComponent(params.slug)}`;
  const productImage = product.ogImage || product.image || "/images/logo.png";
  const productName = locale === "fa" ? product.nameFa || product.name : product.name;
  const productDescription = locale === "fa"
    ? product.seoDescription || product.shortDescriptionFa || product.shortDescription || product.longDescriptionFa || product.longDescription
    : product.seoDescription || product.shortDescription || product.longDescription || product.shortDescriptionFa;
  const breadcrumbItems = [
    { "@type": "ListItem", position: 1, name: locale === "fa" ? "صفحه اصلی" : "Home", item: `${baseUrl}/${locale}` },
    { "@type": "ListItem", position: 2, name: locale === "fa" ? "محصولات" : "Products", item: `${baseUrl}/${locale}/products` },
    { "@type": "ListItem", position: 3, name: productName, item: productUrl },
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
                "@type": "Product",
                "@id": `${productUrl}#product`,
                name: productName,
                description: productDescription || undefined,
                image: [getAbsoluteUrl(productImage, baseUrl)],
                sku: product.id,
                brand: { "@type": "Brand", name: "Nazira" },
                url: productUrl,
                offers: {
                  "@type": "Offer",
                  url: productUrl,
                  priceCurrency: "IRR",
                  price: Number(product.price),
                  availability: product.quantity > 0
                    ? "https://schema.org/InStock"
                    : "https://schema.org/OutOfStock",
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
      <ProductDetailClient initialProduct={product} slug={params.slug} />
    </>
  );
}
