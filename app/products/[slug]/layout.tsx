// app/products/[slug]/layout.tsx
import { Metadata } from "next";

type Props = {
  params: { slug: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const decodedSlug = decodeURIComponent(params.slug);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nazira.ir";
  const url = `${baseUrl}/products/${params.slug}`;
  
  try {
    const response = await fetch(`${baseUrl}/api/products/${encodeURIComponent(decodedSlug)}`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return {
        title: "Product Not Found | Nazira Organic Soaps",
      };
    }

    const data = await response.json();
    const product = data.product;

    if (!product) {
      return {
        title: "Product Not Found | Nazira Organic Soaps",
      };
    }

    const title = product.seoTitle || product.name;
    const description = product.seoDescription || product.shortDescription;
    const keywords = product.seoKeywords;
    const image = product.ogImage || product.image || "/images/logo.png";

    return {
      title: `${title} | Nazira Organic Soaps`,
      description: description || "Shop our premium organic soaps at Nazira. Crafted naturally, handmade with love.",
      keywords: keywords ? keywords.split(",").map((k: string) => k.trim()) : ["organic soap", "natural soap", "handmade soap"],
      alternates: {
        canonical: url,
      },
      openGraph: {
        title: title,
        description: description || "Shop our premium organic soaps at Nazira.",
        images: [image],
        type: "website",
        url: url,
      },
      twitter: {
        card: "summary_large_image",
        title: title,
        description: description || "Shop our premium organic soaps at Nazira.",
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
