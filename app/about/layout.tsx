import { Metadata } from "next";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function generateMetadata(): Promise<Metadata> {
  try {
    // Fetch About Us meta tags from settings
    const [metaTitleEnSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_meta_title_en"))
      .limit(1);

    const [metaTitleFaSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_meta_title_fa"))
      .limit(1);

    const [metaDescriptionEnSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_meta_description_en"))
      .limit(1);

    const [metaDescriptionFaSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_meta_description_fa"))
      .limit(1);

    const [metaImageUrlSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_meta_image_url"))
      .limit(1);

    const titleEn = (metaTitleEnSetting?.value || "About Us - Nazira").replace("Abiut", "About");
    const titleFa = metaTitleFaSetting?.value || "درباره ما - Nazira";
    const descriptionEn = metaDescriptionEnSetting?.value || "Learn more about Nazira, our mission, values, and team.";
    const descriptionFa = metaDescriptionFaSetting?.value || "درباره Nazira، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید.";
    const imageUrl = metaImageUrlSetting?.value || "";

    // Get base URL (you might want to use an environment variable)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const pageUrl = `${baseUrl}/about`;
    const metaImage = imageUrl
      ? (imageUrl.startsWith("http") ? imageUrl : `${baseUrl}${imageUrl}`)
      : `${baseUrl}/images/logo.png`;

    return {
      title: titleEn, // Default to English, will be overridden by client-side if needed
      description: descriptionEn,
      alternates: {
        canonical: pageUrl,
        languages: {
          "en": pageUrl,
          "fa": pageUrl,
          "x-default": pageUrl,
        },
      },
      openGraph: {
        type: "website",
        url: pageUrl,
        title: titleEn,
        description: descriptionEn,
        images: [
          {
            url: metaImage,
            width: 1200,
            height: 630,
            alt: titleEn,
          },
        ],
        locale: "en_US",
        alternateLocale: ["fa_IR"],
      },
      twitter: {
        card: "summary_large_image",
        title: titleEn,
        description: descriptionEn,
        images: [metaImage],
      },
      other: {
        "og:title:fa": titleFa,
        "og:description:fa": descriptionFa,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    // Return default metadata on error
    return {
      title: "About Us - Nazira",
      description: "Learn more about Nazira, our mission, values, and team.",
    };
  }
}

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

