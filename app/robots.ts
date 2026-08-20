import type { MetadataRoute } from "next";

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://nazira.ir";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/admin",
          "/dashboard",
          "/account",
          "/profile",
          "/settings",
          "/login",
          "/register",
          "/auth",
          "/cart",
          "/checkout",
          "/orders",
          "/api",
          "/search",
          "/wishlist",
          "/preview",
          "/draft",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}