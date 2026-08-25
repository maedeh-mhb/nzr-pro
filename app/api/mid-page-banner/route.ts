import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { midPageBanner } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.select().from(midPageBanner).limit(1);

    let bannerData;

    if (settings.length === 0) {
      bannerData = {
        isEnabled: false,
      };
    } else {
      const setting = settings[0];

      if (!setting.isEnabled) {
        bannerData = {
          isEnabled: false,
        };
      } else {
        bannerData = {
          titleEn: setting.titleEn,
          titleFa: setting.titleFa,
          descriptionEn: setting.descriptionEn,
          descriptionFa: setting.descriptionFa,
          buttonTextEn: setting.buttonTextEn,
          buttonTextFa: setting.buttonTextFa,
          buttonLink: setting.buttonLink || "/instructions",
          button2TextEn: setting.button2TextEn,
          button2TextFa: setting.button2TextFa,
          button2Link: setting.button2Link || "/instructions",
          backgroundImageUrl: setting.backgroundImageUrl,
          isEnabled: setting.isEnabled,
        };
      }
    }

    return NextResponse.json(bannerData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Error fetching mid-page banner:", error);
    return NextResponse.json(
      { isEnabled: false },
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
