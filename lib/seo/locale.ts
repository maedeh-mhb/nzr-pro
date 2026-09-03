import type { Metadata } from "next";
import { headers } from "next/headers";

export const DEFAULT_LOCALE = "fa" as const;
export const SUPPORTED_LOCALES = ["fa", "en"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export function getRequestLocale(): Locale {
  const locale = headers().get("x-nazira-locale");
  return locale === "en" ? "en" : DEFAULT_LOCALE;
}

export function getLocalePath(path: string, locale: Locale): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const withoutLocale = normalizedPath.replace(/^\/(?:fa|en)(?=\/|$)/, "") || "/";
  return `/${locale}${withoutLocale === "/" ? "" : withoutLocale}`;
}

export function getLocaleMetadata(
  locale: Locale,
  path: string,
  title: string,
  description: string,
  type: "website" | "article" = "website"
): Metadata {
  const faUrl = getLocalePath(path, "fa");
  const enUrl = getLocalePath(path, "en");
  const canonical = locale === "fa" ? faUrl : enUrl;

  return {
    title,
    description,
    alternates: {
      canonical,
      languages: {
        fa: faUrl,
        en: enUrl,
        "x-default": faUrl,
      },
    },
    openGraph: {
      type,
      url: canonical,
      title,
      description,
    },
  };
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir";
}

export function getAbsoluteUrl(value: string, baseUrl = getSiteUrl()): string {
  return value.startsWith("http") ? value : `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`;
}