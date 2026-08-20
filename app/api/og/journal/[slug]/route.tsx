import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const slug = params.slug;
    const { searchParams } = new URL(request.url);

    // Get post data from query params or fetch from API
    const title = searchParams.get("title") || "Journal Post";
    const titleFa = searchParams.get("titleFa");
    const excerpt = searchParams.get("excerpt") || "";
    const image = searchParams.get("image");

    // Use the provided language or default to English
    const lang = searchParams.get("lang") || "en";
    const displayTitle = lang === "fa" && titleFa ? titleFa : title;

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#fff",
            backgroundImage: image
              ? `url(${image})`
              : "linear-gradient(to bottom, #367260, #2d5a4d)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            position: "relative",
          }}
        >
          {/* Overlay for better text readability */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.4)",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "60px",
              textAlign: "center",
              zIndex: 1,
              maxWidth: "1200px",
            }}
          >
            <h1
              style={{
                fontSize: 72,
                fontWeight: 700,
                color: "#fff",
                marginBottom: 24,
                lineHeight: 1.2,
                textShadow: "0 2px 10px rgba(0,0,0,0.3)",
              }}
            >
              {displayTitle}
            </h1>
            {excerpt && (
              <p
                style={{
                  fontSize: 32,
                  color: "#f0f0f0",
                  lineHeight: 1.4,
                  textShadow: "0 1px 5px rgba(0,0,0,0.3)",
                }}
              >
                {excerpt.length > 150 ? excerpt.substring(0, 150) + "..." : excerpt}
              </p>
            )}
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error: any) {
    console.error("Error generating OG image:", error);
    return new Response(`Failed to generate image: ${error.message}`, {
      status: 500,
    });
  }
}

