"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiPackage, FiUser, FiUserX, FiCheckCircle, FiXCircle, FiTruck, FiClock, FiChevronDown, FiChevronUp, FiMessageSquare, FiPlus, FiPrinter } from "react-icons/fi";
import Modal from "./Modal";
import StatusBadge from "./StatusBadge";
import Breadcrumbs from "./Breadcrumbs";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import styles from "@/styles/components/_admin.module.scss";

interface OrderItem {
  id?: string;
  productId?: string;
  productName: string;
  productNameFa?: string | null;
  quantity: number;
  price: string;
  fulfilledQuantity?: number;
}

interface OrderDetails {
  id: string;
  orderNumber: string;
  userId: string | null;
  isGuest: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  guestAddress: {
    provinceId: number;
    cityId: number;
    address: string;
    provinceName?: string | null;
    cityName?: string | null;
    postalCode?: string | null;
  } | null;
  shippingAddress: {
    provinceId: number;
    cityId: number;
    address: string;
    provinceName?: string | null;
    cityName?: string | null;
    postalCode: string | null;
  } | null;
  status: string;
  total: string;
  shippingCost: number;
  paymentMethod: string | null;
  paymentVerified: Date | string | null;
  shippingMethod: string | null;
  shippingStatus: string | null;
  trackingCode: string | null;
  discountCodeId: string | null;
  discountAmount: string | null;
  invoiceRequested: boolean;
  items: OrderItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string | null;
  onUpdate: () => void; // Callback to refresh orders list
}

export default function OrderDetailsModal({
  isOpen,
  onClose,
  orderId,
  onUpdate,
}: OrderDetailsModalProps) {
  const { t, language, currency } = useLanguage();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [trackingCode, setTrackingCode] = useState("");
  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [hasRewards, setHasRewards] = useState(false);
  const [isDistributingRewards, setIsDistributingRewards] = useState(false);
  const [statusHistory, setStatusHistory] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [orderNotes, setOrderNotes] = useState<any[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(true);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [itemFulfillments, setItemFulfillments] = useState<Record<string, number>>({});
  const [isUpdatingFulfillment, setIsUpdatingFulfillment] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedItems, setEditedItems] = useState<OrderItem[]>([]);
  const [isModifying, setIsModifying] = useState(false);
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; nameFa: string | null; price: string }>>([]);
  const [productSearchQuery, setProductSearchQuery] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
      fetchStatusHistory();
      fetchOrderNotes();
    } else {
      setOrder(null);
      setTrackingCode("");
      setShowTrackingInput(false);
      setStatusHistory([]);
      setShowHistory(false);
      setOrderNotes([]);
      setShowNotes(false);
      setNewNote("");
      setIsInternalNote(true);
      setShowCancelModal(false);
      setCancellationReason("");
      setItemFulfillments({});
      setIsEditMode(false);
      setEditedItems([]);
      setProductSearchQuery("");
      setShowProductSearch(false);
    }
  }, [isOpen, orderId]);

  // Initialize fulfillment state when order loads
  useEffect(() => {
    if (order && order.items) {
      const fulfillments: Record<string, number> = {};
      order.items.forEach((item) => {
        if (item.id) {
          fulfillments[item.id] = item.fulfilledQuantity || 0;
        }
      });
      setItemFulfillments(fulfillments);

      // Initialize edited items
      setEditedItems(order.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        productNameFa: item.productNameFa,
        quantity: item.quantity,
        price: item.price,
      })));
    }
  }, [order]);

  // Fetch available products for adding
  useEffect(() => {
    if (showProductSearch && productSearchQuery.trim()) {
      const fetchProducts = async () => {
        try {
          const response = await fetch(`/api/admin/products?search=${encodeURIComponent(productSearchQuery)}&limit=10`);
          if (response.ok) {
            const data = await response.json();
            // Handle paginated response format: { success: true, data: [...] }
            setAvailableProducts(data.data || data.products || []);
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      };
      const timeoutId = setTimeout(fetchProducts, 300);
      return () => clearTimeout(timeoutId);
    } else {
      setAvailableProducts([]);
    }
  }, [productSearchQuery, showProductSearch]);

  useEffect(() => {
    if (order) {
      setTrackingCode(order.trackingCode || "");
      setShowTrackingInput(order.shippingStatus === "shipped" || order.shippingStatus === "in_transit" || order.shippingStatus === "delivered");
    }
  }, [order]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`);
      if (response.ok) {
        const data = await response.json();
        setOrder(data.order);

        // Check if rewards have been distributed for this order
        if (data.order.userId && data.order.paymentVerified) {
          try {
            const rewardsResponse = await fetch(`/api/admin/rewards/check?orderId=${orderId}`);
            if (rewardsResponse.ok) {
              const rewardsData = await rewardsResponse.json();
              setHasRewards(rewardsData.hasRewards || false);
            }
          } catch (error) {
            console.error("Error checking rewards:", error);
            setHasRewards(false);
          }
        } else {
          setHasRewards(false);
        }
      } else {
        toast.error(t("Failed to load order details", "خطا در بارگذاری جزئیات سفارش"));
      }
    } catch (error) {
      console.error("Error fetching order details:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    if (!orderId) return;
    setIsLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/history`);
      if (response.ok) {
        const data = await response.json();
        setStatusHistory(data.history || []);
      }
    } catch (error) {
      console.error("Error fetching status history:", error);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const fetchOrderNotes = async () => {
    if (!orderId) return;
    setIsLoadingNotes(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notes`);
      if (response.ok) {
        const data = await response.json();
        setOrderNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error fetching order notes:", error);
    } finally {
      setIsLoadingNotes(false);
    }
  };

  const handleAddNote = async () => {
    if (!orderId || !newNote.trim()) return;
    setIsAddingNote(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: newNote.trim(),
          isInternal: isInternalNote,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setOrderNotes((prev) => [data.note, ...prev]);
        setNewNote("");
        toast.success(t("Note added successfully", "یادداشت با موفقیت اضافه شد"));
      } else {
        toast.error(t("Failed to add note", "خطا در افزودن یادداشت"));
      }
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsAddingNote(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "cancelled",
          cancellationReason: cancellationReason.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success(t("Order cancelled successfully", "سفارش با موفقیت لغو شد"));
        setShowCancelModal(false);
        setCancellationReason("");
        await fetchOrderDetails();
        await fetchStatusHistory();
        onUpdate(); // Refresh orders list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to cancel order", "لغو سفارش ناموفق بود"));
      }
    } catch (error) {
      console.error("Error cancelling order:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateFulfillment = async () => {
    if (!orderId) return;
    setIsUpdatingFulfillment(true);
    try {
      const itemFulfillmentsArray = Object.entries(itemFulfillments).map(([itemId, fulfilledQuantity]) => ({
        itemId,
        fulfilledQuantity: Math.max(0, Math.min(fulfilledQuantity, order?.items.find((i) => i.id === itemId)?.quantity || 0)),
      }));

      const response = await fetch(`/api/admin/orders/${orderId}/fulfill`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemFulfillments: itemFulfillmentsArray }),
      });

      if (response.ok) {
        toast.success(t("Fulfillment updated successfully", "تحویل با موفقیت به‌روزرسانی شد"));
        await fetchOrderDetails();
        await fetchStatusHistory();
        onUpdate(); // Refresh orders list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to update fulfillment", "بهروزرسانی تحویل ناموفق بود"));
      }
    } catch (error) {
      console.error("Error updating fulfillment:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdatingFulfillment(false);
    }
  };

  const handleSaveOrderModification = async () => {
    if (!orderId) return;
    setIsModifying(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/modify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: editedItems.map((item) => ({
            id: item.id,
            productId: item.productId,
            quantity: item.quantity,
          })),
        }),
      });

      if (response.ok) {
        toast.success(t("Order modified successfully", "سفارش با موفقیت ویرایش شد"));
        setIsEditMode(false);
        await fetchOrderDetails();
        await fetchStatusHistory();
        onUpdate(); // Refresh orders list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to modify order", "ویرایش سفارش ناموفق بود"));
      }
    } catch (error) {
      console.error("Error modifying order:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsModifying(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentVerified: true }),
      });

      if (response.ok) {
        toast.success(t("Payment verified successfully", "پرداخت با موفقیت تأیید شد"));

        // Automatically distribute rewards if user exists
        if (order?.userId) {
          try {
            const rewardsResponse = await fetch(`/api/admin/orders/${orderId}/distribute-rewards`, {
              method: "POST",
            });

            if (rewardsResponse.ok) {
              toast.success(t("Rewards distributed successfully", "پاداش‌ها با موفقیت توزیع شد"));
              setHasRewards(true);
            }
          } catch (error) {
            console.error("Error distributing rewards:", error);
            // Don't show error to user - payment verification succeeded
          }
        }

        await fetchOrderDetails();
        onUpdate(); // Refresh orders list
      } else {
        toast.error(t("Failed to verify payment", "تأیید پرداخت ناموفق بود"));
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentVerified: false, status: "payment_rejected" }),
      });
      if (response.ok) {
        toast.success(t("Payment rejected", "پرداخت رد شد"));
        await fetchOrderDetails();
        onUpdate();
      } else {
        toast.error(t("Failed to reject payment", "رد پرداخت ناموفق بود"));
      }
    } catch (error) {
      console.error("Error rejecting payment:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateShippingStatus = async (newStatus: string) => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      const updateData: any = { shippingStatus: newStatus };

      // If changing to shipped, show tracking input or include tracking code if already entered
      if (newStatus === "shipped") {
        setShowTrackingInput(true);
        // If tracking code is already entered, include it in the update
        if (trackingCode.trim()) {
          updateData.trackingCode = trackingCode.trim();
        }
      } else {
        setShowTrackingInput(false);
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (response.ok) {
        toast.success(t("Shipping status updated", "وضعیت حمل و نقل به‌روزرسانی شد"));
        await fetchOrderDetails();
        onUpdate(); // Refresh orders list
      } else {
        toast.error(t("Failed to update shipping status", "به‌روزرسانی وضعیت حمل و نقل ناموفق بود"));
      }
    } catch (error) {
      console.error("Error updating shipping status:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDistributeRewards = async () => {
    if (!orderId) return;
    setIsDistributingRewards(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/distribute-rewards`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success(t("Rewards distributed successfully", "پاداش‌ها با موفقیت توزیع شد"));
        setHasRewards(true);
        await fetchOrderDetails(); // Refresh order details
        onUpdate(); // Refresh orders list
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || t("Failed to distribute rewards", "توزیع پاداش‌ها ناموفق بود"));
      }
    } catch (error) {
      console.error("Error distributing rewards:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsDistributingRewards(false);
    }
  };

  const handleSaveTrackingCode = async () => {
    if (!orderId) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingCode: trackingCode.trim() || null }),
      });

      if (response.ok) {
        toast.success(t("Tracking code saved", "کد رهگیری ذخیره شد"));
        await fetchOrderDetails();
        onUpdate(); // Refresh orders list
      } else {
        toast.error(t("Failed to save tracking code", "ذخیره کد رهگیری ناموفق بود"));
      }
    } catch (error) {
      console.error("Error saving tracking code:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    } finally {
      setIsUpdating(false);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  };

  const getStatusLabel = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: t("Pending", "در انتظار"),
      processing: t("Processing", "در حال پردازش"),
      delivered: t("Delivered", "تحویل شده"),
      cancelled: t("Cancelled", "لغو شده"),
    };
    return statusMap[status] || statusMap.pending;
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { type: "active" | "pending" | "inactive"; label: string }> = {
      pending: { type: "pending", label: t("Pending", "در انتظار") },
      processing: { type: "active", label: t("Processing", "در حال پردازش") },
      delivered: { type: "active", label: t("Delivered", "تحویل شده") },
      cancelled: { type: "inactive", label: t("Cancelled", "لغو شده") },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <StatusBadge status={statusInfo.type} label={statusInfo.label} />;
  };

  const getShippingStatusBadge = (status: string | null) => {
    if (!status) return null;
    const statusMap: Record<string, { type: "active" | "pending" | "inactive"; label: string }> = {
      pending: { type: "pending", label: t("Pending", "در انتظار") },
      preparing: { type: "pending", label: t("Preparing", "آماده سازی") },
      shipped: { type: "active", label: t("Shipped", "ارسال شده") },
      in_transit: { type: "active", label: t("In Transit", "در حال ارسال") },
      delivered: { type: "active", label: t("Delivered", "تحویل شده") },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <StatusBadge status={statusInfo.type} label={statusInfo.label} />;
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("Order Details", "جزئیات سفارش")}
      size="large"
    >
      {isLoading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("Loading...", "در حال بارگذاری...")}
        </div>
      ) : order ? (
        <div className={styles.orderDetailsContent}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            items={[
              {
                label: "Orders",
                labelFa: "سفارش‌ها",
                onClick: onClose,
              },
              {
                label: `Order #${order.orderNumber}`,
                labelFa: `سفارش #${order.orderNumber}`,
              },
            ]}
          />
          {/* Order Header */}
          <div
            className={styles.orderDetailsHeader}
            dir={language === "fa" ? "rtl" : "ltr"}
          >
            {language === "fa" ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexDirection: "row-reverse" }}>
                  <span className={styles.orderDetailsLabel}>{t("Order Number", "شماره سفارش")}:</span>
                  <span className={styles.orderDetailsValue}>#{order.orderNumber}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexDirection: "row-reverse" }}>
                  <span className={styles.orderDetailsLabel}>{t("Status", "وضعیت")}:</span>
                  {getStatusBadge(order.status)}
                </div>
              </>
            ) : (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.orderDetailsLabel}>{t("Order Number", "شماره سفارش")}:</span>
                  <span className={styles.orderDetailsValue}>#{order.orderNumber}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={styles.orderDetailsLabel}>{t("Status", "وضعیت")}:</span>
                  {getStatusBadge(order.status)}
                </div>
              </>
            )}
          </div>

          {/* Customer Information */}
          <div className={styles.orderDetailsSection}>
            <h4 className={styles.orderDetailsSectionTitle}>
              {order.isGuest ? <FiUserX /> : <FiUser />}
              {t("Customer Information", "اطلاعات مشتری")}
            </h4>
            <div className={styles.orderDetailsInfo}>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Name", "نام")}:</span>
                <span className={styles.orderDetailsValue}>{order.customerName}</span>
              </div>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Email", "ایمیل")}:</span>
                <span className={styles.orderDetailsValue}>{order.customerEmail}</span>
              </div>
              {order.customerPhone && (
                <div className={styles.orderDetailsInfoRow}>
                  <span className={styles.orderDetailsLabel}>{t("Phone", "تلفن")}:</span>
                  <span className={styles.orderDetailsValue}>{order.customerPhone}</span>
                </div>
              )}
              {(order.guestAddress || order.shippingAddress) && (
                <div className={styles.orderDetailsInfoRow}>
                  <span className={styles.orderDetailsLabel}>{t("Address", "آدرس")}:</span>
                  <span className={styles.orderDetailsValue}>
                    {order.guestAddress ? (
                      <>
                        {order.guestAddress.provinceName && `${order.guestAddress.provinceName}, `}
                        {order.guestAddress.cityName && `${order.guestAddress.cityName}, `}
                        {order.guestAddress.address}
                        {order.guestAddress.postalCode ? `, ${t("Postal Code", "کد پستی")}: ${order.guestAddress.postalCode}` : ""}
                      </>
                    ) : (
                      <>
                        {order.shippingAddress?.provinceName && `${order.shippingAddress.provinceName}, `}
                        {order.shippingAddress?.cityName && `${order.shippingAddress.cityName}, `}
                        {order.shippingAddress?.address}
                        {order.shippingAddress?.postalCode ? `, ${t("Postal Code", "کد پستی")}: ${order.shippingAddress.postalCode}` : ""}
                      </>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Payment Information */}
          <div className={styles.orderDetailsSection}>
            <h4 className={styles.orderDetailsSectionTitle}>
              <FiPackage />
              {t("Payment Information", "اطلاعات پرداخت")}
            </h4>
            <div className={styles.orderDetailsInfo}>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Payment Method", "روش پرداخت")}:</span>
                <span className={styles.orderDetailsValue}>
                  {order.paymentMethod === "card_to_card"
                    ? t("Card to Card", "کارت به کارت")
                    : order.paymentMethod === "online_payment"
                      ? t("Online Payment", "پرداخت آنلاین")
                      : order.paymentMethod === "pay_after_delivery"
                        ? t("Pay After Delivery", "پرداخت پس از تحویل")
                        : order.paymentMethod || t("N/A", "نامشخص")}
                </span>
              </div>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>
                  {t("Payment Verified", "پرداخت تأیید شده")}:
                </span>
                <div className={styles.orderDetailsValueWithAction}>
                  {order.paymentVerified ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#27ae60" }}>
                      <FiCheckCircle />
                      {t("Verified", "تأیید شد")} ({formatDate(order.paymentVerified)})
                    </span>
                  ) : order.status === "payment_rejected" ? (
                    <span style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#e74c3c" }}>
                      <FiXCircle />
                      {t("Rejected", "رد شد")}
                    </span>
                  ) : (
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleVerifyPayment}
                        disabled={isUpdating}
                      >
                        {t("Verify Payment", "تأیید پرداخت")}
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={handleRejectPayment}
                        disabled={isUpdating}
                      >
                        {t("Reject Payment", "رد پرداخت")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Shipping Information */}
          <div className={styles.orderDetailsSection}>
            <h4 className={styles.orderDetailsSectionTitle}>
              <FiTruck />
              {t("Shipping Information", "اطلاعات حمل و نقل")}
            </h4>
            <div className={styles.orderDetailsInfo}>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Shipping Method", "روش ارسال")}:</span>
                <span className={styles.orderDetailsValue}>
                  {order.shippingMethod === "iranian_post"
                    ? t("Iranian Post", "پست ایران")
                    : order.shippingMethod === "courier"
                      ? t("Courier", "پیک")
                      : order.shippingMethod || t("N/A", "نامشخص")}
                </span>
              </div>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Shipping Cost", "هزینه ارسال")}:</span>
                <span className={styles.orderDetailsValue}>
                  {formatPrice(order.shippingCost, language, currency || "toman")}
                </span>
              </div>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Shipping Status", "وضعیت ارسال")}:</span>
                <span className={styles.orderDetailsValue}>
                  {getShippingStatusBadge(order.shippingStatus) || t("Not Started", "شروع نشده")}
                </span>
              </div>
              {order.trackingCode && (
                <div className={styles.orderDetailsInfoRow}>
                  <span className={styles.orderDetailsLabel}>{t("Tracking Code", "کد رهگیری")}:</span>
                  <span className={styles.orderDetailsValue}>{order.trackingCode}</span>
                </div>
              )}
              <div style={{ marginTop: "1rem" }}>
                <Button
                  variant="outline"
                  size="small"
                  onClick={async () => {
                    try {
                      const response = await fetch(`/api/admin/orders/${order.id}/shipping-label`);
                      if (response.ok) {
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `shipping-label-${order.orderNumber}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                        toast.success(t("Shipping label downloaded", "برچسب ارسال دانلود شد"));
                      } else {
                        toast.error(t("Failed to download shipping label", "دانلود برچسب ارسال ناموفق بود"));
                      }
                    } catch (error) {
                      console.error("Error downloading shipping label:", error);
                      toast.error(t("An error occurred", "خطایی رخ داد"));
                    }
                  }}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                >
                  <FiPrinter />
                  {t("Download Shipping Label", "دانلود برچسب ارسال")}
                </Button>
              </div>
              {order.paymentVerified && (
                <div className={styles.orderDetailsActions}>
                  {/* Show "Distribute Rewards" button if payment is verified but rewards haven't been distributed yet */}
                  {order.userId && !hasRewards && (
                    <div style={{ marginBottom: "1rem", padding: "0.75rem", background: "rgba(255, 193, 7, 0.1)", borderRadius: "8px", border: "1px solid rgba(255, 193, 7, 0.3)", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                      <p style={{ margin: 0, fontSize: "0.875rem", color: "#666" }}>
                        {language === "fa"
                          ? "برای این سفارش هنوز پاداشی توزیع نشده است."
                          : "Rewards have not been distributed for this order."}
                      </p>
                      <Button
                        variant="primary"
                        size="small"
                        onClick={handleDistributeRewards}
                        disabled={isDistributingRewards}
                      >
                        {isDistributingRewards
                          ? t("Distributing...", "در حال توزیع...")
                          : t("Distribute Rewards", "توزیع پاداش‌ها")}
                      </Button>
                    </div>
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                    <Button
                      variant={order.shippingStatus === "preparing" ? "primary" : "outline"}
                      size="small"
                      onClick={() => handleUpdateShippingStatus("preparing")}
                      disabled={isUpdating}
                    >
                      {t("Preparing", "آماده سازی")}
                    </Button>
                    <Button
                      variant={order.shippingStatus === "shipped" ? "primary" : "outline"}
                      size="small"
                      onClick={() => handleUpdateShippingStatus("shipped")}
                      disabled={isUpdating}
                    >
                      {t("Shipped", "ارسال شده")}
                    </Button>
                    <Button
                      variant={order.shippingStatus === "in_transit" ? "primary" : "outline"}
                      size="small"
                      onClick={() => handleUpdateShippingStatus("in_transit")}
                      disabled={isUpdating}
                    >
                      {t("In Transit", "در حال ارسال")}
                    </Button>
                    <Button
                      variant={order.shippingStatus === "delivered" ? "primary" : "outline"}
                      size="small"
                      onClick={() => handleUpdateShippingStatus("delivered")}
                      disabled={isUpdating}
                    >
                      {t("Delivered", "تحویل شده")}
                    </Button>
                  </div>
                  {showTrackingInput && (
                    <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#666" }}>
                        {t("Tracking Code", "کد رهگیری")}:
                      </label>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          value={trackingCode}
                          onChange={(e) => setTrackingCode(e.target.value)}
                          placeholder={t("Enter tracking code", "کد رهگیری را وارد کنید")}
                          className={styles.trackingCodeInput}
                          style={{
                            flex: 1,
                            padding: "0.5rem",
                            border: "1px solid #ddd",
                            borderRadius: "8px",
                            fontSize: "0.9rem",
                          }}
                          disabled={isUpdating}
                        />
                        <Button
                          variant="primary"
                          size="small"
                          onClick={handleSaveTrackingCode}
                          disabled={isUpdating}
                        >
                          {t("Save", "ذخیره")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Order Items */}
          <div className={styles.orderDetailsSection}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <h4 className={styles.orderDetailsSectionTitle} style={{ margin: 0 }}>
                <FiPackage />
                {t("Order Items", "اقلام سفارش")}
              </h4>
              {order.status !== "cancelled" && order.status !== "delivered" && (
                <Button
                  variant={isEditMode ? "primary" : "outline"}
                  size="small"
                  onClick={() => {
                    if (!isEditMode) {
                      setIsEditMode(true);
                      setEditedItems(order.items.map((item) => ({
                        id: item.id,
                        productId: item.productId,
                        productName: item.productName,
                        productNameFa: item.productNameFa,
                        quantity: item.quantity,
                        price: item.price,
                      })));
                    } else {
                      setIsEditMode(false);
                      setEditedItems([]);
                    }
                  }}
                >
                  {isEditMode ? t("Cancel Edit", "لغو ویرایش") : t("Edit Order", "ویرایش سفارش")}
                </Button>
              )}
            </div>
            <div className={styles.orderDetailsItems}>
              {(isEditMode ? editedItems : order.items).map((item, index) => {
                const itemId = item.id || `item-${index}`;
                const fulfilledQty = itemFulfillments[itemId] ?? (item.fulfilledQuantity || 0);
                const isFullyFulfilled = fulfilledQty >= item.quantity;
                const isPartiallyFulfilled = fulfilledQty > 0 && fulfilledQty < item.quantity;

                return (
                  <div
                    key={itemId}
                    className={styles.orderDetailsItem}
                    style={{
                      padding: "1rem",
                      border: "1px solid #e9ecef",
                      borderRadius: "8px",
                      marginBottom: "0.75rem",
                      background: isFullyFulfilled ? "#d4edda" : isPartiallyFulfilled ? "#fff3cd" : "#fff",
                    }}
                  >
                    <div className={styles.orderDetailsItemInfo} style={{ marginBottom: "0.75rem" }}>
                      <span className={styles.orderDetailsItemName}>
                        {language === "fa" && item.productNameFa ? item.productNameFa : item.productName}
                      </span>
                      {isEditMode ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <label style={{ fontSize: "0.875rem", color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {t("Quantity", "تعداد")}:
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 1;
                                setEditedItems((prev) => {
                                  const updated = [...prev];
                                  updated[index] = { ...updated[index], quantity: Math.max(1, value) };
                                  return updated;
                                });
                              }}
                              style={{
                                width: "60px",
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                                textAlign: "center",
                              }}
                            />
                          </label>
                          <Button
                            variant="outline"
                            size="small"
                            onClick={() => {
                              setEditedItems((prev) => prev.filter((_, i) => i !== index));
                            }}
                            style={{ color: "#e74c3c", borderColor: "#e74c3c" }}
                          >
                            {t("Remove", "حذف")}
                          </Button>
                        </div>
                      ) : (
                        <span className={styles.orderDetailsItemQuantity}>x{item.quantity}</span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                      <span className={styles.orderDetailsItemPrice}>
                        {formatPrice(parseFloat(item.price) * item.quantity, language, currency || "toman")}
                      </span>
                      {!isEditMode && order.status !== "cancelled" && (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                          <label style={{ fontSize: "0.875rem", color: "#666", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            {t("Fulfilled", "تحویل شده")}:
                            <input
                              type="number"
                              min="0"
                              max={item.quantity}
                              value={fulfilledQty}
                              onChange={(e) => {
                                const value = parseInt(e.target.value) || 0;
                                setItemFulfillments((prev) => ({
                                  ...prev,
                                  [itemId]: Math.max(0, Math.min(value, item.quantity)),
                                }));
                              }}
                              disabled={isUpdatingFulfillment}
                              style={{
                                width: "60px",
                                padding: "0.25rem 0.5rem",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                fontSize: "0.875rem",
                                textAlign: "center",
                              }}
                            />
                            <span style={{ fontSize: "0.875rem", color: "#666" }}>
                              / {item.quantity}
                            </span>
                          </label>
                          {isFullyFulfilled && (
                            <span style={{
                              padding: "0.125rem 0.5rem",
                              background: "#28a745",
                              color: "#fff",
                              borderRadius: "4px",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}>
                              {t("Fulfilled", "تحویل شده")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {isEditMode && (
              <>
                <div style={{ marginTop: "1rem", marginBottom: "1rem" }}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => setShowProductSearch(!showProductSearch)}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiPlus />
                    {t("Add Product", "افزودن محصول")}
                  </Button>
                  {showProductSearch && (
                    <div style={{ marginTop: "0.75rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                      <Input
                        placeholder={t("Search products...", "جستجوی محصولات...")}
                        value={productSearchQuery}
                        onChange={(e) => setProductSearchQuery(e.target.value)}
                        style={{ marginBottom: "0.75rem" }}
                      />
                      {availableProducts.length > 0 && (
                        <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                          {availableProducts.map((product) => (
                            <div
                              key={product.id}
                              onClick={() => {
                                setEditedItems((prev) => [
                                  ...prev,
                                  {
                                    productId: product.id,
                                    productName: language === "fa" && product.nameFa ? product.nameFa : product.name,
                                    quantity: 1,
                                    price: product.price,
                                  },
                                ]);
                                setProductSearchQuery("");
                                setShowProductSearch(false);
                              }}
                              style={{
                                padding: "0.75rem",
                                border: "1px solid #ddd",
                                borderRadius: "4px",
                                marginBottom: "0.5rem",
                                cursor: "pointer",
                                background: "#fff",
                              }}
                            >
                              <div style={{ fontWeight: 600 }}>
                                {language === "fa" && product.nameFa ? product.nameFa : product.name}
                              </div>
                              <div style={{ fontSize: "0.875rem", color: "#666" }}>
                                {formatPrice(parseFloat(product.price), language, currency || "toman")}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => {
                      setIsEditMode(false);
                      setEditedItems([]);
                    }}
                  >
                    {t("Cancel", "لغو")}
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleSaveOrderModification}
                    disabled={isModifying}
                  >
                    {isModifying
                      ? t("Saving...", "در حال ذخیره...")
                      : t("Save Changes", "ذخیره تغییرات")}
                  </Button>
                </div>
              </>
            )}
            {!isEditMode && order.status !== "cancelled" && (
              <div style={{ marginTop: "1rem", display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleUpdateFulfillment}
                  disabled={isUpdatingFulfillment}
                >
                  {isUpdatingFulfillment
                    ? t("Updating...", "در حال به‌روزرسانی...")
                    : t("Update Fulfillment", "به‌روزرسانی تحویل")}
                </Button>
              </div>
            )}
          </div>

          {order.invoiceRequested && (
            <div
              style={{
                margin: "1rem 0",
                padding: "1rem",
                border: "1px solid #ffb74d",
                borderRadius: "12px",
                background: "#fff3e0",
                color: "#6d4c41",
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
              }}
            >
              <FiMessageSquare style={{ fontSize: "1.25rem" }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>
                  {t("User requested an invoice", "کاربر درخواست فاکتور ثبت کرده است")}
                </div>
                <div style={{ fontSize: "0.9rem", color: "#5d4037" }}>
                  {t(
                    "This order has an invoice request. Please handle invoice generation manually.",
                    "این سفارش درخواست فاکتور دارد. لطفاً صدور فاکتور را به صورت دستی انجام دهید."
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Order Summary */}
          <div className={styles.orderDetailsSection}>
            <div className={styles.orderDetailsSummary}>
              {order.discountAmount && parseFloat(order.discountAmount) > 0 && (
                <div className={styles.orderDetailsSummaryRow}>
                  <span>{t("Discount", "تخفیف")}:</span>
                  <span>-{formatPrice(parseFloat(order.discountAmount), language, currency || "toman")}</span>
                </div>
              )}
              <div className={styles.orderDetailsSummaryRowTotal}>
                {language === "fa" ? (
                  <>
                    <span>{formatPrice(parseFloat(order.total), language, currency || "toman")}</span>
                    <span>{t("Total", "جمع کل")}:</span>
                  </>
                ) : (
                  <>
                    <span>{t("Total", "جمع کل")}:</span>
                    <span>{formatPrice(parseFloat(order.total), language, currency || "toman")}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Order Dates */}
          <div className={styles.orderDetailsSection}>
            <div className={styles.orderDetailsInfo}>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Order Date", "تاریخ سفارش")}:</span>
                <span className={styles.orderDetailsValue}>{formatDate(order.createdAt)}</span>
              </div>
              <div className={styles.orderDetailsInfoRow}>
                <span className={styles.orderDetailsLabel}>{t("Last Updated", "آخرین به‌روزرسانی")}:</span>
                <span className={styles.orderDetailsValue}>{formatDate(order.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Status History */}
          <div className={styles.orderDetailsSection}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                padding: "0.5rem 0",
              }}
              onClick={() => setShowHistory(!showHistory)}
            >
              <h4 className={styles.orderDetailsSectionTitle} style={{ margin: 0 }}>
                <FiClock />
                {t("Status History", "تاریخچه وضعیت")}
                {statusHistory.length > 0 && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", color: "#666", fontWeight: "normal" }}>
                    ({statusHistory.length})
                  </span>
                )}
              </h4>
              {showHistory ? <FiChevronUp /> : <FiChevronDown />}
            </div>
            {showHistory && (
              <div style={{ marginTop: "1rem" }}>
                {isLoadingHistory ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                    {t("Loading...", "در حال بارگذاری...")}
                  </div>
                ) : statusHistory.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                    {t("No status changes recorded", "تغییر وضعیت ثبت نشده است")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {statusHistory.map((entry, index) => (
                      <div
                        key={entry.id}
                        style={{
                          padding: "0.75rem",
                          background: "#f8f9fa",
                          borderRadius: "8px",
                          border: "1px solid #e9ecef",
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                            <StatusBadge
                              status={
                                entry.status === "cancelled"
                                  ? "inactive"
                                  : entry.status === "delivered" || entry.status === "processing"
                                    ? "active"
                                    : "pending"
                              }
                              label={getStatusLabel(entry.status)}
                            />
                            {entry.previousStatus && (
                              <>
                                <span style={{ color: "#666", fontSize: "0.875rem" }}>-&gt;</span>
                                <span style={{ color: "#666", fontSize: "0.875rem" }}>
                                  {t("From", "از")} {getStatusLabel(entry.previousStatus)}
                                </span>
                              </>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.875rem", color: "#666" }}>
                            <div>
                              {t("Changed by", "تغییر توسط")}: <strong>{entry.changedByName}</strong>
                            </div>
                            <div>{formatDate(entry.createdAt)}</div>
                            {entry.notes && (
                              <div style={{ marginTop: "0.5rem", padding: "0.5rem", background: "#fff", borderRadius: "4px", fontStyle: "italic" }}>
                                {entry.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Order Notes */}
          <div className={styles.orderDetailsSection}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                padding: "0.5rem 0",
              }}
              onClick={() => setShowNotes(!showNotes)}
            >
              <h4 className={styles.orderDetailsSectionTitle} style={{ margin: 0 }}>
                <FiMessageSquare />
                {t("Notes", "یادداشت‌ها")}
                {orderNotes.length > 0 && (
                  <span style={{ marginLeft: "0.5rem", fontSize: "0.875rem", color: "#666", fontWeight: "normal" }}>
                    ({orderNotes.length})
                  </span>
                )}
              </h4>
              {showNotes ? <FiChevronUp /> : <FiChevronDown />}
            </div>
            {showNotes && (
              <div style={{ marginTop: "1rem" }}>
                {/* Add Note Form */}
                <div style={{ marginBottom: "1rem", padding: "1rem", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e9ecef" }}>
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t("Add a note...", "یک یادداشت اضافه کنید...")}
                    disabled={isAddingNote}
                    style={{ minHeight: "80px", marginBottom: "0.75rem" }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.75rem" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.875rem" }}>
                      <input
                        type="checkbox"
                        checked={isInternalNote}
                        onChange={(e) => setIsInternalNote(e.target.checked)}
                        disabled={isAddingNote}
                      />
                      <span>{t("Internal Note (Admin Only)", "یادداشت داخلی (فقط ادمین)")}</span>
                    </label>
                  </div>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleAddNote}
                    disabled={isAddingNote || !newNote.trim()}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <FiPlus />
                    {isAddingNote ? t("Adding...", "در حال افزودن...") : t("Add Note", "افزودن یادداشت")}
                  </Button>
                </div>

                {/* Notes List */}
                {isLoadingNotes ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                    {t("Loading...", "در حال بارگذاری...")}
                  </div>
                ) : orderNotes.length === 0 ? (
                  <div style={{ padding: "1rem", textAlign: "center", color: "#666" }}>
                    {t("No notes yet", "هنوز یادداشتی ثبت نشده است")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {orderNotes.map((note) => (
                      <div
                        key={note.id}
                        style={{
                          padding: "0.75rem",
                          background: note.isInternal ? "#fff3cd" : "#d1ecf1",
                          borderRadius: "8px",
                          border: `1px solid ${note.isInternal ? "#ffc107" : "#bee5eb"}`,
                        }}
                      >
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "#666" }}>
                              <strong>{note.createdByName}</strong>
                              {note.isInternal && (
                                <span style={{
                                  padding: "0.125rem 0.5rem",
                                  background: "#ffc107",
                                  color: "#856404",
                                  borderRadius: "4px",
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                }}>
                                  {t("Internal", "داخلی")}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: "0.875rem", color: "#666" }}>
                              {formatDate(note.createdAt)}
                            </div>
                          </div>
                          <div style={{
                            fontSize: "0.9rem",
                            color: "#333",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            fontFamily: language === "fa" ? "'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" : "inherit",
                          }}>
                            {note.note}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center" }}>
          {t("Order not found", "سفارش پیدا نشد")}
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "1rem",
          }}
          onClick={() => !isUpdating && setShowCancelModal(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "1.5rem",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.25rem", fontWeight: 600 }}>
              {t("Cancel Order", "لغو سفارش")}
            </h3>
            <p style={{ margin: "0 0 1rem 0", color: "#666", fontSize: "0.9rem" }}>
              {t(
                "Are you sure you want to cancel this order? Please provide a reason for cancellation.",
                "آیا مطمئن هستید می‌خواهید این سفارش را لغو کنید؟ لطفاً دلیل لغو را وارد کنید."
              )}
            </p>
            <div style={{ marginBottom: "1rem" }}>
              <Textarea
                label={t("Cancellation Reason", "دلیل لغو")}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder={t("Enter reason for cancellation...", "دلیل لغو را وارد کنید...")}
                rows={4}
                disabled={isUpdating}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
              <Button
                variant="outline"
                size="small"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason("");
                }}
                disabled={isUpdating}
              >
                {t("Cancel", "لغو")}
              </Button>
              <Button
                variant="primary"
                size="small"
                onClick={handleCancelOrder}
                disabled={isUpdating}
                style={{
                  background: "#e74c3c",
                  borderColor: "#e74c3c",
                }}
              >
                {isUpdating
                  ? t("Cancelling...", "در حال لغو...")
                  : t("Confirm Cancellation", "تأیید لغو")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

