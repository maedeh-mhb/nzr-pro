import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// Public API to fetch About Us content and meta tags
export async function GET() {
  try {
    // Fetch About Us content and meta tags from settings
    const [contentEnSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_content_en"))
      .limit(1);

    const [contentFaSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_content_fa"))
      .limit(1);

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

    const [faqEnabledSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_faq_enabled"))
      .limit(1);

    const [faqItemsSetting] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "about_us_faq"))
      .limit(1);

    let faqItems = [];
    const faqEnabled = faqEnabledSetting?.value === "true";
    if (faqEnabled && faqItemsSetting?.value) {
      try {
        faqItems = JSON.parse(faqItemsSetting.value);
      } catch (error) {
        console.error("Error parsing FAQ items:", error);
        faqItems = [];
      }
    }

    return NextResponse.json({
      contentEn: contentEnSetting?.value || "",
      contentFa: contentFaSetting?.value || "",
      metaTitleEn: metaTitleEnSetting?.value || "",
      metaTitleFa: metaTitleFaSetting?.value || "",
      metaDescriptionEn: metaDescriptionEnSetting?.value || "",
      metaDescriptionFa: metaDescriptionFaSetting?.value || "",
      metaImageUrl: metaImageUrlSetting?.value || "",
      faqEnabled: faqEnabled,
      faqItems: faqItems,
    });
  } catch (error) {
    console.error("Error fetching About Us content:", error);
    return NextResponse.json(
      { error: "Failed to fetch About Us content" },
      { status: 500 }
    );
  }
}

