import type { Metadata } from "next";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getAbsoluteUrl, getLocaleMetadata, getRequestLocale, getSiteUrl } from "@/lib/seo/locale";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const locale = getRequestLocale();
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

    const titleEn = (metaTitleEnSetting?.value || "About Nazira").replace("Abiut", "About");
    const titleFa = metaTitleFaSetting?.value || "درباره نازیرا";
    const descriptionEn = metaDescriptionEnSetting?.value || "Learn more about Nazira, our mission, values, and team.";
    const descriptionFa = metaDescriptionFaSetting?.value || "درباره Nazira، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید.";
    const imageUrl = metaImageUrlSetting?.value || "";

    const baseUrl = getSiteUrl();
    const title = locale === "fa" ? titleFa : titleEn;
    const description = locale === "fa" ? descriptionFa : descriptionEn;
    const metaImage = getAbsoluteUrl(imageUrl || "/images/logo.png", baseUrl);
    const metadata = getLocaleMetadata(locale, "/about", title, description);

    return {
      ...metadata,
      openGraph: {
        ...metadata.openGraph,
        type: "website",
        title,
        description,
        images: [
          {
            url: metaImage,
            width: 1200,
            height: 630,
            alt: title,
          },
        ],
        locale: locale === "fa" ? "fa_IR" : "en_US",
        alternateLocale: [locale === "fa" ? "en_US" : "fa_IR"],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [metaImage],
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    // Return default metadata on error
    return {
      title: "درباره نازیرا",
      description: "درباره نازیرا، ماموریت، ارزش‌ها و تیم ما بیشتر بدانید.",
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

