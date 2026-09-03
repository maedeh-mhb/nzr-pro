"use client";


import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useCart } from "@/lib/contexts/CartContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import BackButton from "@/components/ui/BackButton";
import ProductImageGallery from "@/components/products/ProductImageGallery";
import { FiHeart, FiShoppingCart, FiArrowLeft, FiShare2 } from "react-icons/fi";
import toast from "react-hot-toast";
import styles from "@/styles/pages/_productDetail.module.scss";

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  longDescription: string | null;
  longDescriptionFa: string | null;
  ingredients: string | null;
  ingredientsFa: string | null;
  tags: string | null;
  price: string;
  quantity: number;
  image: string | null;
  audioUrl: string | null;
  images?: string[] | null;
  badge: string | null;
  productType: "economic" | "featured" | null;
  minOrderQuantity: number | null;
  maxOrderQuantity: number | null;
  weight: string | null;
  volume: string | null;
  unit: string | null;
  rewardPoints: number | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  slug: string | null;
  category: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

interface ProductDetailClientProps {
  initialProduct: Product;
  slug: string;
}

export default function ProductDetailClient({ initialProduct, slug }: ProductDetailClientProps) {
  // Only show admin-assigned badges (no hardcoded fallback)
  const [badges, setBadges] = useState<Record<string, { name: string; nameFa: string | null; color: string }>>({});
  useEffect(() => {
    const fetchBadges = async () => {
      try {
        const response = await fetch("/api/admin/badges");
        if (response.ok) {
          const data = await response.json();
          const badgesMap: Record<string, { name: string; nameFa: string | null; color: string }> = {};
          (data.badges || []).forEach((b: any) => {
            badgesMap[b.name] = {
              name: b.name,
              nameFa: b.nameFa,
              color: b.color,
            };
          });
          setBadges(badgesMap);
        }
      } catch (error) {
        // ignore
      }
    };
    fetchBadges();
  }, []);
  const router = useRouter();
  const { data: session } = useSession();
  const { t, language, currency } = useLanguage();
  const { addItem, openCart, updateQuantity, removeItem } = useCart();
  const [product] = useState<Product>(initialProduct);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isWishlistLoading, setIsWishlistLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [userReview, setUserReview] = useState<any | null>(null); // User's own review (if exists and not verified)
  const [reviewFormData, setReviewFormData] = useState({
    reviewerName: "",
    reviewText: "",
  });
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [userProfile, setUserProfile] = useState<{ name: string; surname: string | null } | null>(null);
  const [isStickyBarExpanded, setIsStickyBarExpanded] = useState(false);
  const [hasAddedToCartOnce, setHasAddedToCartOnce] = useState(false); // Track if user has added to cart at least once (mobile only)
  const [showPlaceOrderBar, setShowPlaceOrderBar] = useState(false); // Show place order bar on mobile after adding to cart

  const handleShare = async () => {
    const url = window.location.href;
    const title = product?.name || product?.nameFa || t("Share Product", "اشتراک گذاری محصول");

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast.success(t("Link shared successfully", "لینک با موفقیت به اشتراک گذاشته شد"));
        return;
      } catch (error) {
        // User cancelled or share failed; fallback to copy
      }
    }

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      toast.success(t("Product link copied", "لینک محصول کپی شد"));
    } catch (error) {
      console.warn("Share fallback failed:", error);
      toast.error(t("Failed to share product", "اشتراک گذاری محصول موفق نبود"));
    }
  };

  // Check wishlist status when product is loaded
  useEffect(() => {
    const checkWishlist = async () => {
      if (!product || !session?.user) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/wishlist/${product.id}`);
        if (response.ok) {
          const data = await response.json();
          setIsWishlisted(data.isInWishlist);
        }
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    if (product) {
      checkWishlist();
    }
  }, [product, session]);

  // Fetch user profile for auto-fill
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!session?.user?.id) {
        setUserProfile(null);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          setUserProfile({
            name: data.name,
            surname: data.surname,
          });
          // Auto-fill reviewer name
          const fullName = data.surname
            ? `${data.name} ${data.surname}`.trim()
            : data.name;
          setReviewFormData((prev) => ({
            ...prev,
            reviewerName: fullName || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    if (session?.user) {
      fetchUserProfile();
    }
  }, [session]);

  // Fetch reviews when product is loaded
  useEffect(() => {
    const fetchReviews = async () => {
      if (!product) return;

      setIsLoadingReviews(true);
      try {
        const encodedSlug = encodeURIComponent(slug);

        // Fetch reviews (verified + user's own unverified review if logged in)
        const reviewsResponse = await fetch(`/api/products/${encodedSlug}/reviews`);
        if (reviewsResponse.ok) {
          const reviewsData = await reviewsResponse.json();
          // Reviews now include verified reviews + user's own unverified review
          setReviews(reviewsData.reviews || []);

          // Set userReview if they have an unverified review
          if (reviewsData.userUnverifiedReview && session?.user?.id) {
            setUserReview(reviewsData.userUnverifiedReview);
            setReviewFormData({
              reviewerName: reviewsData.userUnverifiedReview.reviewerName,
              reviewText: reviewsData.userUnverifiedReview.reviewText,
            });
            setIsEditingReview(true);
          } else {
            setUserReview(null);
            setIsEditingReview(false);
          }
        }
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setIsLoadingReviews(false);
      }
    };

    if (product) {
      fetchReviews();
    }
  }, [product, slug, session]);

  const handleWishlistToggle = async () => {
    if (!product) return;

    // Redirect to login if not authenticated
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setIsWishlistLoading(true);
    try {
      if (isWishlisted) {
        // Remove from wishlist
        const response = await fetch(`/api/user/wishlist/${product.id}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setIsWishlisted(false);
          toast.success(t("Removed from wishlist", "از علاقه‌مندی‌ها حذف شد"));
        } else {
          throw new Error("Failed to remove from wishlist");
        }
      } else {
        // Add to wishlist
        const response = await fetch("/api/user/wishlist", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ productId: product.id }),
        });

        if (response.ok) {
          setIsWishlisted(true);
          toast.success(t("Added to wishlist", "به علاقه‌مندی‌ها اضافه شد"));
        } else {
          const errorData = await response.json();
          if (errorData.error === "Product already in wishlist") {
            setIsWishlisted(true);
          } else {
            throw new Error(errorData.error || "Failed to add to wishlist");
          }
        }
      }
    } catch (error: any) {
      console.error("Error toggling wishlist:", error);
      toast.error(error.message || t("Failed to update wishlist", "خطا در به‌روزرسانی علاقه‌مندی‌ها"));
    } finally {
      setIsWishlistLoading(false);
    }
  };

  // Define helper function that doesn't depend on product
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const displayName = language === "fa" && product.nameFa ? product.nameFa : product.name;
  const displayShortDescription =
    language === "fa" && product.shortDescriptionFa
      ? product.shortDescriptionFa
      : product.shortDescription || "";
  const displayLongDescription =
    language === "fa" && product.longDescriptionFa
      ? product.longDescriptionFa
      : product.longDescription || "";
  const displayIngredients =
    language === "fa" && product.ingredientsFa
      ? product.ingredientsFa
      : product.ingredients || "";

  if (!currency) {
    return (
      <>
        <Navbar />
        <div style={{ minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>Loading price...</div>
        <Footer />
        <BottomBar />
      </>
    );
  }
  // Normalize currency to treat all variants of 'toman' as 'toman'
  const normalizedCurrency = typeof currency === 'string' && currency.toLowerCase().replace(/s$/, "") === 'toman' ? 'toman' : currency;
  const formattedPrice = formatPrice(product.price || "0", language, normalizedCurrency);

  const productImage = product.image || "/placeholder-product.jpg";
  const tags = product.tags ? product.tags.split(",").map((tag) => tag.trim()) : [];


  const getBadgeLabel = (badgeValue: string | null) => {
    if (!badgeValue || badgeValue === "None") return null;
    if (badges[badgeValue]) {
      return language === "fa" && badges[badgeValue].nameFa
        ? badges[badgeValue].nameFa
        : badges[badgeValue].name;
    }
    return null;
  };

  const badgeLabel = getBadgeLabel(product.badge);

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    const min = product.minOrderQuantity || 1;
    const max = product.maxOrderQuantity || Infinity;

    if (newQuantity >= min && newQuantity <= max) {
      setQuantity(newQuantity);

      // If place order bar is showing, update cart quantity as well
      if (showPlaceOrderBar && product) {
        updateQuantity(product.id, newQuantity);
      }
    }
  };

  const handleAddToCart = async (shouldOpenCart: boolean = true) => {
    if (!product) return;

    // Check if product is available
    if (product.quantity === 0) {
      toast.error(t("Product is out of stock", "محصول موجود نیست"));
      return;
    }

    // Validate quantity
    if (quantity <= 0) {
      toast.error(t("Invalid quantity", "تعداد نامعتبر است"));
      return;
    }

    if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
      toast.error(
        t(
          `Minimum order quantity is ${product.minOrderQuantity}`,
          `حداقل تعداد سفارش ${product.minOrderQuantity} است`
        )
      );
      return;
    }

    if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
      toast.error(
        t(
          `Maximum order quantity is ${product.maxOrderQuantity}`,
          `حداکثر تعداد سفارش ${product.maxOrderQuantity} است`
        )
      );
      return;
    }

    setIsAddingToCart(true);
    try {
      // Add item to cart with specified quantity (works for both guest and registered users)
      await addItem(
        {
          id: `${product.id}-${Date.now()}`, // Unique ID
          productId: product.id,
          name: product.name,
          nameFa: product.nameFa,
          price: product.price,
          image: product.image,
          slug: product.slug,
          category: product.category,
          minOrderQuantity: product.minOrderQuantity,
          maxOrderQuantity: product.maxOrderQuantity,
        },
        quantity
      );

      toast.success(
        t(
          "The product has been added to your cart",
          "محصول به سبد خرید شما اضافه شده است"
        )
      );

      // Check if mobile
      const isMobile = typeof window !== "undefined" && window.innerWidth <= 640;

      // On mobile: show place order bar and don't open cart
      // On desktop: open cart panel if requested
      if (isMobile) {
        // Mobile: show place order bar (stays on screen)
        setShowPlaceOrderBar(true);
      } else {
        // Desktop: open cart panel if requested
        if (shouldOpenCart) {
          openCart();
        }
      }
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error(
        error.message || t("Failed to add to cart", "خطا در افزودن به سبد خرید")
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product) return;

    // Check if product is available
    if (product.quantity === 0) {
      toast.error(t("Product is out of stock", "محصول موجود نیست"));
      return;
    }

    // Validate quantity
    if (quantity <= 0) {
      toast.error(t("Invalid quantity", "تعداد نامعتبر است"));
      return;
    }

    if (product.minOrderQuantity && quantity < product.minOrderQuantity) {
      toast.error(
        t(
          `Minimum order quantity is ${product.minOrderQuantity}`,
          `حداقل تعداد سفارش ${product.minOrderQuantity} است`
        )
      );
      return;
    }

    if (product.maxOrderQuantity && quantity > product.maxOrderQuantity) {
      toast.error(
        t(
          `Maximum order quantity is ${product.maxOrderQuantity}`,
          `حداکثر تعداد سفارش ${product.maxOrderQuantity} است`
        )
      );
      return;
    }

    setIsAddingToCart(true);
    try {
      // Add item to cart with specified quantity
      await addItem(
        {
          id: `${product.id}-${Date.now()}`,
          productId: product.id,
          name: product.name,
          nameFa: product.nameFa,
          price: product.price,
          image: product.image,
          slug: product.slug,
          category: product.category,
          minOrderQuantity: product.minOrderQuantity,
          maxOrderQuantity: product.maxOrderQuantity,
        },
        quantity
      );

      // Redirect to checkout
      router.push("/checkout");
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error(
        error.message || t("Failed to add to cart", "خطا در افزودن به سبد خرید")
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !reviewFormData.reviewerName.trim() || !reviewFormData.reviewText.trim()) {
      return;
    }

    if (!session?.user?.id) {
      toast.error(t("Please log in to write a review", "لطفاً برای نوشتن نظر وارد شوید"));
      return;
    }

    setIsSubmittingReview(true);
    try {
      const encodedSlug = encodeURIComponent(slug);

      let response;
      if (isEditingReview && userReview) {
        // Update existing review
        response = await fetch(`/api/products/${encodedSlug}/reviews/${userReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewerName: reviewFormData.reviewerName.trim(),
            reviewText: reviewFormData.reviewText.trim(),
          }),
        });
      } else {
        // Create new review
        response = await fetch(`/api/products/${encodedSlug}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reviewerName: reviewFormData.reviewerName.trim(),
            reviewText: reviewFormData.reviewText.trim(),
          }),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit review");
      }

      const data = await response.json();

      // Refresh reviews list to show the new/updated review
      const reviewsResponse = await fetch(`/api/products/${encodedSlug}/reviews`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
        // Always reset form to initial state after submission
        setUserReview(null);
        setIsEditingReview(false);
      }

      if (isEditingReview && userReview) {
        // Update local state
        toast.success(t("Review updated successfully", "نظر با موفقیت به‌روزرسانی شد"));
      } else {
        // New review
        toast.success(t("Review submitted successfully. Waiting for admin approval.", "نظر با موفقیت ثبت شد. در انتظار تأیید ادمین."));
      }

      // Reset form to initial state (keep name for convenience)
      const fullName = userProfile?.surname
        ? `${userProfile.name} ${userProfile.surname}`.trim()
        : userProfile?.name || "";
      setReviewFormData({
        reviewerName: fullName,
        reviewText: ""
      });
    } catch (err: any) {
      console.error("Error submitting review:", err);
      toast.error(err.message || t("Failed to submit review", "خطا در ثبت نظر"));
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId?: string) => {
    const reviewToDelete = reviewId ? reviews.find(r => r.id === reviewId) : userReview;
    if (!reviewToDelete || !session?.user?.id) return;

    if (!confirm(t("Are you sure you want to delete this review?", "آیا مطمئن هستید که می‌خواهید این نظر را حذف کنید؟"))) {
      return;
    }

    try {
      const encodedSlug = encodeURIComponent(slug);
      const response = await fetch(`/api/products/${encodedSlug}/reviews/${reviewToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete review");
      }

      // Refresh reviews list
      const reviewsResponse = await fetch(`/api/products/${encodedSlug}/reviews`);
      if (reviewsResponse.ok) {
        const reviewsData = await reviewsResponse.json();
        setReviews(reviewsData.reviews || []);
        if (reviewsData.userUnverifiedReview && session?.user?.id) {
          setUserReview(reviewsData.userUnverifiedReview);
        } else {
          setUserReview(null);
          setIsEditingReview(false);
          const fullName = userProfile?.surname
            ? `${userProfile.name} ${userProfile.surname}`.trim()
            : userProfile?.name || "";
          setReviewFormData({
            reviewerName: fullName,
            reviewText: ""
          });
        }
      }

      toast.success(t("Review deleted successfully", "نظر با موفقیت حذف شد"));
    } catch (err: any) {
      console.error("Error deleting review:", err);
      toast.error(err.message || t("Failed to delete review", "خطا در حذف نظر"));
    }
  };

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <BackButton
          href="/products"
          label={t("Back to Products", "بازگشت به محصولات")}
        />

        {/* Product Card */}
        <div className={styles.productCard}>
          <div className={styles.productDetail}>
            <div className={styles.imageSection}>
              <div className={styles.imageContainer}>
                <ProductImageGallery
                  image={product.image}
                  images={product.images}
                  altText={displayName}
                />
                <div style={{ position: "absolute", top: "16px", left: "16px", display: "flex", flexDirection: "column", gap: "0.5rem", zIndex: 10 }}>
                  {badgeLabel && product.badge && (
                    <span
                      className={styles.badge}
                      style={badges[product.badge]?.color ? { background: badges[product.badge].color } : {}}
                    >
                      {badgeLabel}
                    </span>
                  )}
                  {product.productType && (
                    <span
                      className={styles.productTypeBadge}
                      style={{
                        background: product.productType === "featured" ? "#367260" : "#6c9cb8"
                      }}
                    >
                      {product.productType === "featured"
                        ? (language === "fa" ? "ویژه" : "Featured")
                        : (language === "fa" ? "اقتصادی" : "Economic")}
                    </span>
                  )}
                </div>
                <div className={styles.imageActions}>
                  <button
                    className={`${styles.wishlistBtn} ${isWishlisted ? styles.active : ""}`}
                    onClick={handleWishlistToggle}
                    disabled={isWishlistLoading}
                    aria-label={isWishlisted ? t("Remove from wishlist", "حذف از علاقه‌مندی‌ها") : t("Add to wishlist", "افزودن به علاقه‌مندی‌ها")}
                  >
                    <FiHeart className={styles.wishlistIcon} />
                  </button>
                  <button
                    type="button"
                    className={styles.shareBtnMobile}
                    onClick={handleShare}
                    aria-label={t("Share Product", "اشتراک گذاری محصول")}
                  >
                    <FiShare2 className={styles.shareIcon} />
                  </button>
                </div>
                <button
                  type="button"
                  className={styles.shareBtn}
                  onClick={handleShare}
                  aria-label={t("Share Product", "اشتراک گذاری محصول")}
                >
                  <FiShare2 className={styles.shareIcon} />
                </button>
              </div>
            </div>

            <div className={styles.infoSection}>
             
              <div className={styles.titleRow}>
                <h1 className={styles.productTitle}>{displayName}</h1>
              </div>
              {displayShortDescription && (
                <p className={styles.shortDescription}>{displayShortDescription}</p>
              )}

              <div className={styles.priceSection}>
                <span className={styles.price}>{formattedPrice}</span>
                  {product.weight && (() => {
                    const weightInGrams = parseFloat(product.weight) * 1000;
                    return (
                      <span className={styles.weight}>
                        {t("Weight", "وزن")}: {language === "fa" ? weightInGrams.toFixed(0).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[+d]) : weightInGrams.toFixed(0)} {t("g", "گرم")}
                      </span>
                    );
                  })()}
                  {product.volume && (() => {
                    const volumeInMl = parseFloat(product.volume) * 1000;
                    return (
                      <span className={styles.weight}>
                        {t("Volume", "حجم")}: {language === "fa" ? volumeInMl.toFixed(0).replace(/\d/g, d => "۰�1۲۳۴۵۶۷۸۹"[+d]) : volumeInMl.toFixed(0)} {t("ml", "میلی‌لیتر")}
                      </span>
                    );
                  })()}
              </div>

              {product.rewardPoints && product.rewardPoints > 0 && (
                <div className={styles.rewardInfo}>
                  <span className={styles.rewardText}>
                    {language === "fa"
                      ? `با خرید این محصول شما ${product.rewardPoints} امتیاز دریافت خواهید کرد`
                      : `By purchasing this product you will receive ${product.rewardPoints} points and reward`}
                  </span>
                </div>
              )}

              {displayLongDescription && (
                <div className={styles.descriptionSection}>
                  <h2 className={styles.sectionTitle}>
                    {t("Description", "توضیحات")}
                  </h2>
                  <p className={styles.longDescription}>{displayLongDescription}</p>
                </div>
              )}
               {product.audioUrl && (
                <div style={{ marginBottom: "1rem" }}>
                  <audio controls preload="metadata" style={{ width: "100%" }}>
                    <source src={product.audioUrl} />
                    {t("Your browser does not support audio playback.", "مرورگر شما از پخش فایل صوتی پشتیبانی نمی‌کند.")}
                  </audio>
                </div>
              )}

              {displayIngredients && (
                <div className={styles.ingredientsSection}>
                  <h2 className={styles.sectionTitle}>
                    {t("Ingredients", "مواد تشکیل‌دهنده")}
                  </h2>
                  <p className={styles.ingredients}>{displayIngredients}</p>
                </div>
              )}

              {tags.length > 0 && (
                <div className={styles.tagsSection}>
                  <h2 className={styles.sectionTitle}>
                    {t("Tags", "برچسب‌ها")}
                  </h2>
                  <div className={styles.tags}>
                    {tags.map((tag, index) => (
                      <span key={index} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.quantitySection}>
                <div className={styles.quantityRow}>
                  <label className={styles.quantityLabel}>
                    {t("Quantity", "تعداد")}:
                  </label>
                  <div className={styles.quantityControls}>
                    {quantity === 1 ? (
                      <button
                        className={styles.quantityButton + ' ' + styles.removeButton}
                        onClick={async () => {
                          await removeItem(product.id);
                          toast.success(t("Product removed from your cart", "محصول از سبد خرید شما حذف شد"));
                        }}
                        aria-label={t("Remove from cart", "حذف از سبد خرید")}
                      >
                        {/* Trash/Remove icon (FiTrash2) */}
                        <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
                      </button>
                    ) : (
                      <button
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(-1)}
                        disabled={quantity <= (product.minOrderQuantity || 1)}
                      >
                        −
                      </button>
                    )}
                    <input
                      type="number"
                      className={styles.quantityInput}
                      value={quantity}
                      onChange={(e) => {
                        const value = parseInt(e.target.value) || 1;
                        const min = product.minOrderQuantity || 1;
                        const max = product.maxOrderQuantity || Infinity;
                        if (value >= min && value <= max) {
                          setQuantity(value);
                        }
                      }}
                      min={product.minOrderQuantity || 1}
                      max={product.maxOrderQuantity || undefined}
                    />
                    <button
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(1)}
                      disabled={
                        product.maxOrderQuantity
                          ? quantity >= product.maxOrderQuantity
                          : false
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
                {product.minOrderQuantity && product.minOrderQuantity > 1 && (
                  <span className={styles.quantityHint}>
                    {t("Minimum order", "حداقل سفارش")}: {product.minOrderQuantity}
                  </span>
                )}
              </div>

              <div className={styles.actionButtons}>
                <button
                  className={styles.buyButton}
                  onClick={handleBuyNow}
                  disabled={product.quantity === 0 || isAddingToCart}
                >
                  <FiShoppingCart />
                  <span>
                    {isAddingToCart
                      ? t("Adding...", "در حال افزودن...")
                      : t("Buy Now", "خرید")}
                  </span>
                </button>
                <button
                  className={styles.addToCartButton}
                  onClick={() => handleAddToCart(false)}
                  disabled={product.quantity === 0 || isAddingToCart}
                >
                  <span>
                    {isAddingToCart
                      ? t("Adding...", "در حال افزودن...")
                      : t("Add to Cart", "افزودن به سبد خرید")}
                  </span>
                </button>
              </div>

              {product.quantity === 0 && (
                <p className={styles.outOfStock}>
                  {t("Out of Stock", "ناموجود")}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Card */}
        <div className={styles.reviewsCard}>
          <div className={styles.reviewsSection}>
            <h2 className={styles.reviewsTitle}>
              {t("Customer Reviews", "نظرات مشتریان")}
            </h2>

            {/* Write Review Form */}
            {!session?.user ? (
              <div className={styles.writeReview}>
                <p className={styles.loginPrompt}>
                  {t(
                    "Please log in to write a review",
                    "لطفاً برای نوشتن نظر وارد شوید"
                  )}
                </p>
              </div>
            ) : (
              <div className={styles.writeReview}>
                <h3 className={styles.writeReviewTitle}>
                  {t("Write a Review", "نوشتن نظر")}
                </h3>
                <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      {t("Your Name", "نام شما")}
                    </label>
                    <input
                      type="text"
                      className={styles.formInput}
                      placeholder={t("Enter your name", "نام خود را وارد کنید")}
                      value={reviewFormData.reviewerName}
                      onChange={(e) =>
                        setReviewFormData({
                          ...reviewFormData,
                          reviewerName: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>
                      {t("Your Review", "نظر شما")}
                    </label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder={t(
                        "Share your experience with this product...",
                        "تجربه خود را با این محصول به اشتراک بگذارید..."
                      )}
                      value={reviewFormData.reviewText}
                      onChange={(e) =>
                        setReviewFormData({
                          ...reviewFormData,
                          reviewText: e.target.value,
                        })
                      }
                      rows={5}
                      required
                    />
                  </div>
                  <div className={styles.reviewFormActions}>
                    <button
                      type="submit"
                      className={styles.submitReviewButton}
                      disabled={isSubmittingReview}
                    >
                      {isSubmittingReview
                        ? t("Submitting...", "در حال ارسال...")
                        : t("Submit Review", "ثبت نظر")}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Reviews List */}
            {isLoadingReviews ? (
              <div className={styles.reviewsLoading}>
                <p>{t("Loading reviews...", "در حال بارگذاری نظرات...")}</p>
              </div>
            ) : reviews.length === 0 ? (
              <div className={styles.noReviews}>
                <p>{t("No reviews yet", "هنوز نظری ثبت نشده است")}</p>
              </div>
            ) : (
              <div className={styles.reviewsCardContainer}>
                <div className={styles.reviewsList}>
                  {reviews.map((review) => {
                    // Check if this is the current user's unverified review
                    const isUserUnverifiedReview =
                      session?.user?.id &&
                      review.userId === session.user.id &&
                      !review.isVerified;

                    return (
                      <div key={review.id} className={styles.reviewItem}>
                        <div className={styles.reviewHeader}>
                          <div className={styles.reviewerInfo}>
                            <div className={styles.reviewerAvatar}>
                              {getInitials(review.reviewerName)}
                            </div>
                            <div className={styles.reviewerDetails}>
                              <h4 className={styles.reviewerName}>
                                {review.reviewerName}
                              </h4>
                              <p className={styles.reviewDate}>
                                {new Date(review.createdAt).toLocaleDateString(
                                  language === "fa" ? "fa-IR" : "en-US",
                                  {
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                  }
                                )}
                              </p>
                            </div>
                          </div>
                          {/* Show edit/delete buttons only for user's own unverified review - in header for desktop, bottom for mobile */}
                          {isUserUnverifiedReview && (
                            <div className={styles.reviewActions}>
                              <button
                                className={styles.editReviewButton}
                                onClick={() => {
                                  setUserReview(review);
                                  setReviewFormData({
                                    reviewerName: review.reviewerName,
                                    reviewText: review.reviewText,
                                  });
                                  setIsEditingReview(true);
                                  // Scroll to review form
                                  const reviewForm = document.querySelector(`.${styles.writeReview}`);
                                  if (reviewForm) {
                                    reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }
                                }}
                              >
                                {t("Edit", "ویرایش")}
                              </button>
                              <button
                                className={styles.deleteReviewButton}
                                onClick={() => handleDeleteReview(review.id)}
                              >
                                {t("Delete", "حذف")}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className={styles.reviewText}>{review.reviewText}</p>
                        {/* Show edit/delete buttons at bottom for mobile only */}
                        {isUserUnverifiedReview && (
                          <div className={styles.reviewActionsMobile}>
                            <button
                              className={styles.editReviewButton}
                              onClick={() => {
                                setUserReview(review);
                                setReviewFormData({
                                  reviewerName: review.reviewerName,
                                  reviewText: review.reviewText,
                                });
                                setIsEditingReview(true);
                                // Scroll to review form
                                const reviewForm = document.querySelector(`.${styles.writeReview}`);
                                if (reviewForm) {
                                  reviewForm.scrollIntoView({ behavior: "smooth", block: "start" });
                                }
                              }}
                            >
                              {t("Edit", "ویرایش")}
                            </button>
                            <button
                              className={styles.deleteReviewButton}
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              {t("Delete", "حذف")}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sticky Bar - Only show when product is loaded */}
      {product && (
        <div className={styles.mobileStickyBar}>
          {!isStickyBarExpanded ? (
            <div className={`${styles.stickyBarInitial} ${showPlaceOrderBar ? styles.centered : ''}`}>
              {!showPlaceOrderBar && (
                <button
                  className={styles.stickyAddToCart}
                  onClick={async () => {
                    // First click: Add to cart and show place order bar
                    await handleAddToCart(false);
                  }}
                  disabled={product.quantity === 0 || isAddingToCart}
                >
                  {isAddingToCart
                    ? t("Adding...", "در حال افزودن...")
                    : t("Add to Cart", "افزودن به سبد خرید")}
                </button>
              )}
              <div className={styles.stickyPrice}>
                {(() => {
                  const normalizedCurrency = typeof currency === 'string' && currency.toLowerCase().replace(/s$/, "") === 'toman' ? 'toman' : (currency || 'toman');
                  return formatPrice(parseFloat(product.price || "0") * quantity, language, normalizedCurrency);
                })()}
              </div>
            </div>
          ) : (
            <div className={styles.stickyBarExpanded}>
              <div className={styles.stickyQuantityControls}>
                <button
                  className={styles.stickyQuantityButton}
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= (product.minOrderQuantity || 1)}
                >
                  −
                </button>
                <input
                  type="number"
                  className={styles.stickyQuantityInput}
                  value={quantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    const min = product.minOrderQuantity || 1;
                    const max = product.maxOrderQuantity || Infinity;
                    if (value >= min && value <= max) {
                      setQuantity(value);
                    }
                  }}
                  min={product.minOrderQuantity || 1}
                  max={product.maxOrderQuantity || undefined}
                />
                <button
                  className={styles.stickyQuantityButton}
                  onClick={() => handleQuantityChange(1)}
                  disabled={
                    product.maxOrderQuantity
                      ? quantity >= product.maxOrderQuantity
                      : false
                  }
                >
                  +
                </button>
              </div>
              <div className={styles.stickyPriceDynamic}>
                {(() => {
                  const normalizedCurrency = typeof currency === 'string' && currency.toLowerCase().replace(/s$/, "") === 'toman' ? 'toman' : (currency || 'toman');
                  return formatPrice(parseFloat(product.price || "0") * quantity, language, normalizedCurrency);
                })()}
              </div>
              <button
                className={styles.stickyAddToCartFinal}
                onClick={async () => {
                  // Add to cart without opening cart panel
                  await handleAddToCart(false); // Don't open cart, just show place order bar
                  setIsStickyBarExpanded(false);
                }}
                disabled={product.quantity === 0 || isAddingToCart}
              >
                {isAddingToCart
                  ? t("Adding...", "در حال افزودن...")
                  : t("Add to Cart", "افزودن به سبد خرید")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Place Order Bar - Slides up after adding to cart on mobile */}
      {showPlaceOrderBar && product && (
        <div className={styles.placeOrderBar}>
          <div className={styles.placeOrderQuantityControls}>
            {quantity === 1 ? (
              <button
                className={styles.placeOrderQuantityButton + ' ' + styles.removeButton}
                onClick={async () => {
                  // Remove item from cart and hide place order bar
                  await removeItem(product.id);
                  setShowPlaceOrderBar(false);
                  toast.success(t("Product removed from your cart", "محصول از سبد خرید شما حذف شد"));
                }}
                aria-label={t("Remove from cart", "حذف از سبد خرید")}
              >
                {/* Trash/Remove icon (FiTrash2) */}
                <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#ff6b6b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m5 0V4a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v2" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></svg>
              </button>
            ) : (
              <button
                className={styles.placeOrderQuantityButton}
                onClick={() => handleQuantityChange(-1)}
                disabled={quantity <= (product?.minOrderQuantity || 1)}
              >
                −
              </button>
            )}
            <span className={styles.placeOrderQuantityValue}>{quantity}</span>
            <button
              className={styles.placeOrderQuantityButton}
              onClick={() => handleQuantityChange(1)}
              disabled={
                product?.maxOrderQuantity
                  ? quantity >= product.maxOrderQuantity
                  : false
              }
            >
              +
            </button>
          </div>
          <button
            className={styles.placeOrderButton}
            onClick={() => {
              setShowPlaceOrderBar(false);
              openCart();
            }}
          >
            {t("Place the order", "سفارش را ثبت کنید")}
          </button>
        </div>
      )}

      <div className={styles.footerWrapper}>
        <Footer />
      </div>
      <BottomBar />
    </>
  );
}

