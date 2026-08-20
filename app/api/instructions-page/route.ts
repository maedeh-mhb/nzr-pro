import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { instructionsPage } from "@/lib/db/schema";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await db.select().from(instructionsPage).limit(1);

    let pageData;

    if (settings.length === 0) {
      pageData = {
        isEnabled: false,
      };
    } else {
      const setting = settings[0];

      if (!setting.isEnabled) {
        pageData = {
          isEnabled: false,
        };
      } else {
        pageData = {
          titleEn: setting.titleEn,
          titleFa: setting.titleFa,
          contentEn: setting.contentEn,
          contentFa: setting.contentFa,
          audioUrl: setting.audioUrl,
          isEnabled: setting.isEnabled,
        };
      }
    }

    return NextResponse.json(pageData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    console.error("Error fetching instructions page:", error);
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
