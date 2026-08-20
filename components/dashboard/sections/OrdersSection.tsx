"use client";

import { useEffect, useState, useRef } from "react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiPackage, FiArrowLeft, FiShoppingCart, FiInfo, FiCheckCircle, FiChevronDown, FiChevronUp } from "react-icons/fi";
import { FaTelegram, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { useCart } from "@/lib/contexts/CartContext";
import { useSession } from "next-auth/react";
import SkeletonLoader from "../SkeletonLoader";
import EmptyState from "../EmptyState";
import OrderStatusTimeline from "../OrderStatusTimeline";
import styles from "@/styles/components/_dashboard.module.scss";

interface OrdersSectionProps {
  setActiveSection: (section: string) => void;
}

interface OrderItem {
  productName: string;
  productNameFa?: string; // Add optional Farsi name
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  paymentMethod: string;
  paymentVerified: Date | string | null;
  shippingMethod: string | null;
  shippingStatus: string | null;
  trackingCode: string | null;
  deliveryConfirmedByUser: string | null;
  items: OrderItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
  isCart?: boolean; // Flag to identify cart items
}

interface ContactSettings {
  telegram: string | null;
  instagram: string | null;
  whatsapp: string | null;
}

export default function OrdersSection({ setActiveSection }: OrdersSectionProps) {
  const { t, language, currency } = useLanguage();
  const { data: session } = useSession();
  const { items: cartItems, getTotalPrice } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [deliveryConfirmationOrderId, setDeliveryConfirmationOrderId] = useState<string | null>(null);
  const [confirmingDelivery, setConfirmingDelivery] = useState(false);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (deliveryConfirmationOrderId && modalRef.current) {
      // Scroll modal into view smoothly
      modalRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
      // Optionally, focus the first button for accessibility
      const firstButton = modalRef.current.querySelector('button');
      if (firstButton) firstButton.focus();
    }
  }, [deliveryConfirmationOrderId]);

  useEffect(() => {
    const fetchContactSettings = async () => {
      try {
        const response = await fetch("/api/contact-settings");
        if (response.ok) {
          const data = await response.json();
          setContactSettings({
            telegram: data.telegram,
            instagram: data.instagram,
            whatsapp: data.whatsapp,
          });
        }
      } catch (error) {
        console.error("Error fetching contact settings:", error);
      }
    };
    fetchContactSettings();
  }, []);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/user/orders");
        if (response.ok) {
          const data = await response.json();
          let allOrders: Order[] = data.data || data.orders || [];

          // Add cart items as a pending order if user is logged in and has cart items
          if (session?.user && cartItems.length > 0) {
            const cartOrder: Order = {
              id: "cart-pending",
              orderNumber: "CART",
              status: "cart_pending",
              total: getTotalPrice().toString(),
              paymentMethod: null as any,
              paymentVerified: null,
              shippingMethod: null,
              shippingStatus: null,
              trackingCode: null,
              deliveryConfirmedByUser: null,
              items: cartItems.map((item) => ({
                productName: language === "fa" && item.nameFa ? item.nameFa : item.name,
                productNameFa: item.nameFa ?? undefined, // Store Farsi name for future use
                quantity: item.quantity,
                price: item.price,
              })),
              createdAt: new Date(),
              updatedAt: new Date(),
              isCart: true,
            };
            // Add cart at the beginning of the orders list
            allOrders = [cartOrder, ...allOrders];
          }

          setOrders(allOrders);
        } else {
          console.error("Failed to fetch orders");
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [session, cartItems, getTotalPrice, language]);

  const getStatusBadgeClass = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
      case "completed":
        return styles.statusDelivered;
      case "processing":
      case "shipped":
        return styles.statusProcessing;
      case "pending":
      case "pending_payment":
      case "cart_pending":
        return styles.statusPending;
      case "cancelled":
      case "canceled":
        return styles.statusCancelled;
      default:
        return styles.statusPending;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case "delivered":
      case "completed":
        return t("Delivered", "تحویل شده");
      case "processing":
        return t("Processing", "در حال پردازش");
      case "shipped":
        return t("Shipped", "ارسال شده");
      case "pending":
      case "pending_payment":
        return t("Pending", "در انتظار");
      case "cart_pending":
        return t("Cart - Awaiting Payment", "سبد خرید - در انتظار پرداخت");
      case "cancelled":
      case "canceled":
        return t("Cancelled", "لغو شده");
      default:
        return status || t("Pending", "در انتظار");
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d);
  };

  const handleConfirmDelivery = async (orderId: string) => {
    try {
      setConfirmingDelivery(true);
      const response = await fetch(`/api/user/orders/${orderId}/confirm-delivery`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        // Update the order in local state
        setOrders(
          orders.map((order) =>
            order.id === orderId
              ? { ...order, deliveryConfirmedByUser: new Date().toISOString() }
              : order
          )
        );
        setDeliveryConfirmationOrderId(null);
      } else {
        console.error("Failed to confirm delivery");
        alert(t("Failed to confirm delivery", "تایید تحویل ناموفق بود"));
      }
    } catch (error) {
      console.error("Error confirming delivery:", error);
      alert(t("Error confirming delivery", "خطا در تایید تحویل"));
    } finally {
      setConfirmingDelivery(false);
    }
  };

  // Divide orders into 3 sections
  const activeCart = orders.find((order) => order.isCart || order.status === "cart_pending");
  const processingOrders = orders.filter(
    (order) =>
      !order.isCart &&
      !order.deliveryConfirmedByUser &&
      ["pending", "pending_payment", "processing", "shipped"].includes(order.status?.toLowerCase())
  );
  const completedOrders = orders.filter(
    (order) =>
      !order.isCart &&
      (order.status?.toLowerCase() === "delivered" || order.status?.toLowerCase() === "completed" || !!order.deliveryConfirmedByUser)
  );

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
            <span><FiPackage /></span>
            <span>{t("Your Orders", "سفارشات شما")}</span>
          </h3>
        </div>
        {loading ? (
          <SkeletonLoader type="list" count={3} />
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<FiPackage />}
            title={t("No Orders Yet", "هنوز سفارشی ثبت نشده")}
            titleFa="هنوز سفارشی ثبت نشده"
            description={t("Start shopping to see your orders here", "برای مشاهده سفارشات خود، شروع به خرید کنید")}
            descriptionFa="برای مشاهده سفارشات خود، شروع به خرید کنید"
            action={{
              label: t("Start Shopping", "شروع خرید"),
              labelFa: "شروع خرید",
              onClick: () => window.location.href = "/products"
            }}
          />
        ) : (
          <div>
            {/* Active Cart Section */}
            {activeCart && (
              <div className={styles.ordersSectionGroup}>
                <h4 className={styles.ordersSectionTitle}>{t("Active Cart", "سبد خرید فعال")}</h4>
                <div className={styles.ordersList}>
                  {/* ...existing code for active cart... */}
                  {(() => {
                    const order = activeCart;
                    const isExpanded = expandedOrderId === order.id;
                    const firstItem = order.items[0];
                    const displayName = (language === "fa" && firstItem?.productNameFa) ? firstItem.productNameFa : firstItem?.productName || "";
                    const itemCount = order.items.length;
                    const totalPrice = parseFloat(order.total) || 0;
                    return (
                      <div key={order.id} className={styles.orderItem}>
                        <button
                          className={styles.orderItemHeader}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className={styles.headerLine1}>
                            <div className={styles.orderNumberWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "سفارش" : t("Order", "Order")}</span>
                              <span className={styles.orderNumber}><FiShoppingCart />{t("Active Cart", "سبد خرید فعال")}</span>
                            </div>
                          </div>
                          <div className={styles.headerLine2}>
                            <div className={styles.productInfoWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "محصول:" : t("Product", "Product")}</span>
                              <span className={styles.orderItemPreview}>{displayName}</span>
                              <span className={styles.itemCount}>{(language === "fa" ? "تعداد" : t("Qty", "Qty"))}: {itemCount}</span>
                            </div>
                            <div className={styles.priceWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "قیمت" : t("Total", "Total")}</span>
                              <span className={styles.orderItemPrice}>{formatPrice(totalPrice, language, currency || "toman")}</span>
                            </div>
                            <div className={styles.expandIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                          </div>
                        </button>
                        {isExpanded && (
                          <div className={styles.orderItemCartContent}>
                            <div className={styles.orderProductInfo}>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Items", "آیتم‌ها")}: </span>
                                <span className={styles.orderProductValue}>{itemCount === 1 ? displayName : `${displayName} ${t("and", "و")} ${itemCount - 1} ${t("more items", "آیتم دیگر")}`}</span>
                              </div>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Total", "کل")}: </span>
                                <span className={styles.orderProductValue}>{formatPrice(totalPrice, language, currency || "toman")}</span>
                              </div>
                            </div>
                            <a href="/checkout" className={styles.continueCheckoutBtn}>{t("Continue Checkout", "ادامه تسویه حساب")}</a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Divider between Active Cart and Processing Orders */}
            {activeCart && processingOrders.length > 0 && <hr className={styles.ordersSectionDivider} />}

            {/* Orders Being Processed Section */}
            {processingOrders.length > 0 && (
              <div className={styles.ordersSectionGroup}>
                <h4 className={styles.ordersSectionTitle}>{t("Orders Being Processed", "سفارشات در حال پردازش")}</h4>
                <div className={styles.ordersList}>
                  {/* ...existing code for processing orders... */}
                  {processingOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const firstItem = order.items[0];
                    const displayName = (language === "fa" && firstItem?.productNameFa) ? firstItem.productNameFa : firstItem?.productName || "";
                    const itemCount = order.items.length;
                    const totalPrice = parseFloat(order.total) || 0;
                    return (
                      <div key={order.id} className={`${styles.orderItem} ${order.deliveryConfirmedByUser ? styles.orderItemCompleted : ""}`}>
                        {/* ...existing code for order header and expandable content... */}
                        {/* Copy the same rendering logic as before for non-cart orders */}
                        <button
                          className={styles.orderItemHeader}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className={styles.headerLine1}>
                            <div className={styles.orderNumberWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "سفارش" : t("Order", "Order")}</span>
                              <span className={styles.orderNumber}>{`#${order.orderNumber}`}</span>
                            </div>
                            <div className={styles.statusWrapperDesktop}>
                              <span className={styles.labelSmall}>{language === "fa" ? "وضعیت:" : t("Status", "Status")}</span>
                              <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                            </div>
                          </div>
                          <div className={styles.statusWrapperMobile}>
                            <span className={styles.labelSmall}>{language === "fa" ? "وضعیت:" : t("Status", "Status")}</span>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                          </div>
                          <div className={styles.headerLine2}>
                            <div className={styles.productInfoWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "محصول:" : t("Product", "Product")}</span>
                              <span className={styles.orderItemPreview}>{displayName}</span>
                              <span className={styles.itemCount}>{(language === "fa" ? "تعداد" : t("Qty", "Qty"))}: {itemCount}</span>
                            </div>
                            <div className={styles.priceWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "قیمت" : t("Total", "Total")}</span>
                              <span className={styles.orderItemPrice}>{formatPrice(totalPrice, language, currency ?? "toman")}</span>
                            </div>
                            <div className={styles.expandIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                          </div>
                          {order.paymentMethod && (
                            <div className={styles.headerLine3}>
                              <span className={styles.labelSmall}>{language === "fa" ? "پرداخت:" : t("Payment", "Payment")}</span>
                              {(() => {
                                let isPaymentSuccessful = false;
                                let statusLabel = "";
                                if (order.paymentMethod === "card_to_card") {
                                  if (order.paymentVerified) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Awaiting Verification", "در انتظار تأیید");
                                  }
                                } else if (order.paymentMethod === "online_payment") {
                                  if (["processing", "shipped", "delivered"].includes(order.status)) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Awaiting Payment", "در انتظار پرداخت");
                                  }
                                } else if (order.paymentMethod === "pay_after_delivery") {
                                  if (order.paymentVerified) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Pay on Delivery", "پرداخت در محل");
                                  }
                                } else {
                                  isPaymentSuccessful = false;
                                  statusLabel = t("Awaiting Payment", "در انتظار پرداخت");
                                }
                                return (
                                  <span className={isPaymentSuccessful ? styles.paymentVerified : styles.paymentPending}>
                                    {isPaymentSuccessful && <FiCheckCircle style={{ marginRight: "0.25rem" }} />}
                                    {statusLabel}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </button>
                        {isExpanded && (
                          <div className={styles.orderItemContent}>
                            {/* ...existing code for expanded content... */}
                            <div className={styles.orderProductInfo}>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Name", "نام")}: </span>
                                <span className={styles.orderProductValue}>{itemCount === 1 ? displayName : `${displayName} ${t("and", "و")} ${itemCount - 1} ${t("more items", "آیتم دیگر")}`}</span>
                              </div>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Price", "قیمت")}: </span>
                                <span className={styles.orderProductValue}>{formatPrice(totalPrice, language, currency ?? "toman")}</span>
                              </div>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Date", "تاریخ")}: </span>
                                <span className={styles.orderProductValue}>{formatDate(order.createdAt)}</span>
                              </div>
                            </div>
                            {order.trackingCode && (
                              <div className={styles.orderTrackingCode}>
                                <span className={styles.orderTrackingLabel}>{t("Tracking Code", "کد رهگیری")}: </span>
                                <span className={styles.orderTrackingValue}>{order.trackingCode}</span>
                              </div>
                            )}
                            {/* ...existing code for payment status, completed status, payment screenshot, timeline... */}
                            {order.paymentMethod && (
                              <div className={styles.orderPaymentStatus}>
                                {/* ...reuse payment status logic... */}
                              </div>
                            )}
                            {order.deliveryConfirmedByUser && (
                              <div className={styles.orderCompletedStatus}>
                                <h5 className={styles.detailsSubtitle}>{t("Order Status", "وضعیت سفارش")}</h5>
                                <span className={styles.orderCompletedBadge}><FiCheckCircle />{t("Order Completed", "سفارش تکمیل شد")}</span>
                              </div>
                            )}
                            <OrderStatusTimeline
                              orderId={order.id}
                              currentStatus={order.status}
                              deliveryConfirmedByUser={order.deliveryConfirmedByUser}
                              onRequestDeliveryConfirmation={order.status?.toLowerCase() === "delivered" && !order.deliveryConfirmedByUser ? () => setDeliveryConfirmationOrderId(order.id) : undefined}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Divider between Processing Orders and Completed Orders */}
            {processingOrders.length > 0 && completedOrders.length > 0 && <hr className={styles.ordersSectionDivider} />}

            {/* Completed Orders Section */}
            {completedOrders.length > 0 && (
              <div className={styles.ordersSectionGroup}>
                <h4 className={styles.ordersSectionTitle}>{t("Completed Orders", "سفارشات تکمیل شده")}</h4>
                <div className={styles.ordersList}>
                  {/* ...existing code for completed orders... */}
                  {completedOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const firstItem = order.items[0];
                    const displayName = (language === "fa" && firstItem?.productNameFa) ? firstItem.productNameFa : firstItem?.productName || "";
                    const itemCount = order.items.length;
                    const totalPrice = parseFloat(order.total) || 0;
                    return (
                      <div key={order.id} className={`${styles.orderItem} ${order.deliveryConfirmedByUser ? styles.orderItemCompleted : ""}`}>
                        {/* ...reuse the same rendering logic as above for completed orders... */}
                        <button
                          className={styles.orderItemHeader}
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                        >
                          <div className={styles.headerLine1}>
                            <div className={styles.orderNumberWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "سفارش" : t("Order", "Order")}</span>
                              <span className={styles.orderNumber}>{`#${order.orderNumber}`}</span>
                            </div>
                            <div className={styles.statusWrapperDesktop}>
                              <span className={styles.labelSmall}>{language === "fa" ? "وضعیت:" : t("Status", "Status")}</span>
                              <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                            </div>
                          </div>
                          <div className={styles.statusWrapperMobile}>
                            <span className={styles.labelSmall}>{language === "fa" ? "وضعیت:" : t("Status", "Status")}</span>
                            <span className={`${styles.statusBadge} ${getStatusBadgeClass(order.status)}`}>{getStatusLabel(order.status)}</span>
                          </div>
                          <div className={styles.headerLine2}>
                            <div className={styles.productInfoWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "محصول:" : t("Product", "Product")}</span>
                              <span className={styles.orderItemPreview}>{displayName}</span>
                              <span className={styles.itemCount}>{(language === "fa" ? "تعداد" : t("Qty", "Qty"))}: {itemCount}</span>
                            </div>
                            <div className={styles.priceWrapper}>
                              <span className={styles.labelSmall}>{language === "fa" ? "قیمت" : t("Total", "Total")}</span>
                              <span className={styles.orderItemPrice}>{formatPrice(totalPrice, language, currency ?? "toman")}</span>
                            </div>
                            <div className={styles.expandIcon}>{isExpanded ? <FiChevronUp /> : <FiChevronDown />}</div>
                          </div>
                          {order.paymentMethod && (
                            <div className={styles.headerLine3}>
                              <span className={styles.labelSmall}>{language === "fa" ? "پرداخت:" : t("Payment", "Payment")}</span>
                              {(() => {
                                let isPaymentSuccessful = false;
                                let statusLabel = "";
                                if (order.paymentMethod === "card_to_card") {
                                  if (order.paymentVerified) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Awaiting Verification", "در انتظار تأیید");
                                  }
                                } else if (order.paymentMethod === "online_payment") {
                                  if (["processing", "shipped", "delivered"].includes(order.status)) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Awaiting Payment", "در انتظار پرداخت");
                                  }
                                } else if (order.paymentMethod === "pay_after_delivery") {
                                  if (order.paymentVerified) {
                                    isPaymentSuccessful = true;
                                    statusLabel = t("Payment Verified", "پرداخت تأیید شده");
                                  } else {
                                    isPaymentSuccessful = false;
                                    statusLabel = t("Pay on Delivery", "پرداخت در محل");
                                  }
                                } else {
                                  isPaymentSuccessful = false;
                                  statusLabel = t("Awaiting Payment", "در انتظار پرداخت");
                                }
                                return (
                                  <span className={isPaymentSuccessful ? styles.paymentVerified : styles.paymentPending}>
                                    {isPaymentSuccessful && <FiCheckCircle style={{ marginRight: "0.25rem" }} />}
                                    {statusLabel}
                                  </span>
                                );
                              })()}
                            </div>
                          )}
                        </button>
                        {isExpanded && (
                          <div className={styles.orderItemContent}>
                            {/* ...existing code for expanded content... */}
                            <div className={styles.orderProductInfo}>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Name", "نام")}: </span>
                                <span className={styles.orderProductValue}>{itemCount === 1 ? displayName : `${displayName} ${t("and", "و")} ${itemCount - 1} ${t("more items", "آیتم دیگر")}`}</span>
                              </div>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Price", "قیمت")}: </span>
                                <span className={styles.orderProductValue}>{formatPrice(totalPrice, language, currency ?? "toman")}</span>
                              </div>
                              <div className={styles.orderProductRow}>
                                <span className={styles.orderProductLabel}>{t("Date", "تاریخ")}: </span>
                                <span className={styles.orderProductValue}>{formatDate(order.createdAt)}</span>
                              </div>
                            </div>
                            {order.trackingCode && (
                              <div className={styles.orderTrackingCode}>
                                <span className={styles.orderTrackingLabel}>{t("Tracking Code", "کد رهگیری")}: </span>
                                <span className={styles.orderTrackingValue}>{order.trackingCode}</span>
                              </div>
                            )}
                            {/* ...existing code for payment status, completed status, payment screenshot, timeline... */}
                            {order.paymentMethod && (
                              <div className={styles.orderPaymentStatus}>
                                {/* ...reuse payment status logic... */}
                              </div>
                            )}
                            {order.deliveryConfirmedByUser && (
                              <div className={styles.orderCompletedStatus}>
                                <h5 className={styles.detailsSubtitle}>{t("Order Status", "وضعیت سفارش")}</h5>
                                <span className={styles.orderCompletedBadge}><FiCheckCircle />{t("Order Completed", "سفارش تکمیل شد")}</span>
                              </div>
                            )}
                            <OrderStatusTimeline
                              orderId={order.id}
                              currentStatus={order.status}
                              deliveryConfirmedByUser={order.deliveryConfirmedByUser}
                              onRequestDeliveryConfirmation={order.status?.toLowerCase() === "delivered" && !order.deliveryConfirmedByUser ? () => setDeliveryConfirmationOrderId(order.id) : undefined}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delivery Confirmation Modal */}
      {deliveryConfirmationOrderId && (
        <div className={styles.modalOverlay} onClick={() => setDeliveryConfirmationOrderId(null)}>
          <div
            className={styles.modalContent}
            ref={modalRef}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>{t("Confirm Product Delivery", "تأیید تحویل محصول")}</h4>
            </div>
            <div className={styles.modalBody}>
              <p>{t("Have you received and verified this product delivery?", "آیا این محصول را دریافت و تأیید کرده‌اید؟")}</p>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.modalButtonCancel} onClick={() => setDeliveryConfirmationOrderId(null)} disabled={confirmingDelivery}>{t("Cancel", "لغو")}</button>
              <button className={styles.modalButtonConfirm} onClick={() => handleConfirmDelivery(deliveryConfirmationOrderId)} disabled={confirmingDelivery}>{confirmingDelivery ? t("Confirming...", "در حال تأیید...") : t("Confirm Delivery", "تأیید تحویل")}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
