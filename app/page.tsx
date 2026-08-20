"use client";


import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import { renderIcon } from "@/lib/utils/iconRenderer";
import heroStyles from "@/styles/components/_hero.module.scss";
import categoryStyles from "@/styles/components/_categories.module.scss";
import productStyles from "@/styles/components/_products.module.scss";
import ProductCard from "@/components/products/ProductCard";
import MidPageBanner from "@/components/MidPageBanner";

interface HeroSettings {
  titleEn: string;
  titleFa: string;
  descriptionEn: string;
  descriptionFa: string;
  buttonTextEn: string;
  buttonTextFa: string;
  buttonLink: string;
  backgroundImageUrl: string | null;
  isEnabled: boolean;
}

interface Category {
  id: string;
  name: string;
  nameFa: string | null;
  description: string | null;
  descriptionFa: string | null;
  icon: string | null;
  order: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  price: string;
  image: string | null;
  images?: string[] | null;
  quantity: number | null;
  badge: string | null;
  productType: "economic" | "featured" | null;
  slug: string | null;
  category: string | null;
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
}

export default function HomePage() {
  const { t, language } = useLanguage();
  const [heroSettings, setHeroSettings] = useState<HeroSettings | null>(null);
  const [isLoadingHero, setIsLoadingHero] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoadingFeaturedProducts, setIsLoadingFeaturedProducts] = useState(true);
  const [noteContent, setNoteContent] = useState<string | null>(null);

  useEffect(() => {
    const loadHeroSettings = async () => {
      try {
        // Strong no-cache + timestamp busting to force fresh fetch every time
        const response = await fetch(`/api/hero-settings?_=${Date.now()}`, {
          cache: 'no-store',                      // Prevent browser from using cache
          next: { revalidate: 0 },                // Next.js hint (even in client fetch)
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setHeroSettings(data);
        } else {
          console.warn("Hero settings fetch failed with status:", response.status);
        }
      } catch (error) {
        console.error("Error loading hero settings:", error);
      } finally {
        setIsLoadingHero(false);
      }
    };

    const loadCategories = async () => {
      setIsLoadingCategories(true);
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch (error) {
        console.error("Error loading categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    const loadFeaturedProducts = async () => {
      setIsLoadingFeaturedProducts(true);
      try {
        const response = await fetch("/api/products?productType=featured&limit=8");
        if (response.ok) {
          const data = await response.json();
          setFeaturedProducts(data.data || []);
        }
      } catch (error) {
        console.error("Error loading featured products:", error);
      } finally {
        setIsLoadingFeaturedProducts(false);
      }
    };

    loadHeroSettings();
    loadCategories();
    loadFeaturedProducts();

    // Load home note
    fetch(`/api/home-note?_=${Date.now()}`, { cache: "no-store" })
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data?.isEnabled && (data.contentEn || data.contentFa)) {
          setNoteContent(language === "fa" ? data.contentFa : data.contentEn);
        }
      })
      .catch(() => {});
  }, []);


  // Don't render hero if disabled or still loading
  if (isLoadingHero) {
    return (
      <>
        <Navbar />
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: "16px",
        }}>
          <div style={{
            width: "48px",
            height: "48px",
            border: "4px solid rgba(0,0,0,0.08)",
            borderTopColor: "#2d5016",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  // Hero section values
  const heroTitle = heroSettings ? (language === "fa" ? heroSettings.titleFa : heroSettings.titleEn) : "";
  const heroDescription = heroSettings ? (language === "fa" ? heroSettings.descriptionFa : heroSettings.descriptionEn) : "";
  const heroButtonText = heroSettings ? (language === "fa" ? heroSettings.buttonTextFa : heroSettings.buttonTextEn) : "";

  // Apply background image if provided
  const heroSectionStyle: React.CSSProperties & { "--hero-bg-image"?: string } = {};
  if (heroSettings?.backgroundImageUrl) {
    heroSectionStyle["--hero-bg-image"] = `url(${heroSettings.backgroundImageUrl})`;
  }

  return (
    <>
      <Navbar />
      <h1
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        Nazira | نازیرا Organic Soaps & Natural Skincare
      </h1>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            "name": "Nazira",
            "alternateName": "نازیرا",
            "url": "https://www.nazira.ir",
            "description": "Handcrafted organic soaps and natural skincare products",
            "logo": "https://www.nazira.ir/favicon.ico"
          }),
        }}
      />

      {heroSettings?.isEnabled && (
        <section
          className={heroStyles.hero}
          style={heroSectionStyle}
          data-has-bg-image={heroSettings.backgroundImageUrl ? "true" : "false"}
        >
          <div className={heroStyles.heroGrid}>
            <div className={heroStyles.content}>
              <h2 className={heroStyles.title}>{heroTitle}</h2>
              <p className={heroStyles.description}>{heroDescription}</p>
              <Link href={heroSettings.buttonLink} className={heroStyles.button}>
                {heroButtonText}
              </Link>
            </div>
            <div className={heroStyles.emptyCol}></div>
          </div>
        </section>
      )}

      {noteContent && (
        <div style={{
          background: "#367260",
          width: "100%",
          padding: "2rem 5%",
        }}>
          <section style={{
            maxWidth: "900px",
            margin: "0 auto",
            textAlign: "center",
            color: "#fff",
          }}>
            <div
              dangerouslySetInnerHTML={{ __html: noteContent }}
              style={{ lineHeight: 1.8, color: "#fff" }}
            />
          </section>
        </div>
      )}

      <section className={categoryStyles.categories}>
        <h2 className={categoryStyles.sectionTitle}>
          {t("Our Categories", "دسته بندی های ما")}
        </h2>
        {isLoadingCategories ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>{t("Loading categories...", "در حال بارگذاری دسته‌بندی‌ها...")}</p>
          </div>
        ) : categories.length > 0 ? (
          <div className={categoryStyles.grid}>
            {categories.map((category) => {
              const displayName = language === "fa" && category.nameFa ? category.nameFa : category.name;
              return (
                <Link key={category.id} href={`/products?category=${category.id}`} className={categoryStyles.card}>
                  <div className={categoryStyles.icon}>
                    {renderIcon(category.icon, undefined, { width: "4rem", height: "4rem", color: "inherit" })}
                  </div>
                  <h3 className={categoryStyles.title}>{displayName}</h3>
                </Link>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ opacity: 0.6 }}>
              {t("No categories available", "هیچ دسته‌بندی در دسترس نیست")}
            </p>
          </div>
        )}
      </section>

      <MidPageBanner />

      {/* Featured Products Section */}
      <section className={`${productStyles.products} ${productStyles.featuredProductsSection}`}>
        <h2 className={productStyles.sectionTitle}>
          {t("Featured Products", "محصولات ویژه")}
        </h2>
        {isLoadingFeaturedProducts ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p>{t("Loading featured products...", "در حال بارگذاری محصولات ویژه...")}</p>
          </div>
        ) : featuredProducts.length > 0 ? (
          <div className={`${productStyles.productsGrid} ${productStyles.featuredProductsGrid}`} style={{ justifyContent: "center", margin: "0 auto" }}>
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                nameFa={product.nameFa}
                shortDescription={product.shortDescription}
                shortDescriptionFa={product.shortDescriptionFa}
                price={product.price}
                image={product.image}
                images={product.images}
                quantity={product.quantity}
                badge={product.badge}
                productType={product.productType}
                slug={product.slug}
                category={product.category}
                minOrderQuantity={product.minOrderQuantity}
                maxOrderQuantity={product.maxOrderQuantity}
                alignPriceAtBottom={true}
              />
            ))}
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ opacity: 0.6 }}>
              {t("No featured products available", "هیچ محصول ویژه‌ای در دسترس نیست")}
            </p>
          </div>
        )}
      </section>

      <Footer />
      <BottomBar />
    </>
  );
}
