"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import MidPageBanner from "@/components/MidPageBanner";
import ProductCard from "@/components/products/ProductCard";
import Select, { SelectOption } from "@/components/ui/Select";
import SkeletonLoader from "@/components/dashboard/SkeletonLoader";
import styles from "@/styles/pages/_products.module.scss";

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  price: string;
  image: string | null;
  images?: string[] | null;
  badge: string | null;
  productType: "economic" | "featured" | null;
  slug: string | null;
  category: string | null;
  categoryId: string | null;
  quantity: number | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
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

export default function ProductsPage() {
  const { t, language } = useLanguage();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get("category") ?? "");
  const [selectedBadge, setSelectedBadge] = useState<string>("");
  const [selectedProductType, setSelectedProductType] = useState<string>("");
  const [activeFilterView, setActiveFilterView] = useState<"category" | "badge" | "productType" | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [badges, setBadges] = useState<Array<{ name: string; nameFa: string | null; color: string }>>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResetProductsFilters = () => {
      setSearchQuery("");
      setSelectedCategory("");
      setSelectedBadge("");
      setSelectedProductType("");
      setActiveFilterView(null);
      setPage(1);
      setHasMore(true);
    };

    window.addEventListener("reset-products-filters", handleResetProductsFilters);

    return () => {
      window.removeEventListener("reset-products-filters", handleResetProductsFilters);
    };
  }, []);

  const hasActiveFilters = selectedCategory || selectedBadge || selectedProductType;

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedBadge("");
    setSelectedProductType("");
    setActiveFilterView(null);
  };

  const handleFilterTypeClick = (type: "category" | "badge" | "productType") => {
    setActiveFilterView(type);
  };

  const handleBackToFilters = () => {
    setActiveFilterView(null);
  };

  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setActiveFilterView(null);
  };

  const handleBadgeSelect = (badge: string) => {
    setSelectedBadge(badge);
    setActiveFilterView(null);
  };

  const handleProductTypeSelect = (type: string) => {
    setSelectedProductType(type);
    setActiveFilterView(null);
  };

  const handleRemoveCategory = () => setSelectedCategory("");
  const handleRemoveBadge = () => setSelectedBadge("");
  const handleRemoveProductType = () => setSelectedProductType("");

  // Fetch products function
  const fetchProducts = useCallback(async (pageNum: number = 1, isLoadMore: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.append("page", pageNum.toString());
      params.append("limit", "50");
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (selectedCategory) params.append("category", selectedCategory);
      if (selectedBadge) params.append("badge", selectedBadge);
      if (selectedProductType) params.append("productType", selectedProductType);

      const url = `/api/products?${params.toString()}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error("Failed to fetch products");

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      if (isLoadMore) {
        setProducts(prev => [...prev, ...(data.data || [])]);
      } else {
        setProducts(data.data || []);
      }
      setHasMore(data.data?.length > 0 && data.data.length === 50);
      setPage(pageNum);
    } catch (err: any) {
      console.error("Error fetching products:", err);
      setError(err?.message || t("Failed to load products", "خطا در بارگذاری محصولات"));
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedCategory, selectedBadge, selectedProductType, t]);

  // Fetch categories and badges on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, badgesResponse] = await Promise.all([
          fetch("/api/categories"),
          fetch("/api/admin/badges"),
        ]);

        if (categoriesResponse.ok) {
          const data = await categoriesResponse.json();
          setCategories(data.categories || []);
        }
        if (badgesResponse.ok) {
          const data = await badgesResponse.json();
          setBadges(data.badges || []);
        }
      } catch (err) {
        console.error("Error fetching filter data:", err);
      }
    };
    fetchData();
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    setProducts([]);
    const timeoutId = setTimeout(() => fetchProducts(1, false), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedBadge, selectedProductType]);

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          fetchProducts(page + 1, true);
        }
      },
      { threshold: 1.0 }
    );

    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, page, fetchProducts]);

  const categoryDropdownOptions: SelectOption[] = [
    { value: "", label: t("ALL", "همه") },
    ...categories.map(c => ({ value: c.id, label: language === "fa" && c.nameFa ? c.nameFa : c.name })),
  ];

  const badgeDropdownOptions: SelectOption[] = [
    { value: "", label: t("ALL", "همه") },
    ...badges.map(b => ({ value: b.name, label: language === "fa" && b.nameFa ? b.nameFa : b.name })),
  ];

  return (
    <>
      <Navbar />
      <MidPageBanner />
      
      <div className={styles.container}>
        <div className={styles.filters}>
          {activeFilterView === null && (
            <div className={styles.filterByLine}>
              <span className={styles.filterByLabel}>{t("Filter by:", "فیلتر بر اساس:")}</span>
              <button className={`${styles.filterByOption} ${selectedCategory ? styles.filterByActive : ""}`} onClick={() => handleFilterTypeClick("category")}>
                {t("Category", "دسته بندی")}
              </button>
              <span className={styles.filterBySeparator}>،</span>
              <button className={`${styles.filterByOption} ${selectedBadge ? styles.filterByActive : ""}`} onClick={() => handleFilterTypeClick("badge")}>
                {t("Badge", "نشان")}
              </button>
              <span className={styles.filterBySeparator}>،</span>
              <button className={`${styles.filterByOption} ${selectedProductType ? styles.filterByActive : ""}`} onClick={() => handleFilterTypeClick("productType")}>
                {t("Product Type", "نوع محصول")}
              </button>
              {hasActiveFilters && <button className={styles.resetFilterButton} onClick={handleResetFilters}>{t("Reset Filter", "پاک کردن فیلتر")}</button>}
            </div>
          )}

          {activeFilterView === "category" && (
            <div className={styles.filterSelectionView}>
              <div className={styles.filterOptionsWithBack}>
                <button className={styles.backButton} onClick={handleBackToFilters}>← {t("Back", "بازگشت")}</button>
                <button className={`${styles.filterChip} ${styles.categoryChip} ${selectedCategory === "" ? styles.active : ""}`} onClick={() => handleCategorySelect("")}>{t("ALL", "همه")}</button>
                {categories.map(c => (
                  <button key={c.id} className={`${styles.filterChip} ${styles.categoryChip} ${selectedCategory === c.id ? styles.active : ""}`} onClick={() => handleCategorySelect(c.id)}>
                    {language === "fa" && c.nameFa ? c.nameFa : c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFilterView === "badge" && (
            <div className={styles.filterSelectionView}>
              <div className={styles.filterOptionsWithBack}>
                <button className={styles.backButton} onClick={handleBackToFilters}>← {t("Back", "بازگشت")}</button>
                <button className={`${styles.filterChip} ${styles.badgeChip} ${selectedBadge === "" ? styles.active : ""}`} onClick={() => handleBadgeSelect("")}>{t("ALL", "همه")}</button>
                {badges.map(b => (
                  <button key={b.name} className={`${styles.filterChip} ${styles.badgeChip} ${selectedBadge === b.name ? styles.active : ""}`} onClick={() => handleBadgeSelect(b.name)}>
                    {language === "fa" && b.nameFa ? b.nameFa : b.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeFilterView === "productType" && (
            <div className={styles.filterSelectionView}>
              <div className={styles.filterOptionsWithBack}>
                <button className={styles.backButton} onClick={handleBackToFilters}>← {t("Back", "بازگشت")}</button>
                <button className={`${styles.filterChip} ${styles.badgeChip} ${selectedProductType === "" ? styles.active : ""}`} onClick={() => handleProductTypeSelect("")}>{t("ALL", "همه")}</button>
                <button className={`${styles.filterChip} ${styles.badgeChip} ${selectedProductType === "featured" ? styles.active : ""}`} onClick={() => handleProductTypeSelect("featured")}>{t("Featured", "ویژه")}</button>
                <button className={`${styles.filterChip} ${styles.badgeChip} ${selectedProductType === "economic" ? styles.active : ""}`} onClick={() => handleProductTypeSelect("economic")}>{t("Economic", "اقتصادی")}</button>
              </div>
            </div>
          )}

          {activeFilterView === null && hasActiveFilters && (
            <div className={styles.selectedFilters}>
              {selectedCategory && (
                <span className={styles.selectedFilterChip}>
                  {t("Category", "دسته بندی")}: {categories.find(c => c.id === selectedCategory) ? (language === "fa" && categories.find(c => c.id === selectedCategory)?.nameFa ? categories.find(c => c.id === selectedCategory)?.nameFa : categories.find(c => c.id === selectedCategory)?.name) : t("ALL", "همه")}
                  <button className={styles.removeFilterButton} onClick={handleRemoveCategory} aria-label={t("Remove category filter", "حذف فیلتر دسته بندی")}>×</button>
                </span>
              )}
              {selectedBadge && (
                <span className={styles.selectedFilterChip}>
                  {t("Badge", "نشان")}: {selectedBadge}
                  <button className={styles.removeFilterButton} onClick={handleRemoveBadge} aria-label={t("Remove badge filter", "حذف فیلتر نشان")}>×</button>
                </span>
              )}
              {selectedProductType && (
                <span className={styles.selectedFilterChip}>
                  {t("Product Type", "نوع محصول")}: {selectedProductType === "featured" ? t("Featured", "ویژه") : t("Economic", "اقتصادی")}
                  <button className={styles.removeFilterButton} onClick={handleRemoveProductType} aria-label={t("Remove product type filter", "حذف فیلتر نوع محصول")}>×</button>
                </span>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className={styles.productsGrid}>
            <SkeletonLoader type="productCard" count={6} className={styles.productSkeleton} />
          </div>
        ) : error ? (
          <div className={styles.error}><p>{error}</p></div>
        ) : products.length === 0 ? (
          <div className={styles.empty}><p>{t("No products found", "هیچ محصولی یافت نشد")}</p></div>
        ) : (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard key={product.id} id={product.id} name={product.name} nameFa={product.nameFa} shortDescription={product.shortDescription} shortDescriptionFa={product.shortDescriptionFa} price={product.price} image={product.image} images={product.images} badge={product.badge} productType={product.productType} slug={product.slug} category={product.category} minOrderQuantity={product.minOrderQuantity} maxOrderQuantity={product.maxOrderQuantity} quantity={product.quantity} />
            ))}
          </div>
        )}

        <div ref={loaderRef} className={styles.loader}>
          {isLoading && <p>{t("Loading more...", "در حال بارگذاری...")}</p>}
          {!hasMore && products.length > 0 && <p>{t("No more products", "محصولات بیشتری وجود ندارد")}</p>}
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}