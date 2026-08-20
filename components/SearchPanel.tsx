"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiSearch, FiX, FiArrowRight } from "react-icons/fi";
import styles from "@/styles/components/_searchPanel.module.scss";

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  price: string;
  image: string | null;
  slug: string | null;
}

interface JournalPost {
  id: string;
  title: string;
  titleFa: string | null;
  excerpt: string | null;
  excerptFa: string | null;
  image: string | null;
  slug: string | null;
}

interface InstructionCard {
  id: string;
  titleEn: string;
  titleFa: string;
  imageUrl: string;
}

interface SearchPanelProps {
  isOpen: boolean;
  onClose: () => void;
  navbarHeight?: number;
}

export default function SearchPanel({ isOpen, onClose, navbarHeight = 70 }: SearchPanelProps) {
  const { t, language, currency } = useLanguage();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [journalPosts, setJournalPosts] = useState<JournalPost[]>([]);
  const [instructionCards, setInstructionCards] = useState<InstructionCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-focus input when panel opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Small delay to ensure panel is rendered
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Clear search when panel closes
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setProducts([]);
      setJournalPosts([]);
    }
  }, [isOpen]);

  // Search functionality with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setProducts([]);
      setJournalPosts([]);
      setInstructionCards([]);
      return;
    }

    setIsLoading(true);

    const timeoutId = setTimeout(async () => {
      try {
        const limit = isMobile ? 3 : 5;

        const [productsResponse, journalResponse, instructionsResponse] = await Promise.all([
          fetch(`/api/products?search=${encodeURIComponent(searchQuery.trim())}&limit=${limit}`),
          fetch(`/api/journal?search=${encodeURIComponent(searchQuery.trim())}&limit=${limit}`),
          fetch(`/api/instruction-cards`),
        ]);

        if (productsResponse.ok) {
          const productsData = await productsResponse.json();
          setProducts(productsData.data || []);
        }

        if (journalResponse.ok) {
          const journalData = await journalResponse.json();
          setJournalPosts(journalData.posts || []);
        }

        if (instructionsResponse.ok) {
          const instructionsData = await instructionsResponse.json();
          const query = searchQuery.trim().toLowerCase();
          const filtered = (instructionsData.cards || []).filter((card: InstructionCard) =>
            card.titleEn.toLowerCase().includes(query) ||
            card.titleFa.toLowerCase().includes(query)
          );
          setInstructionCards(filtered.slice(0, limit));
        }
      } catch (error) {
        console.error("Error searching:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, isMobile]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Don't close if clicking on search icon
        const target = event.target as HTMLElement;
        if (!target.closest('[data-search-trigger]')) {
          onClose();
        }
      }
    };

    if (isOpen) {
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const handleProductClick = (product: Product) => {
    const url = product.slug ? `/products/${product.slug}` : `/products/${product.id}`;
    router.push(url);
    onClose();
  };

  const handleJournalClick = (post: JournalPost) => {
    if (post.slug) {
      router.push(`/how-to-use/${post.slug}`);
      onClose();
    }
  };

  const handleInstructionClick = () => {
    router.push("/instructions");
    onClose();
  };

  const handleViewAll = (type: "products" | "how-to-use") => {
    const queryParam = searchQuery.trim() ? `?search=${encodeURIComponent(searchQuery.trim())}` : "";
    router.push(`/${type}${queryParam}`);
    onClose();
  };

  const displayProductName = (product: Product) => {
    return language === "fa" && product.nameFa ? product.nameFa : product.name;
  };

  const displayJournalTitle = (post: JournalPost) => {
    return language === "fa" && post.titleFa ? post.titleFa : post.title;
  };

  const displayJournalExcerpt = (post: JournalPost) => {
    const excerpt = language === "fa" && post.excerptFa ? post.excerptFa : post.excerpt;
    if (!excerpt) return "";
    // Truncate to ~100 characters
    return excerpt.length > 100 ? excerpt.substring(0, 100) + "..." : excerpt;
  };

  const hasResults = products.length > 0 || journalPosts.length > 0 || instructionCards.length > 0;
  const totalResults = products.length + journalPosts.length;

  return (
    <>
      {/* Backdrop with blur effect */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        className={`${styles.searchPanel} ${isOpen ? styles.open : ""} ${hasResults ? styles.hasResults : ""}`}
        style={{ top: `${navbarHeight}px` }}
      >
        <div className={styles.searchInputContainer}>
          <FiSearch className={styles.searchIcon} />
          <input
            ref={inputRef}
            type="text"
            className={
              language === "fa"
                ? `${styles.searchInput} farsi`
                : styles.searchInput
            }
            placeholder={t("Search products and articles...", "جستجوی محصولات و مقالات...")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.clearButton}
              onClick={() => setSearchQuery("")}
              aria-label={t("Clear search", "پاک کردن جستجو")}
            >
              <FiX />
            </button>
          )}
        </div>

        <div className={styles.resultsContainer}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.spinner}></div>
              <span>{t("Searching...", "در حال جستجو...")}</span>
            </div>
          ) : searchQuery.trim().length < 2 ? (
            <div className={styles.emptyState}>
              <FiSearch className={styles.emptyIcon} />
              <span>{t("Type to search...", "برای جستجو تایپ کنید...")}</span>
            </div>
          ) : !hasResults ? (
            <div className={styles.emptyState}>
              <FiSearch className={styles.emptyIcon} />
              <span>{t("No results found", "نتیجه‌ای یافت نشد")}</span>
            </div>
          ) : (
            <>
              {products.length > 0 && (
                <div className={styles.resultsSection}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                      {t("Products", "محصولات")} ({products.length})
                    </span>
                  </div>
                  <div className={styles.resultsList}>
                    {products.map((product) => (
                      <div
                        key={product.id}
                        className={styles.resultItem}
                        onClick={() => handleProductClick(product)}
                      >
                        {product.image && (
                          <img
                            src={product.image}
                            alt={displayProductName(product)}
                            className={styles.resultImage}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <div className={styles.resultContent}>
                          <div className={styles.resultTitle}>
                            {displayProductName(product)}
                          </div>
                          <div className={styles.resultPrice}>
                            {formatPrice(product.price || "0", language, currency || "toman")}
                          </div>
                        </div>
                      </div>
                    ))}
                    {products.length >= (isMobile ? 3 : 5) && (
                      <button
                        className={styles.viewAllButton}
                        onClick={() => handleViewAll("products")}
                      >
                        {t("View all products", "مشاهده همه محصولات")}
                        <FiArrowRight className={styles.arrowIcon} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {journalPosts.length > 0 && (
                <div className={styles.resultsSection}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionTitle}>
                      {t("Journal", "مجله")} ({journalPosts.length})
                    </span>
                  </div>
                  <div className={styles.resultsList}>
                    {journalPosts.map((post) => (
                      <div
                        key={post.id}
                        className={styles.resultItem}
                        onClick={() => handleJournalClick(post)}
                      >
                        {post.image && (
                          <img
                            src={post.image}
                            alt={displayJournalTitle(post)}
                            className={styles.resultImage}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        )}
                        <div className={styles.resultContent}>
                          <div className={styles.resultTitle}>
                            {displayJournalTitle(post)}
                          </div>
                          {displayJournalExcerpt(post) && (
                            <div className={styles.resultExcerpt}>
                              {displayJournalExcerpt(post)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {journalPosts.length >= (isMobile ? 3 : 5) && (
                      <button
                        className={styles.viewAllButton}
                        onClick={() => handleViewAll("how-to-use")}
                      >
                        {t("View all guides", "مشاهده همه راهنماها")}
                        <FiArrowRight className={styles.arrowIcon} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {instructionCards.length > 0 && (
                <div className={styles.resultSection}>
                  <h3 className={styles.resultTitle}>
                    {t("Instructions", "آموزش")}
                  </h3>
                  <div className={styles.resultList}>
                    {instructionCards.map((card) => (
                      <div
                        key={card.id}
                        className={styles.resultItem}
                        onClick={handleInstructionClick}
                      >
                        {card.imageUrl && (
                          <img
                            src={card.imageUrl}
                            alt={language === "fa" ? card.titleFa : card.titleEn}
                            className={styles.resultImage}
                          />
                        )}
                        <div className={styles.resultInfo}>
                          <h4 className={styles.resultName}>
                            {language === "fa" ? card.titleFa : card.titleEn}
                          </h4>
                        </div>
                        <FiArrowRight className={styles.arrowIcon} />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

