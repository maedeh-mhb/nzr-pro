import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.scss";
import { Toaster } from "react-hot-toast";
import { Providers } from "./providers";
import { LanguageProvider } from "@/lib/utils/language";
import CartPanel from "@/components/cart/CartPanel";
import FontLoader from "@/components/FontLoader";
import { getLocaleMetadata, getRequestLocale } from "@/lib/seo/locale";

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = getRequestLocale();
  const title = locale === "fa"
    ? "صابون‌های ارگانیک و محصولات مراقبت طبیعی پوست | نازیرا"
    : "Nazira Organic Soaps and Natural Skincare";
  const description = locale === "fa"
    ? "نازیرا ارائه‌دهنده صابون‌های ارگانیک دست‌ساز و محصولات مراقبت طبیعی پوست با مواد اولیه باکیفیت است."
    : "Nazira offers handcrafted organic soaps and natural skincare products made with premium ingredients.";

  return {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.nazira.ir"),
  ...getLocaleMetadata(locale, "/", title, description),
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-icon-57x57.png", sizes: "57x57", type: "image/png" },
      { url: "/apple-icon-60x60.png", sizes: "60x60", type: "image/png" },
      { url: "/apple-icon-72x72.png", sizes: "72x72", type: "image/png" },
      { url: "/apple-icon-76x76.png", sizes: "76x76", type: "image/png" },
      { url: "/apple-icon-114x114.png", sizes: "114x114", type: "image/png" },
      { url: "/apple-icon-120x120.png", sizes: "120x120", type: "image/png" },
      { url: "/apple-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/apple-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-icon-180x180.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "apple-touch-icon-precomposed",
        url: "/apple-icon-precomposed.png",
      },
      {
        rel: "manifest",
        url: "/manifest.json",
      },
      { url: "/ms-icon-70x70.png", sizes: "70x70", type: "image/png" },
      { url: "/ms-icon-144x144.png", sizes: "144x144", type: "image/png" },
      { url: "/ms-icon-150x150.png", sizes: "150x150", type: "image/png" },
      { url: "/ms-icon-310x310.png", sizes: "310x310", type: "image/png" },
    ],
  },
  openGraph: {
    type: "website",
    title,
    description,
    url: "/",
    siteName: "Nazira",
    locale: "fa_IR",
    alternateLocale: ["en_US"],
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "صابون‌های ارگانیک نازیرا",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  };
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fa" dir="rtl">
      <head>
        <meta name="enamad" content="52968384" />
      </head>

      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-7VSHEF707B"
        strategy="afterInteractive"
      />

      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;

          gtag('js', new Date());
          gtag('config', 'G-7VSHEF707B', {
            page_path: window.location.pathname,
          });
        `}
      </Script>

      <body>
        <FontLoader />
        <Providers>
          <LanguageProvider>
            <main className="app-wrapper" role="main">
              {children}
            </main>
            <CartPanel />
            <Toaster
              position="top-center"
              toastOptions={{
                duration: 3000,
                style: {
                  borderRadius: "8px",
                  padding: "12px 16px",
                  fontSize: "14px",
                  fontWeight: 500,
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: "#10b981",
                    secondary: "#ffffff",
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: "#ef4444",
                    secondary: "#ffffff",
                  },
                },
                loading: {
                  duration: Infinity,
                },
              }}
            />
          </LanguageProvider>
        </Providers>
      </body>
    </html>
  );
}