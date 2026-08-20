import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
export const dynamic = "force-dynamic";

// GET: Fetch About Us content
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    if (faqItemsSetting?.value) {
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
      faqEnabled: faqEnabledSetting?.value === "true",
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

// POST: Update About Us content
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "admin" && userRole !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { 
      contentEn, 
      contentFa, 
      metaTitleEn, 
      metaTitleFa, 
      metaDescriptionEn, 
      metaDescriptionFa, 
      metaImageUrl,
      faqEnabled,
      faqItems
    } = body;

    // Helper function to update or insert a setting
    const updateOrInsertSetting = async (key: string, value: string) => {
      const [existing] = await db
        .select()
        .from(settings)
        .where(eq(settings.key, key))
        .limit(1);

      if (existing) {
        await db
          .update(settings)
          .set({
            value: value || "",
            updatedAt: new Date(),
          })
          .where(eq(settings.key, key));
      } else {
        await db.insert(settings).values({
          key,
          value: value || "",
        });
      }
    };

    // Update or insert all settings
    await updateOrInsertSetting("about_us_content_en", contentEn);
    await updateOrInsertSetting("about_us_content_fa", contentFa);
    await updateOrInsertSetting("about_us_meta_title_en", metaTitleEn);
    await updateOrInsertSetting("about_us_meta_title_fa", metaTitleFa);
    await updateOrInsertSetting("about_us_meta_description_en", metaDescriptionEn);
    await updateOrInsertSetting("about_us_meta_description_fa", metaDescriptionFa);
    await updateOrInsertSetting("about_us_meta_image_url", metaImageUrl);
    await updateOrInsertSetting("about_us_faq_enabled", faqEnabled ? "true" : "false");
    await updateOrInsertSetting("about_us_faq", JSON.stringify(faqItems || []));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating About Us content:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to update About Us content", details: errorMessage },
      { status: 500 }
    );
  }
}

