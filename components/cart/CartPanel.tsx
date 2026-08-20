"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/contexts/CartContext";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiX, FiShoppingCart, FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import styles from "@/styles/components/_cartPanel.module.scss";
import CartItem from "./CartItem";

export default function CartPanel() {
  const {
    isOpen,
    closeCart,
    items,
    getTotalItems,
    getTotalPrice,
    isLoading,
    selectedItems,
    selectAllItems,
    deselectAllItems,
    getSelectedItems,
  } = useCart();
  const { t, language, currency } = useLanguage();

  const selectedItemsList = getSelectedItems();
  const selectedCount = selectedItems.size;
  const selectedTotal = selectedItemsList.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + price * item.quantity;
  }, 0);
  const allSelected = items.length > 0 && selectedCount === items.length;
  const panelRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // Handle swipe to close on mobile
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    // Close on swipe away from the panel (left for LTR, right for RTL)
    if ((language === "en" && isLeftSwipe) || (language === "fa" && isRightSwipe)) {
      closeCart();
    }
  };

  // Keep the cart panel aligned to the viewport on mobile.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateCartPanelPosition = () => {
      if (panelRef.current && window.innerWidth <= 640) {
        panelRef.current.style.top = "0px";
      }
    };

    updateCartPanelPosition();
    window.addEventListener("resize", updateCartPanelPosition);

    return () => {
      window.removeEventListener("resize", updateCartPanelPosition);
    };
  }, [isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        closeCart();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when cart is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, closeCart]);

  // Focus trap
  useEffect(() => {
    if (isOpen && panelRef.current) {
      const focusableElements = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTab = (e: KeyboardEvent) => {
        if (e.key !== "Tab") return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      };

      firstElement?.focus();
      document.addEventListener("keydown", handleTab);

      return () => {
        document.removeEventListener("keydown", handleTab);
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={closeCart}
        aria-hidden="true"
      />

      {/* Cart Panel */}
      <div
        ref={panelRef}
        className={`${styles.cartPanel} ${isOpen ? styles.open : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("Shopping Cart", "سبد خرید")}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <h2 className={styles.title}>
              {t("Shopping Cart", "سبد خرید")}
              {totalItems > 0 && (
                <span className={styles.itemCount}>({totalItems})</span>
              )}
            </h2>
            <button
              className={styles.closeButton}
              onClick={closeCart}
              aria-label={t("Close cart", "بستن سبد خرید")}
            >
              <FiX />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {isLoading ? (
            <div className={styles.loading}>
              <p>{t("Loading...", "در حال بارگذاری...")}</p>
            </div>
          ) : items.length === 0 ? (
            <div className={styles.empty}>
              <FiShoppingCart className={styles.emptyIcon} />
              <p className={styles.emptyText}>
                {t("Your cart is empty", "سبد خرید شما خالی است")}
              </p>
              <Link href="/products" className={styles.continueShopping} onClick={closeCart}>
                {t("Continue Shopping", "ادامه خرید")}
              </Link>
            </div>
          ) : (
            <>
              {items.length > 0 && (
                <div className={styles.selectionControls}>
                  <label className={styles.selectAllLabel}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          selectAllItems();
                        } else {
                          deselectAllItems();
                        }
                      }}
                      className={styles.selectAllCheckbox}
                    />
                    <span className={styles.selectAllText}>
                      {allSelected
                        ? t("Deselect All", "انصراف از همه")
                        : t("Select All", "انتخاب همه")}
                    </span>
                  </label>
                  {selectedCount > 0 && (
                    <span className={styles.selectedCount}>
                      {t("Selected", "انتخاب شده")}: {selectedCount}
                    </span>
                  )}
                </div>
              )}
              <div className={styles.itemsList}>
                {items.map((item) => (
                  <CartItem key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.total}>
              <span className={styles.totalLabel}>
                {selectedCount > 0 && selectedCount < items.length
                  ? t("Selected Total", "مجموع انتخاب شده")
                  : t("Total", "مجموع")}:
              </span>
              <span className={styles.totalPrice}>
                {(() => {
                  // Normalize currency to treat all variants of 'toman' as 'toman'
                  const normalizedCurrency = typeof currency === 'string' && currency.toLowerCase().replace(/s$/, "") === 'toman' ? 'toman' : (currency || 'toman');
                  return formatPrice(
                    selectedCount > 0 ? selectedTotal : totalPrice,
                    language,
                    normalizedCurrency
                  );
                })()}
              </span>
            </div>
            <div className={styles.actions}>
              <Link
                href="/checkout"
                className={`${styles.checkoutButton} ${selectedCount === 0 ? styles.disabled : ""
                  }`}
                onClick={(e) => {
                  if (selectedCount === 0) {
                    e.preventDefault();
                    return;
                  }
                  closeCart();
                }}
              >
                {selectedCount > 0 && selectedCount < items.length
                  ? t("Checkout Selected", "تسویه حساب انتخاب شده")
                  : t("Checkout", "تسویه حساب")}
              </Link>
              <Link
                href="/products"
                className={styles.continueButton}
                onClick={closeCart}
              >
                {t("Continue Shopping", "ادامه خرید")}
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

