"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import toast from "react-hot-toast";
import { FiHeart, FiArrowLeft, FiTrash2, FiShoppingBag } from "react-icons/fi";
import { formatPrice } from "@/lib/utils/formatPrice";
import Link from "next/link";
import SwipeableItem from "../SwipeableItem";
import SkeletonLoader from "../SkeletonLoader";
import EmptyState from "../EmptyState";
import styles from "@/styles/components/_dashboard.module.scss";

interface WishlistItem {
  id: string;
  productId: string;
  createdAt: Date | string;
  product: {
    id: string;
    name: string;
    nameFa: string | null;
    price: string;
    image: string | null;
    slug: string | null;
    badge: string | null;
  };
}

interface WishlistSectionProps {
  setActiveSection: (section: string) => void;
}

export default function WishlistSection({ setActiveSection }: WishlistSectionProps) {
  const { t, language, currency } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWishlist = async () => {
      try {
        const response = await fetch("/api/user/wishlist");
        if (response.ok) {
          const data = await response.json();
          setItems(data.items || []);
        } else {
          console.error("Failed to fetch wishlist");
        }
      } catch (error) {
        console.error("Error fetching wishlist:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    try {
      const response = await fetch(`/api/user/wishlist/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to remove from wishlist");
      }

      toast.success(t("Removed from wishlist", "از علاقه‌مندی‌ها حذف شد"));
      // Refresh wishlist
      const refreshResponse = await fetch("/api/user/wishlist");
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        setItems(data.items || []);
      }
    } catch (error: any) {
      console.error("Error removing from wishlist:", error);
      toast.error(t("Failed to remove from wishlist", "خطا در حذف از علاقه‌مندی‌ها"));
    }
  };

  const getProductName = (item: WishlistItem) => {
    return language === "fa" && item.product.nameFa
      ? item.product.nameFa
      : item.product.name;
  };

  const getProductUrl = (item: WishlistItem) => {
    return item.product.slug
      ? `/products/${item.product.slug}`
      : `/products/${item.product.id}`;
  };

  return (
    <>
      <button
        className={styles.backButton}
        onClick={() => setActiveSection("home")}
      >
        <FiArrowLeft />
        <span>{t("Back to Dashboard", "بازگشت به داشبورد")}</span>
      </button>

      <div className={styles.dashboardCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <span><FiHeart /></span>
            <span>{t("My Wishlist", "علاقه‌مندی‌های من")}</span>
          </h3>
        </div>

        {loading ? (
          <SkeletonLoader type="list" count={4} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<FiHeart />}
            title={t("Your Wishlist is Empty", "علاقه‌مندی‌های شما خالی است")}
            titleFa="علاقه‌مندی‌های شما خالی است"
            description={t("Add products you love to your wishlist", "محصولات مورد علاقه خود را به لیست علاقه‌مندی‌ها اضافه کنید")}
            descriptionFa="محصولات مورد علاقه خود را به لیست علاقه‌مندی‌ها اضافه کنید"
            action={{
              label: t("Browse Products", "مشاهده محصولات"),
              labelFa: "مشاهده محصولات",
              onClick: () => router.push("/products")
            }}
          />
        ) : (
          <div className={styles.wishlistGrid}>
            {items.map((item) => (
              <SwipeableItem
                key={item.id}
                onDelete={() => handleRemove(item.productId)}
                deleteLabel={t("Remove", "حذف")}
              >
                <div className={styles.wishlistItem}>
                  <Link href={getProductUrl(item)} className={styles.wishlistItemImage}>
                    <img
                      src={item.product.image || "/placeholder-product.jpg"}
                      alt={getProductName(item)}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder-product.jpg";
                      }}
                    />
                  </Link>
                  <div className={styles.wishlistItemInfo}>
                    <Link href={getProductUrl(item)} className={styles.wishlistItemName}>
                      {getProductName(item)}
                    </Link>
                    <div className={styles.wishlistItemPrice}>
                      {formatPrice(item.product.price || "0", language, currency ?? "toman")}
                    </div>
                    <div className={styles.wishlistItemActions}>
                      <button
                        className={styles.removeBtn}
                        onClick={() => handleRemove(item.productId)}
                        title={t("Remove from wishlist", "حذف از علاقه‌مندی‌ها")}
                      >
                        <FiTrash2 />
                        <span>{t("Remove", "حذف")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </SwipeableItem>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

