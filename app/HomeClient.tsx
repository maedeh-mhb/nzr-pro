"use client";


import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import { useLanguage } from "@/lib/utils/language";
import ArticlesSlider from "@/components/ArticlesSlider";
import CategoriesRibbon from "@/components/CategoriesRibbon";
import heroStyles from "@/styles/components/_hero.module.scss";
import productStyles from "@/styles/components/_products.module.scss";
import ProductCard from "@/components/products/ProductCard";
import ProductAvailabilitySection from "@/components/ProductAvailabilitySection";
import type {
  HomeArticle,
  HomeCategory,
  HomeHero,
  HomeNoteData,
  HomeProduct,
} from "@/lib/services/homeData";

interface HomeClientProps {
  hero: HomeHero;
  featuredProducts: HomeProduct[];
  articles: HomeArticle[];
  categories: HomeCategory[];
  note: HomeNoteData | null;
}

export default function HomeClient({ hero, featuredProducts, articles, categories, note }: HomeClientProps) {
  const { t, language } = useLanguage();
  const [featuredSlidesPerView, setFeaturedSlidesPerView] = useState(1.2);
  const featuredCloneCount = Math.ceil(featuredSlidesPerView);
  const [featuredSlideIndex, setFeaturedSlideIndex] = useState(featuredCloneCount);
  const [isFeaturedSliderPaused, setIsFeaturedSliderPaused] = useState(false);
  const [isFeaturedLoopResetting, setIsFeaturedLoopResetting] = useState(false);
  const featuredTouchStart = useRef<{ x: number; y: number } | null>(null);
  const featuredSlideCount = featuredProducts.length;
  const featuredTrackSlideCount = featuredSlideCount + featuredCloneCount * 2;
  const featuredTrackSlides =
    featuredSlideCount > 0
      ? Array.from(
          { length: featuredTrackSlideCount },
          (_, index) =>
            ((index - featuredCloneCount) % featuredSlideCount + featuredSlideCount) %
            featuredSlideCount
        )
      : [];

  const moveFeaturedSlide = useCallback(
    (direction: 1 | -1) => {
      setFeaturedSlideIndex((currentIndex) => currentIndex + direction);
    },
    []
  );

  useEffect(() => {
    const updateSlidesPerView = () => {
      if (window.innerWidth >= 1080) {
        setFeaturedSlidesPerView(4);
      } else if (window.innerWidth >= 640) {
        setFeaturedSlidesPerView(2.5);
      } else {
        setFeaturedSlidesPerView(1.2);
      }
    };

    updateSlidesPerView();
    window.addEventListener("resize", updateSlidesPerView);
    return () => window.removeEventListener("resize", updateSlidesPerView);
  }, []);

  useEffect(() => {
    setIsFeaturedLoopResetting(true);
    setFeaturedSlideIndex(featuredCloneCount);
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsFeaturedLoopResetting(false));
    });
  }, [featuredCloneCount]);

  useEffect(() => {
    if (isFeaturedSliderPaused || featuredSlideCount <= 1) return;

    const timer = window.setInterval(() => moveFeaturedSlide(1), 4000);

    return () => window.clearInterval(timer);
  }, [featuredSlideCount, isFeaturedSliderPaused, moveFeaturedSlide]);

  const heroSettings = hero;
  const noteContent = note?.isEnabled
    ? language === "fa"
      ? note.contentFa
      : note.contentEn
    : null;

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
      <Navbar hasMainBanner={Boolean(heroSettings?.isEnabled)} />
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
          data-main-banner
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

      <ProductAvailabilitySection initialData={note} />

      <CategoriesRibbon initialCategories={categories} />

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

      {/* Featured Products Section */}
      <section className={`${productStyles.products} ${productStyles.featuredProductsSection}`}>
        <h2 className={productStyles.sectionTitle}>
          {t("Featured Products", "محصولات ویژه")}
        </h2>
        {featuredProducts.length > 0 ? (
          <div
            className={productStyles.featuredCarouselViewport}
            role="region"
            aria-roledescription={t("carousel", "اسلایدر")}
            dir="ltr"
            onMouseEnter={() => setIsFeaturedSliderPaused(true)}
            onMouseLeave={() => setIsFeaturedSliderPaused(false)}
            onTouchStart={(event) => {
              const touch = event.touches[0];
              featuredTouchStart.current = { x: touch.clientX, y: touch.clientY };
              setIsFeaturedSliderPaused(true);
            }}
            onTouchEnd={(event) => {
              const start = featuredTouchStart.current;
              const touch = event.changedTouches[0];
              featuredTouchStart.current = null;

              if (start && touch) {
                const deltaX = touch.clientX - start.x;
                const deltaY = touch.clientY - start.y;
                if (Math.abs(deltaX) > 40 && Math.abs(deltaX) > Math.abs(deltaY)) {
                  moveFeaturedSlide(deltaX < 0 ? 1 : -1);
                }
              }
              setIsFeaturedSliderPaused(false);
            }}
            onTouchCancel={() => {
              featuredTouchStart.current = null;
              setIsFeaturedSliderPaused(false);
            }}
            onFocusCapture={() => setIsFeaturedSliderPaused(true)}
            onBlurCapture={(event) => {
              const nextTarget = event.relatedTarget;
              if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) {
                setIsFeaturedSliderPaused(false);
              }
            }}
            aria-label={t("Featured products", "محصولات ویژه")}
          >
            <div className={productStyles.featuredCarouselHeader}>
              <Link href="/products" className={productStyles.viewAllProductsButton}>
                {t("View all", "مشاهده همه")}
              </Link>
            </div>
            <div
              className={productStyles.featuredCarouselTrack}
              style={{
                width: `${(featuredTrackSlideCount * 100) / featuredSlidesPerView}%`,
                direction: "ltr",
                transition: isFeaturedLoopResetting ? "none" : undefined,
                transform: `translateX(${
                  featuredSlideIndex *
                  (-100 / featuredTrackSlideCount)
                }%)`,
              }}
              onTransitionEnd={(event) => {
                if (event.target !== event.currentTarget || event.propertyName !== "transform") return;

                const firstOriginalIndex = featuredCloneCount;
                const afterLastOriginalIndex = firstOriginalIndex + featuredSlideCount;
                if (
                  featuredSlideIndex < firstOriginalIndex ||
                  featuredSlideIndex >= afterLastOriginalIndex
                ) {
                  setIsFeaturedLoopResetting(true);
                  setFeaturedSlideIndex(
                    featuredSlideIndex < firstOriginalIndex
                      ? afterLastOriginalIndex - 1
                      : firstOriginalIndex
                  );
                  window.requestAnimationFrame(() => {
                    window.requestAnimationFrame(() => setIsFeaturedLoopResetting(false));
                  });
                }
              }}
            >
              {featuredTrackSlides.map((slideIndex, trackIndex) => {
                const product = featuredProducts[slideIndex];
                if (!product) return null;

                return (
                  <div
                    key={`${trackIndex}-${product.id}`}
                    className={productStyles.featuredCarouselSlide}
                    style={{
                      flexBasis: `${100 / featuredTrackSlideCount}%`,
                      direction: language === "fa" ? "rtl" : "ltr",
                    }}
                  >
                    <ProductCard
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
                      slug={product.slug}
                      category={product.category}
                      minOrderQuantity={product.minOrderQuantity}
                      maxOrderQuantity={product.maxOrderQuantity}
                      alignPriceAtBottom={true}
                      flushImage
                      hideActions
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ opacity: 0.6 }}>
              {t("No featured products available", "هیچ محصول ویژه‌ای در دسترس نیست")}
            </p>
          </div>
        )}
      </section>

      <ArticlesSlider initialArticles={articles} />

      <Footer />
      <BottomBar />
    </>
  );
}
