"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { useCart } from "@/lib/contexts/CartContext";
import ProductImageGallery from "./ProductImageGallery";
import toast from "react-hot-toast";
import { FiHeart, FiShoppingCart, FiEye, FiShare2 } from "react-icons/fi";
import styles from "@/styles/components/_productCard.module.scss";

interface ProductCardProps {
  id: string;
  name: string;
  nameFa: string | null;
  shortDescription: string | null;
  shortDescriptionFa: string | null;
  price: string;
  image: string | null;
  images?: string[] | null;
  badge: string | null;
  slug: string | null;
  category: string | null;
  minOrderQuantity?: number | null;
  maxOrderQuantity?: number | null;
  quantity?: number | null;
  alignPriceAtBottom?: boolean;
  flushImage?: boolean;
}

export default function ProductCard({
  id,
  name,
  nameFa,
  shortDescription,
  shortDescriptionFa,
  price,
  image,
  images,
  badge,
  slug,
  category,
  minOrderQuantity,
  maxOrderQuantity,
  quantity,
  alignPriceAtBottom = false,
  flushImage = false,
}: ProductCardProps) {
  const { t, language, currency } = useLanguage();
  const { data: session } = useSession();
  const router = useRouter();
  const { addItem, openCart, inventoryStatuses, registerProductForInventory } = useCart();
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [badges, setBadges] = useState<Record<string, { name: string; nameFa: string | null; color: string }>>({});
  const displayName = language === "fa" && nameFa ? nameFa : name;
  const displayDescription =
    language === "fa" && shortDescriptionFa
      ? shortDescriptionFa
      : shortDescription || "";
  const inventoryStatus = inventoryStatuses[id];
  const currentQuantity = inventoryStatus?.quantity ?? quantity;
  const currentBadge = inventoryStatus?.badge ?? badge;

  useEffect(() => registerProductForInventory(id), [id, registerProductForInventory]);

  // Check if product is in wishlist on mount
  useEffect(() => {
    const checkWishlist = async () => {
      if (!session?.user) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await fetch(`/api/user/wishlist/${id}`);
        if (response.ok) {
          const data = await response.json();
          setIsWishlisted(data.isInWishlist);
        }
      } catch (error) {
        console.error("Error checking wishlist:", error);
      }
    };

    checkWishlist();
  }, [id, session]);

  // Fetch badges on mount
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
        console.error("Error fetching badges:", error);
      }
    };

    fetchBadges();
  }, []);

  // Early return for loading state - placed after all hooks
  if (!currency) {
    return <div style={{ minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading price...</div>;
  }
  // Normalize currency to treat all variants of 'toman' as 'toman'
  const normalizedCurrency = typeof currency === 'string' && currency.toLowerCase().replace(/s$/, "") === 'toman' ? 'toman' : currency;
  const formattedPrice = formatPrice(price || "0", language, normalizedCurrency);

  const productUrl = slug ? `/products/${slug}` : `/products/${id}`;
  const productImage = image || "/placeholder-product.svg";

  const handleWishlistToggle = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Redirect to login if not authenticated
    if (!session?.user) {
      router.push("/login");
      return;
    }

    setIsLoading(true);
    try {
      if (isWishlisted) {
        // Remove from wishlist
        const response = await fetch(`/api/user/wishlist/${id}`, {
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
          body: JSON.stringify({ productId: id }),
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
      setIsLoading(false);
    }
  };

  const handleShare = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}${productUrl}`;
    const title = displayName;

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        toast.success(t("Link shared successfully", "لینک با موفقیت به اشتراک گذاشته شد"));
        return;
      } catch (err) {
        // fallback to clipboard copy
      }
    }

    try {
      if (navigator.clipboard?.writeText) {
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
    } catch (err) {
      console.warn("Share fallback failed:", err);
      toast.error(t("Failed to share product", "اشتراک گذاری محصول موفق نبود"));
    }
  };

  const getBadgeLabel = (badgeValue: string | null) => {
    if (!badgeValue || badgeValue === "None") return null;
    if (badges[badgeValue]) {
      return language === "fa" && badges[badgeValue].nameFa
        ? badges[badgeValue].nameFa
        : badges[badgeValue].name;
    }
    return null;
  };

  const getBadgeColor = (badgeValue: string | null) => {
    if (!badgeValue || badgeValue === "None") return null;
    if (badges[badgeValue]) {
      return badges[badgeValue].color;
    }
    return null;
  };

  const isOutOfStock = currentBadge === "Out of Stock" || (currentQuantity !== null && currentQuantity !== undefined && currentQuantity <= 0);
  const badgeLabel = isOutOfStock ? t("Out of Stock", "ناموجود") : getBadgeLabel(currentBadge);
  const badgeColor = isOutOfStock ? null : getBadgeColor(currentBadge);
  // Disable add to cart if product is out of stock, not available, or quantity is zero
  const isUnavailable =
    isOutOfStock ||
    currentBadge === "Not Available" ||
    inventoryStatus?.available === false;

  const handleBuyNow = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();

    if (isUnavailable) {
      toast.error(t("Product is out of stock", "محصول موجود نیست"));
      return;
    }

    // Determine quantity to add (default to minOrderQuantity or 1)
    const quantityToAdd = minOrderQuantity && minOrderQuantity > 0 ? minOrderQuantity : 1;

    // Validate max order quantity if set
    if (maxOrderQuantity !== null && maxOrderQuantity !== undefined && quantityToAdd > maxOrderQuantity) {
      toast.error(
        t(
          `Maximum order quantity is ${maxOrderQuantity}`,
          `حداکثر تعداد سفارش ${maxOrderQuantity} است`
        )
      );
      return;
    }

    setIsAddingToCart(true);
    try {
      await addItem({
        id: `${id}-${Date.now()}`,
        productId: id,
        name,
        nameFa,
        price,
        image,
        slug,
        category,
        minOrderQuantity: minOrderQuantity || null,
        maxOrderQuantity: maxOrderQuantity || null,
      }, quantityToAdd);

      toast.success(t("Added to cart", "به سبد خرید اضافه شد"));
      openCart(); // Open cart panel
    } catch (error: any) {
      console.error("Error adding to cart:", error);
      toast.error(
        error.message || t("Failed to add to cart", "خطا در افزودن به سبد خرید")
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div
      className={`${styles.productCard} ${alignPriceAtBottom ? styles.alignPriceAtBottom : ""} ${flushImage ? styles.flushImage : ""}`}
    >
      <div className={styles.productImageContainer}>
        <ProductImageGallery
          image={image}
          images={images}
          altText={displayName}
        />
        <div style={{ position: "absolute", top: "16px", left: "16px", display: "flex", flexDirection: "column", gap: "0.5rem", zIndex: 10 }}>
          {badgeLabel && (
            <span
              className={styles.badge}
              style={{
                background: isOutOfStock ? "#dc2626" : badgeColor || undefined,
                position: "relative",
                top: 0,
                left: 0,
              }}
            >
              {badgeLabel}
            </span>
          )}
        </div>
        <button
          className={`${styles.wishlistBtn} ${isWishlisted ? styles.active : ""}`}
          onClick={handleWishlistToggle}
          disabled={isLoading}
          aria-label={isWishlisted ? t("Remove from wishlist", "حذف از علاقه‌مندی‌ها") : t("Add to wishlist", "افزودن به علاقه‌مندی‌ها")}
        >
          <FiHeart className={styles.wishlistIcon} />
        </button>
        <button
          type="button"
          className={styles.shareBtn}
          onClick={handleShare}
          aria-label={t("Share Product", "اشتراک گذاری محصول")}
        >
          <FiShare2 className={styles.shareIcon} />
        </button>
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productTitle}>{displayName}</h3>
        {displayDescription && (
          <p className={styles.productSubtitle}>{displayDescription}</p>
        )}
        <div className={styles.productPrice}>{formattedPrice}</div>
        <button
          className={`${styles.btnBuy} ${isUnavailable || isAddingToCart ? styles.disabled : ""}`}
          onClick={handleBuyNow}
          disabled={isUnavailable || isAddingToCart}
        >
          <FiShoppingCart />
          <span>
            {isAddingToCart
              ? t("Adding...", "در حال افزودن...")
              : t("Buy Now", "خرید")}
          </span>
        </button>
        {currentBadge === "Not Available" ? (
          <div
            className={styles.btnView}
            aria-disabled="true"
            title={t("This product is hidden", "این محصول مخفی است")}
            style={{ cursor: "not-allowed" }}
          >
            <FiEye />
            <span>{t("View More", " جزئیات محصول")}</span>
          </div>
        ) : (
          <Link href={productUrl} className={styles.btnView}>
            <FiEye />
            <span>{t("View More", " جزئیات محصول")}</span>
          </Link>
        )}
      </div>
    </div>
  );
}
