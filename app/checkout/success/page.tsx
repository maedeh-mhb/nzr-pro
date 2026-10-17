"use client";


import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "@/lib/utils/language";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomBar from "@/components/BottomBar";
import BackButton from "@/components/ui/BackButton";
import CheckoutProgressBar from "@/components/checkout/CheckoutProgressBar";
import Link from "next/link";
import Button from "@/components/ui/Button";
import OrderEditor from "@/components/orders/OrderEditor";
import { FaTelegram, FaInstagram, FaWhatsapp } from "react-icons/fa";
import { FiCheckCircle, FiCreditCard, FiSend, FiCopy, FiMessageCircle } from "react-icons/fi";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import styles from "@/styles/pages/_checkoutSuccess.module.scss";

interface OrderItem {
  productId: string;
  productName: string;
  productNameFa?: string | null;
  quantity: number;
  price: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  paymentMethod: string | null;
  shippingMethod: string | null;
  discountAmount: string | null;
  createdAt: Date | string;
  isGuest: boolean;
  canEdit: boolean;
  editExpiresAt: string;
}

interface BankCard {
  bankName: string;
  cardNumber: string;
  cardHolder: string;
  iban: string | null;
}

interface ContactSettings {
  telegram: string | null;
  instagram: string | null;
  whatsapp: string | null;
  rubika: string | null;
  phone: string | null;
}

export default function CheckoutSuccessPage() {
  const { t, language, currency } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [bankCard, setBankCard] = useState<BankCard | null>(null);
  const [contactSettings, setContactSettings] = useState<ContactSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [editToken, setEditToken] = useState<string | null>(null);

  useEffect(() => {
    const orderNum = searchParams.get("orderNumber");
    const ps = searchParams.get("paymentStatus");
    const tid = searchParams.get("trackId");

    if (ps) setPaymentStatus(ps);
    if (tid) setTrackId(tid);

    if (!orderNum) {
      // Show a loading state instead of immediately redirecting
      // This gives the router time to process the navigation
      setIsLoading(false);
      setError("No order number provided");
      // Redirect after a short delay
      const timer = setTimeout(() => {
        router.push("/products");
      }, 2000);
      return () => clearTimeout(timer);
    }
    setEditToken(sessionStorage.getItem(`guest-order-edit:${orderNum}`));
    setOrderNumber(orderNum);
  }, [searchParams, router]);

  useEffect(() => {
    const fetchData = async () => {
      if (!orderNumber) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch order details
        const orderResponse = await fetch(`/api/orders/${orderNumber}`);
        if (!orderResponse.ok) {
          throw new Error("Failed to fetch order");
        }
        const orderData = await orderResponse.json();
        setOrder(orderData.order);
        setOrderItems(orderData.items);

        // Only fetch bank card and contact settings if payment is card_to_card
        if (orderData.order.paymentMethod === "card_to_card") {
          // Fetch default bank card
          try {
            const bankResponse = await fetch("/api/bank-settings/default");
            if (bankResponse.ok) {
              const bankData = await bankResponse.json();
              setBankCard(bankData);
            }
          } catch (err) {
            console.error("Error fetching bank card:", err);
          }

          // Fetch contact settings for social media links
          try {
            const contactResponse = await fetch("/api/contact-settings");
            if (contactResponse.ok) {
              const contactData = await contactResponse.json();
              setContactSettings({
                telegram: contactData.telegram,
                instagram: contactData.instagram,
                whatsapp: contactData.whatsapp,
                rubika: contactData.rubika,
                phone: contactData.phone,
              });
            }
          } catch (err) {
            console.error("Error fetching contact settings:", err);
          }
        }
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "Failed to load order");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [orderNumber]);

  if (!orderNumber) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <p>{t("Loading...", "در حال بارگذاری...")}</p>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <p>{t("Loading...", "در حال بارگذاری...")}</p>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  if (error || !order) {
    return (
      <>
        <Navbar />
        <div className={styles.container}>
          <div className={styles.errorCard}>
            <p>{t("Error loading order", "خطا در بارگذاری سفارش")}</p>
            <BackButton
              href="/products"
              label={t("Back to Shop", "بازگشت به فروشگاه")}
              variant="outlined"
            />
          </div>
        </div>
        <Footer />
        <BottomBar />
      </>
    );
  }

  const isCardToCard = order.paymentMethod === "card_to_card";
  const isOnlinePayment = order.paymentMethod === "online_payment";
  const isCourier = order.shippingMethod === "courier";
  const isIranianPost = order.shippingMethod === "iranian_post";

  // Calculate subtotal from items
  const subtotal = orderItems.reduce((sum, item) => {
    return sum + parseFloat(item.price) * item.quantity;
  }, 0);

  // Calculate shipping cost
  // Total = subtotal + shipping - discount
  // So: shipping = total - subtotal + discount
  const discountAmount = order.discountAmount ? parseFloat(order.discountAmount) : 0;
  const total = parseFloat(order.total);
  const shippingCost = Math.max(0, total - subtotal + discountAmount);

  return (
    <>
      <Navbar />
      <div className={styles.container}>
        <CheckoutProgressBar currentStep="complete" includeAccountStep={false} />
        <div className={styles.successCard}>
          <FiCheckCircle className={styles.successIcon} />
          <h1 className={styles.title}>
            {t("Order Placed Successfully!", "سفارش با موفقیت ثبت شد!")}
          </h1>

          {isCardToCard ? (
            <>
              <p className={styles.message}>
                {t(
                  "Your order has been placed successfully. Payment is pending. Please complete the payment to proceed.",
                  "سفارش شما با موفقیت ثبت شد. پرداخت در انتظار است. لطفاً پرداخت را تکمیل کنید."
                )}
              </p>

              {/* Order Summary */}
              <div className={styles.orderSummary}>
                <h2 className={styles.sectionTitle}>
                  {t("Order Summary", "خلاصه سفارش")}
                </h2>
                <div className={styles.orderNumber}>
                  <span className={styles.orderNumberLabel}>
                    {t("Order Number", "شماره سفارش")}:
                  </span>
                  <span className={styles.orderNumberValue}>{order.orderNumber}</span>
                </div>

                {/* Order Items */}
                <div className={styles.orderItems}>
                  {orderItems.map((item, index) => (
                    <div key={index} className={styles.orderItem}>
                      <div className={styles.itemInfo}>
                        <span className={styles.itemName}>
                          {language === "fa" && item.productNameFa ? item.productNameFa : item.productName}
                        </span>
                        <span className={styles.itemQuantity}>x{item.quantity}</span>
                      </div>
                      <span className={styles.itemPrice}>
                        {formatPrice(
                          parseFloat(item.price) * item.quantity,
                          language,
                          currency || "toman"
                        )}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Price Breakdown */}
                <div className={styles.priceBreakdown}>
                  <div className={styles.priceRow}>
                    <span>{t("Subtotal", "جمع کل")}</span>
                    <span>{formatPrice(subtotal, language, currency || "toman")}</span>
                  </div>
                  {shippingCost > 0 && (
                    <div className={styles.priceRow}>
                      <span>{t("Shipping", "هزینه ارسال")}</span>
                      <span>
                        {isCourier
                          ? language === "fa"
                            ? "بر عهده خریدار"
                            : "Paid by Customer"
                          : formatPrice(shippingCost, language, currency || "toman")}
                      </span>
                    </div>
                  )}
                  {discountAmount > 0 && (
                    <div className={styles.priceRow}>
                      <span>{t("Discount", "تخفیف")}</span>
                      <span>-{formatPrice(discountAmount, language, currency || "toman")}</span>
                    </div>
                  )}
                  <div className={styles.priceRowTotal}>
                    <span>{t("Total", "مجموع")}</span>
                    <span>{formatPrice(total, language, currency || "toman")}</span>
                  </div>
                </div>
              </div>

              {order.canEdit && order.editExpiresAt && !order.isGuest && (
                <div className={styles.priceBreakdown} style={{ marginTop: "1rem" }}>
                  <p>
                    {t(
                      "You can edit your order for up to one hour after placing it: change quantities, remove items or add new products. If the total increases you can pay the difference; if it decreases, the difference is added to your wallet. Shipping cost is recalculated based on your updated order and what you have paid.",
                      "تا یک ساعت پس از ثبت سفارش می‌توانید آن را ویرایش کنید: تعداد را تغییر دهید، محصولی حذف کنید یا محصول جدید اضافه کنید. در صورت افزایش مبلغ می‌توانید مابه‌التفاوت را پرداخت کنید و در صورت کاهش، مبلغ به کیف پول شما اضافه می‌شود. هزینه ارسال نیز بر اساس سفارش جدید و مبلغ پرداخت‌شده محاسبه می‌شود."
                    )}
                  </p>
                  <Link href="/dashboard?section=orders">
                    <Button>{t("Edit my order", "ویرایش سفارش من")}</Button>
                  </Link>
                </div>
              )}

              {order.canEdit && order.editExpiresAt && order.isGuest && editToken && (
                <OrderEditor
                  orderId={order.id}
                  items={orderItems}
                  editExpiresAt={order.editExpiresAt}
                  editToken={order.isGuest ? editToken : null}
                  onSaved={(updatedTotal, updatedItems, _shippingCost, updatedDiscount, paymentRequired) => {
                    setOrderItems(updatedItems);
                    setOrder((current) => current
                      ? {
                          ...current,
                          total: updatedTotal,
                          discountAmount: updatedDiscount,
                          status: updatedItems.length ? current.status : "cancelled",
                          canEdit: updatedItems.length > 0 && !paymentRequired,
                        }
                      : current);
                    if (!updatedItems.length) {
                      toast.success(t("Order canceled", "سفارش لغو شد"));
                    }
                  }}
                />
              )}

              {/* Bank Card Details */}
              {bankCard && (
                <div className={styles.bankCardSection}>
                  <h2 className={styles.sectionTitle}>
                    <FiCreditCard />
                    {t("Payment Details", "جزئیات پرداخت")}
                  </h2>
                  <div className={styles.bankCard}>
                    <div className={styles.bankInfo}>
                      <span className={styles.bankLabel}>
                        {t("Bank", "بانک")}:
                      </span>
                      <span className={styles.bankValue}>{bankCard.bankName}</span>
                    </div>
                    <div className={styles.bankInfo}>
                      <span className={styles.bankLabel}>
                        {t("Card Number", "شماره کارت")}:
                      </span>
                      <div className={styles.bankValueWithCopy}>
                        <span className={styles.bankValue}>{bankCard.cardNumber}</span>
                        <button
                          className={styles.copyButton}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(bankCard.cardNumber);
                              toast.success(
                                t("Card number copied!", "شماره کارت کپی شد!")
                              );
                            } catch (err) {
                              toast.error(
                                t("Failed to copy", "خطا در کپی کردن")
                              );
                            }
                          }}
                          title={t("Copy card number", "کپی شماره کارت")}
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>
                    <div className={styles.bankInfo}>
                      <span className={styles.bankLabel}>
                        {t("Card Holder", "صاحب کارت")}:
                      </span>
                      <span className={styles.bankValue}>{bankCard.cardHolder}</span>
                    </div>
                    {bankCard.iban && (
                      <div className={styles.bankInfo}>
                        <span className={styles.bankLabel}>
                          {t("IBAN", "شبا")}:
                        </span>
                        <span className={styles.bankValue}>{bankCard.iban}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Instructions */}
              <div className={styles.instructionsSection}>
                <h2 className={styles.sectionTitle}>
                  <FiSend />
                  {t("Next Steps", "مراحل بعدی")}
                </h2>
                <p className={styles.instructionText}>
                  {t(
                    "Please transfer the order amount to the bank card above and send a screenshot of your payment to one of our social media channels:",
                    "لطفاً مبلغ سفارش را به کارت بانکی بالا واریز کرده و تصویر رسید پرداخت را به یکی از کانال‌های اجتماعی ما ارسال کنید:"
                  )}
                </p>

                {/* Social Media Links */}
                {contactSettings && (
                  <div className={styles.socialLinks}>
                    {contactSettings.telegram && (
                      <a
                        href={contactSettings.telegram.startsWith("http") ? contactSettings.telegram : `https://t.me/${contactSettings.telegram.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                        <FaTelegram />
                        <span>
                          {contactSettings.telegram.startsWith("@")
                            ? contactSettings.telegram
                            : `@${contactSettings.telegram}`}
                        </span>
                      </a>
                    )}
                    {contactSettings.rubika && (
                      <a
                        href={contactSettings.rubika.startsWith("http") ? contactSettings.rubika : `https://rubika.ir/${contactSettings.rubika.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.socialLink}
                      >
                            <img 
                              src="/images/rubika.png" 
                              alt={language === "fa" ? "روبیکا" : "Rubika"} 
                              style={{ width: '20px', height: '20px' }}
                            />
                        <span>
                          {contactSettings.rubika.startsWith("@")
                            ? contactSettings.rubika
                            : `@${contactSettings.rubika}`}
                        </span>
                      </a>
                    )}
                    {contactSettings.phone && (
                      <a
                        href={`tel:${contactSettings.phone.replace(/[^0-9]/g, "")}`}
                        className={styles.socialLink}
                      >
                        <FiMessageCircle />
                        <span>{contactSettings.phone}</span>
                      </a>
                    )}
                  </div>
                )}
                


                {/* Courier Fee Notice */}
                {isCourier && (
                  <div className={styles.courierNotice}>
                    <p>
                      {t(
                        "Note: Courier fees are payable by the customer upon delivery.",
                        "توجه: هزینه ارسال با پیک بر عهده خریدار است و در زمان تحویل پرداخت می‌شود."
                      )}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : isOnlinePayment ? (
            <>
              {paymentStatus === "success" ? (
                <>
                  <p className={styles.message} style={{ color: "#16a34a" }}>
                    {t(
                      "Your payment was successful! Your order is being processed.",
                      "پرداخت شما با موفقیت انجام شد! سفارش در حال پردازش است."
                    )}
                  </p>
                  <div className={styles.orderNumber}>
                    <span className={styles.orderNumberLabel}>
                      {t("Order Number", "شماره سفارش")}:
                    </span>
                    <span className={styles.orderNumberValue}>{order.orderNumber}</span>
                  </div>
                  {trackId && (
                    <p className={styles.note}>
                      {t("Transaction ID", "شناسه تراکنش")}: {trackId}
                    </p>
                  )}
                </>
              ) : paymentStatus === "failed" ? (
                <>
                  <p className={styles.message} style={{ color: "#dc2626" }}>
                    {t(
                      "Payment was not completed. Your order is saved but not yet paid.",
                      "پرداخت تکمیل نشد. سفارش شما ذخیره شده اما پرداخت نشده است."
                    )}
                  </p>
                  <div className={styles.orderNumber}>
                    <span className={styles.orderNumberLabel}>
                      {t("Order Number", "شماره سفارش")}:
                    </span>
                    <span className={styles.orderNumberValue}>{order.orderNumber}</span>
                  </div>
                  <p style={{ marginTop: "1rem", fontSize: "0.95rem" }}>
                    {t(
                      "You can try again or use card-to-card payment.",
                      "می‌توانید دوباره تلاش کنید یا از پرداخت کارت به کارت استفاده کنید."
                    )}
                  </p>
                  <Link href={`/checkout?retryOrder=${order.orderNumber}`}>
                    <Button variant="save" style={{ marginTop: "1rem" }}>
                      {t("Retry Payment", "تلاش مجدد پرداخت")}
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className={styles.message}>
                    {t(
                      "Your order has been placed. Redirecting to payment gateway...",
                      "سفارش شما ثبت شد. در حال انتقال به درگاه پرداخت..."
                    )}
                  </p>
                  <div className={styles.orderNumber}>
                    <span className={styles.orderNumberLabel}>
                      {t("Order Number", "شماره سفارش")}:
                    </span>
                    <span className={styles.orderNumberValue}>{order.orderNumber}</span>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <p className={styles.message}>
                {t(
                  "Thank you for your order. We have received your order and will process it shortly.",
                  "از سفارش شما متشکریم. سفارش شما دریافت شده و به زودی پردازش خواهد شد."
                )}
              </p>
              <div className={styles.orderNumber}>
                <span className={styles.orderNumberLabel}>
                  {t("Order Number", "شماره سفارش")}:
                </span>
                <span className={styles.orderNumberValue}>{order.orderNumber}</span>
              </div>
              <p className={styles.note}>
                {t(
                  "A confirmation email has been sent to your email address.",
                  "ایمیل تأیید به آدرس ایمیل شما ارسال شده است."
                )}
              </p>
            </>
          )}

          <div className={styles.actions}>
            <Link href="/products">
              <Button>{t("Continue Shopping", "ادامه خرید")}</Button>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
      <BottomBar />
    </>
  );
}
