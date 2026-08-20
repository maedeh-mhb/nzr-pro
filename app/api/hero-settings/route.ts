import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { heroSettings } from "@/lib/db/schema";

// IMPORTANT: This line forces the route to be dynamic → disables caching completely
export const dynamic = 'force-dynamic';

// Get hero settings (public endpoint)
export async function GET() {
  try {
    // Get the first (and should be only) hero settings record
    const settings = await db.select().from(heroSettings).limit(1);

    let heroData;

    if (settings.length === 0) {
      // Return default values if no settings exist
      heroData = {
        titleEn: "Welcome to Our World",
        titleFa: "به دنیای ما خوش آمدید",
        descriptionEn: "Discover amazing products and experiences crafted just for you",
        descriptionFa: "محصولات شگفت انگیز و تجربیات ساخته شده برای شما را کشف کنید",
        buttonTextEn: "Explore Now",
        buttonTextFa: "اکنون کاوش کنید",
        buttonLink: "/products",
        backgroundImageUrl: null,
        isEnabled: true,
      };
    } else {
      const setting = settings[0];

      // Only return settings if hero section is enabled
      if (!setting.isEnabled) {
        heroData = {
          isEnabled: false,
        };
      } else {
        heroData = {
          titleEn: setting.titleEn || "Welcome to Our World",
          titleFa: setting.titleFa || "به دنیای ما خوش آمدید",
          descriptionEn: setting.descriptionEn || "Discover amazing products and experiences crafted just for you",
          descriptionFa: setting.descriptionFa || "محصولات شگفت انگیز و تجربیات ساخته شده برای شما را کشف کنید",
          buttonTextEn: setting.buttonTextEn || "Explore Now",
          buttonTextFa: setting.buttonTextFa || "اکنون کاوش کنید",
          buttonLink: setting.buttonLink || "/products",
          backgroundImageUrl: setting.backgroundImageUrl,
          isEnabled: setting.isEnabled,
        };
      }
    }

    // Return response with strong no-cache headers
    return NextResponse.json(heroData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });

  } catch (error) {
    console.error("Error fetching hero settings:", error);

    // Return default values on error – also with no-cache headers
    return NextResponse.json(
      {
        titleEn: "Welcome to Our World",
        titleFa: "به دنیای ما خوش آمدید",
        descriptionEn: "Discover amazing products and experiences crafted just for you",
        descriptionFa: "محصولات شگفت انگیز و تجربیات ساخته شده برای شما را کشف کنید",
        buttonTextEn: "Explore Now",
        buttonTextFa: "اکنون کاوش کنید",
        buttonLink: "/products",
        backgroundImageUrl: null,
        isEnabled: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  }
}