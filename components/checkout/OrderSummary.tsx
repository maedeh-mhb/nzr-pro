"use client";

import { useState } from "react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import Image from "next/image";
import { FiChevronDown, FiChevronUp, FiTag, FiTruck, FiPercent } from "react-icons/fi";
import styles from "@/styles/components/_orderSummary.module.scss";
import ShippingCostNotice from "@/components/checkout/ShippingCostNotice";

interface OrderSummaryItem {
    productId: string;
    name: string;
    nameFa?: string | null;
    quantity: number;
    price: string;
    image?: string | null;
}

interface OrderSummaryProps {
    items: OrderSummaryItem[];
    subtotal: number;
    shippingCost: number | null;
    discountAmount: number;
    total: number;
    isSticky?: boolean;
    isMobileCollapsible?: boolean;
    hasAddress?: boolean;
}

export default function OrderSummary({
    items,
    subtotal,
    shippingCost,
    discountAmount,
    total,
    isSticky = true,
    isMobileCollapsible = false,
    hasAddress = false,
}: OrderSummaryProps) {
    const { t, language, currency } = useLanguage();
    const [isMobileExpanded, setIsMobileExpanded] = useState(true);

    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const displayCurrency = currency || "toman";

    return (
        <div className={`${styles.orderSummary} ${isSticky ? styles.sticky : ""}`}>
            {/* Mobile Header (Collapsible) */}
            {isMobileCollapsible && (
                <div
                    className={styles.mobileHeader}
                    onClick={() => setIsMobileExpanded(!isMobileExpanded)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setIsMobileExpanded(!isMobileExpanded);
                        }
                    }}
                >
                    <div className={styles.mobileHeaderContent}>
                        <span className={styles.mobileHeaderTitle}>
                            {t("Order Summary", "خلاصه سفارش")}
                        </span>
                        <div className={styles.mobileHeaderRight}>
                            <span className={styles.mobileTotal}>
                                {formatPrice(total, language, displayCurrency)}
                            </span>
                            {isMobileExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </div>
                    </div>
                </div>
            )}

            {/* Summary Content */}
            <div
                className={`${styles.summaryContent} ${isMobileCollapsible && !isMobileExpanded ? styles.collapsed : ""
                    }`}
            >
                {/* Desktop Title */}
                <h3 className={styles.desktopTitle}>{t("Order Summary", "خلاصه سفارش")}</h3>

                {/* Items List */}
                <div className={styles.itemsList}>
                    {items.map((item) => (
                        <div key={item.productId} className={styles.summaryItem}>
                            {/* Product Image */}
                            <div className={styles.itemImage}>
                                {item.image ? (
                                    <Image
                                        src={item.image}
                                        alt={language === "fa" && item.nameFa ? item.nameFa : item.name}
                                        width={60}
                                        height={60}
                                        className={styles.productImage}
                                    />
                                ) : (
                                    <div className={styles.placeholderImage}>
                                        <FiTag />
                                    </div>
                                )}
                                {item.quantity > 1 && (
                                    <span className={styles.itemQuantityBadge}>{item.quantity}</span>
                                )}
                            </div>

                            {/* Product Info */}
                            <div className={styles.itemInfo}>
                                <h4 className={styles.itemName}>
                                    {language === "fa" && item.nameFa ? item.nameFa : item.name}
                                </h4>
                                <p className={styles.itemPrice}>
                                    {formatPrice(parseFloat(item.price) * item.quantity, language, displayCurrency)}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.divider} />

                {/* Cost Breakdown */}
                <div className={styles.costBreakdown}>
                    {/* Subtotal */}
                    <div className={styles.costRow}>
                        <span className={styles.costLabel}>
                            {t("Subtotal", "جمع جزء")} ({totalItems} {t("items", "مورد")})
                        </span>
                        <span className={styles.costValue}>
                            {formatPrice(subtotal, language, displayCurrency)}
                        </span>
                    </div>

                    {/* Shipping */}
                    <div className={styles.costRow}>
                        <span className={styles.costLabel}>
                            <FiTruck className={styles.costIcon} />
                            {t("Shipping", "هزینه ارسال")}
                        </span>
                        <span className={styles.costValue}>
                            {!hasAddress
                                ? t("Add your address", "آدرس خود را اضافه کنید")
                                : shippingCost === null
                                    ? t("Calculated at next step", "محاسبه در مرحله بعد")
                                    : shippingCost === 0
                                        ? t("Free", "رایگان")
                                        : formatPrice(shippingCost, language, displayCurrency)}
                        </span>
                    </div>
                    <ShippingCostNotice />

                    {/* Discount */}
                    {discountAmount > 0 && (
                        <div className={`${styles.costRow} ${styles.discount}`}>
                            <span className={styles.costLabel}>
                                <FiPercent className={styles.costIcon} />
                                {t("Discount", "تخفیف")}
                            </span>
                            <span className={styles.costValue}>
                                -{formatPrice(discountAmount, language, displayCurrency)}
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.divider} />

                {/* Total */}
                <div className={styles.totalRow}>
                    <span className={styles.totalLabel}>{t("Total", "مجموع")}</span>
                    <span className={styles.totalValue}>
                        {formatPrice(total, language, displayCurrency)}
                    </span>
                </div>

                {/* Savings Badge */}
                {discountAmount > 0 && (
                    <div className={styles.savingsBadge}>
                        {t("You save", "شما صرفه‌جویی می‌کنید")}: {formatPrice(discountAmount, language, displayCurrency)}
                    </div>
                )}
            </div>
        </div>
    );
}
