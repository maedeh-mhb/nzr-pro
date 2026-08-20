"use client";

import { useCart, CartItem as CartItemType } from "@/lib/contexts/CartContext";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiPlus, FiMinus, FiTrash2 } from "react-icons/fi";
import Link from "next/link";
import toast from "react-hot-toast";
// Using regular img tag for cart items to avoid Next.js Image configuration issues
import styles from "@/styles/components/_cartItem.module.scss";

interface CartItemProps {
  item: CartItemType;
}

export default function CartItem({ item }: CartItemProps) {
  const { updateQuantity, removeItem, selectedItems, toggleItemSelection } = useCart();
  const { language, currency } = useLanguage();
  const isSelected = selectedItems.has(item.id);

  const displayName = language === "fa" && item.nameFa ? item.nameFa : item.name;
  const price = parseFloat(item.price) || 0;
  const subtotal = price * item.quantity;
  const displayCurrency = currency || "toman";
  const formattedPrice = formatPrice(price, language, displayCurrency);
  const formattedSubtotal = formatPrice(subtotal, language, displayCurrency);

  // Debug: Log maxOrderQuantity to verify it's being loaded
  // console.log('CartItem maxOrderQuantity:', item.maxOrderQuantity, 'quantity:', item.quantity, 'productId:', item.productId);

  const handleQuantityChange = async (newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(item.productId);
      return;
    }

    // Validate min order quantity
    if (item.minOrderQuantity !== null && item.minOrderQuantity !== undefined && newQuantity < item.minOrderQuantity) {
      toast.error(
        language === "fa"
          ? `حداقل تعداد سفارش ${item.minOrderQuantity} است`
          : `Minimum order quantity is ${item.minOrderQuantity}`
      );
      return;
    }

    // Validate max order quantity - check both null/undefined and actual value
    const hasMaxLimit = item.maxOrderQuantity !== null && item.maxOrderQuantity !== undefined && item.maxOrderQuantity > 0;
    if (hasMaxLimit && newQuantity > item.maxOrderQuantity!) {
      toast.error(
        language === "fa"
          ? `شما نمی‌توانید بیش از ${item.maxOrderQuantity} عدد از این محصول اضافه کنید`
          : `You can not add more than ${item.maxOrderQuantity} of this product`
      );
      return;
    }

    try {
      await updateQuantity(item.productId, newQuantity);
    } catch (error: any) {
      toast.error(
        error.message || (language === "fa" ? "خطا در به‌روزرسانی تعداد" : "Failed to update quantity")
      );
    }
  };

  // Check if increase button should be disabled
  // If maxOrderQuantity is null/undefined/0, there's no limit (can always increase)
  // Otherwise, disable if current quantity is already at or above the limit
  const hasMaxLimit = item.maxOrderQuantity !== null && item.maxOrderQuantity !== undefined && item.maxOrderQuantity > 0;
  const canIncrease = !hasMaxLimit || item.quantity < item.maxOrderQuantity!;

  // Check if decrease button should be disabled
  // If minOrderQuantity is null/undefined/0, can always decrease (unless quantity is 1)
  // Otherwise, disable if current quantity is at or below the minimum
  const hasMinLimit = item.minOrderQuantity !== null && item.minOrderQuantity !== undefined && item.minOrderQuantity > 0;
  const canDecrease = !hasMinLimit || item.quantity > item.minOrderQuantity!;

  // Debug: Uncomment to check values in console
  // if (hasMaxLimit) {
  //   console.log('CartItem:', {
  //     productId: item.productId,
  //     quantity: item.quantity,
  //     maxOrderQuantity: item.maxOrderQuantity,
  //     canIncrease,
  //     hasMaxLimit
  //   });
  // }

  const handleRemove = () => {
    removeItem(item.productId);
    toast.success(
      language === "fa"
        ? "محصول از سبد خرید شما حذف شد"
        : "Product removed from your cart"
    );
  };

  return (
    <div className={`${styles.cartItem} ${isSelected ? styles.selected : ""}`}>
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => toggleItemSelection(item.id)}
        className={styles.checkbox}
        aria-label={language === "fa" ? "انتخاب آیتم" : "Select item"}
      />
      {item.image ? (
        <Link
          href={item.slug ? `/products/${item.slug}` : "#"}
          className={styles.imageLink}
        >
          <div className={styles.imageContainer}>
            <img
              src={item.image}
              alt={displayName}
              className={styles.image}
            />
          </div>
        </Link>
      ) : (
        <div className={styles.imagePlaceholder} />
      )}

      <div className={styles.content}>
        <Link
          href={item.slug ? `/products/${item.slug}` : "#"}
          className={styles.name}
        >
          {displayName}
        </Link>
        <div className={styles.priceRow}>
          <span className={styles.price}>{formattedPrice}</span>
          <span className={styles.subtotal}>{formattedSubtotal}</span>
        </div>

        <div className={styles.controls}>
          <div className={styles.quantityControls}>
            <button
              className={styles.quantityButton}
              onClick={() => handleQuantityChange(item.quantity - 1)}
              disabled={!canDecrease}
              aria-label="Decrease quantity"
            >
              <FiMinus />
            </button>
            <span className={styles.quantity}>{item.quantity}</span>
            <button
              className={styles.quantityButton}
              onClick={() => handleQuantityChange(item.quantity + 1)}
              disabled={!canIncrease}
              aria-label="Increase quantity"
            >
              <FiPlus />
            </button>
          </div>
          <button
            className={styles.removeButton}
            onClick={handleRemove}
            aria-label="Remove item"
          >
            <FiTrash2 />
          </button>
        </div>
      </div>
    </div>
  );
}

