"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { FiPackage, FiUser, FiUserX, FiChevronDown, FiChevronUp, FiDownload, FiFilter, FiX } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import DataTable from "../DataTable";
import StatusBadge from "../StatusBadge";
import Button from "@/components/ui/Button";
import OrderDetailsModal from "../OrderDetailsModal";
import Select, { SelectOption } from "@/components/ui/Select";
import Input from "@/components/ui/Input";
import { formatPrice } from "@/lib/utils/formatPrice";
import toast from "react-hot-toast";
import { showConfirmationToast } from "@/lib/utils/toast";
import TableSkeleton from "@/components/ui/TableSkeleton";
import EmptyState from "@/components/ui/EmptyState";
import { FiPackage as EmptyIcon } from "react-icons/fi";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import styles from "@/styles/components/_admin.module.scss";

interface Order {
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
  } | null;
  status: string;
  total: string;
  shippingCost: number;
  paymentMethod: string | null;
  items: Array<{
    productName: string;
    productNameFa?: string | null;
    quantity: number;
    price: string;
  }>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export default function OrdersSection() {
  const { t, language, currency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreOrders, setIsLoadingMoreOrders] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [hasMoreOrders, setHasMoreOrders] = useState(true);
  const ORDERS_LIMIT = 20;
  const ordersSentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingOrdersRef = useRef(false);
  const [filterType, setFilterType] = useState<"all" | "guest" | "registered">("all");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [sellers, setSellers] = useState<{ id: string; nameEn: string; nameFa: string }[]>([]);
  const [sellerFilter, setSellerFilter] = useState("");

  // Build query string from filters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("search", searchQuery);
    if (statusFilter) params.set("status", statusFilter);
    if (paymentMethodFilter) params.set("paymentMethod", paymentMethodFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (filterType !== "all") params.set("orderType", filterType);
    if (sellerFilter) params.set("sellerId", sellerFilter);
    return params.toString();
  }, [searchQuery, statusFilter, paymentMethodFilter, dateFrom, dateTo, filterType, sellerFilter]);

  const fetchOrders = useCallback(
    async (pageNumber: number, replace = false) => {
      if (isFetchingOrdersRef.current) return;

      isFetchingOrdersRef.current = true;
      setIsLoading(pageNumber === 1);
      setIsLoadingMoreOrders(pageNumber > 1);

      try {
        const params = new URLSearchParams(queryParams);
        params.set("page", String(pageNumber));
        params.set("limit", String(ORDERS_LIMIT));

        const response = await fetch(`/api/admin/orders?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load orders");
        }

        const data = await response.json();
        const fetchedOrders = data.data || data.orders || [];
        const nextHasMore =
          typeof data.pagination?.hasNext === "boolean"
            ? data.pagination.hasNext
            : fetchedOrders.length >= ORDERS_LIMIT;

        setOrders((prev) => (replace ? fetchedOrders : [...prev, ...fetchedOrders]));
        setHasMoreOrders(nextHasMore);
      } catch (error: any) {
        console.error("Error loading orders:", error);
        toast.error(error?.message || t("Failed to load orders", "خطا در بارگذاری سفارشات"));
      } finally {
        setIsLoading(false);
        setIsLoadingMoreOrders(false);
        isFetchingOrdersRef.current = false;
      }
    },
    [queryParams, t]
  );

  useEffect(() => {
    setOrders([]);
    setOrdersPage(1);
    setHasMoreOrders(true);
  }, [queryParams]);

  useEffect(() => {
    fetchOrders(ordersPage, ordersPage === 1);
  }, [ordersPage, fetchOrders]);

  useEffect(() => {
    const sentinel = ordersSentinelRef.current;
    if (!sentinel || !hasMoreOrders || isLoading || isLoadingMoreOrders) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMoreOrders &&
          !isLoading &&
          !isLoadingMoreOrders &&
          !isFetchingOrdersRef.current
        ) {
          setOrdersPage((prev) => prev + 1);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMoreOrders, isLoading, isLoadingMoreOrders]);

  // Fetch sellers for filter
  useEffect(() => {
    const fetchSellers = async () => {
      try {
        const response = await fetch("/api/admin/sellers");
        if (response.ok) {
          const data = await response.json();
          // FIX: Handle the API response format
          const sellersList = data.data?.sellers || data.sellers || [];
          setSellers(sellersList);
        }
      } catch (error) {
        console.error("Error fetching sellers:", error);
      }
    };
    fetchSellers();
  }, []);

  const formatDate = (date: Date | string) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return new Intl.DateTimeFormat(language === "fa" ? "fa-IR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { type: "active" | "pending" | "inactive" | "info"; label: string }> = {
      pending: { type: "pending", label: t("Pending", "در انتظار") },
      processing: { type: "info", label: t("Processing", "در حال پردازش") },
      delivered: { type: "active", label: t("Delivered", "تحویل شده") },
      cancelled: { type: "inactive", label: t("Cancelled", "لغو شده") },
      payment_rejected: { type: "inactive", label: t("Rejected", "لغو پرداخت") },
    };
    const statusInfo = statusMap[status] || statusMap.pending;
    return <StatusBadge status={statusInfo.type} label={statusInfo.label} />;
  };

  const getPaymentStatusLabel = (paymentMethod: string | null, status: string) => {
    if (!paymentMethod) return t("N/A", "ندارد");
    if (paymentMethod === "card_to_card" && (status === "pending" || status === "pending_payment")) {
      return t("Awaiting Payment", "در انتظار پرداخت");
    }
    if (paymentMethod === "card_to_card" && status === "processing") {
      return t("Payment Received", "پرداخت دریافت شد");
    }
    return t("Paid", "پرداخت شده");
  };

  const deleteOrder = async (orderId: string, orderNumber: string) => {
    const loadingToastId = toast.loading(
      t("Deleting order...", "در حال حذف سفارش..."),
      { duration: 999999 }
    );

    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });

      toast.dismiss(loadingToastId);

      if (response.ok) {
        toast.success(t("Order deleted successfully", "سفارش با موفقیت حذف شد"));
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
      } else {
        const errorData = await response.json().catch(() => null);
        toast.error(errorData?.error || t("Failed to delete order", "حذف سفارش ناموفق بود"));
      }
    } catch (error) {
      toast.dismiss(loadingToastId);
      console.error("Error deleting order:", error);
      toast.error(t("An error occurred", "خطایی رخ داد"));
    }
  };

  const handleDeleteOrder = (orderId: string, orderNumber: string) => {
    showConfirmationToast(
      t(`Delete order #${orderNumber}?`, `حذف سفارش #${orderNumber}؟`),
      t("Confirm", "تایید"),
      t("Cancel", "لغو"),
      () => deleteOrder(orderId, orderNumber)
    );
  };

  const toggleOrderExpansion = (orderId: string) => {
    setExpandedOrders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const columns = [
    {
      key: "orderNumber",
      label: t("Order ID", "شناسه سفارش"),
      render: (value: string, row: Order, index?: number) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span title={value}>{index !== undefined ? index + 1 : value}</span>
          {row.isGuest && (
            <span title={t("Guest Order", "سفارش مهمان")} style={{ color: "#999", fontSize: "0.875rem" }}>
              <FiUserX />
            </span>
          )}
        </div>
      ),
    },
    {
      key: "customerName",
      label: t("Customer", "مشتری"),
      render: (value: string, row: Order) => (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {row.isGuest ? <FiUserX /> : <FiUser />}
            <span>{value}</span>
          </div>
          <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.25rem" }}>
            {row.customerEmail}
          </div>
        </div>
      ),
    },
    {
      key: "items",
      label: t("Items", "آیتم‌ها"),
      render: (items: Order["items"]) => {
        if (items.length === 0) return "-";
        const firstItem = items[0];
        const moreCount = items.length - 1;
        return (
          <div>
            <div>{language === "fa" && firstItem.productNameFa ? firstItem.productNameFa : firstItem.productName} x{firstItem.quantity}</div>
            {moreCount > 0 && (
              <div style={{ fontSize: "0.875rem", color: "#666" }}>
                {t(`+${moreCount} more`, `+${moreCount} بیشتر`)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: "total",
      label: t("Amount", "مبلغ"),
      render: (value: string) => formatPrice(parseFloat(value), language, currency || "toman"),
    },
    {
      key: "createdAt",
      label: t("Date", "تاریخ"),
      render: (value: Date | string) => formatDate(value),
    },
    {
      key: "status",
      label: t("Status", "وضعیت"),
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: "actions",
      label: t("Actions", "اقدامات"),
      render: (_: any, row: Order) => (
        <div className={tableStyles.tableActions}>
          <Button
            variant="primary"
            size="small"
            onClick={() => {
              setSelectedOrderId(row.id);
              setIsOrderModalOpen(true);
            }}
          >
            {t("View", "مشاهده")}
          </Button>
          <Button
            variant="secondary"
            size="small"
            onClick={async () => {
              try {
                const response = await fetch(`/api/admin/orders/${row.id}/invoice`);
                if (response.ok) {
                  const blob = await response.blob();
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `invoice-${row.orderNumber}.pdf`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success(t("Invoice downloaded", "فاکتور دانلود شد"));
                } else {
                  toast.error(t("Failed to download invoice", "خطا در دانلود فاکتور"));
                }
              } catch (error) {
                console.error("Error downloading invoice:", error);
                toast.error(t("An error occurred", "خطایی رخ داد"));
              }
            }}
          >
            <FiDownload style={{ marginLeft: "4px" }} />
            {t("Invoice", "فاکتور")}
          </Button>
          <Button
            variant="danger"
            size="small"
            onClick={() => handleDeleteOrder(row.id, row.orderNumber)}
          >
            {t("Delete", "حذف")}
          </Button>
        </div>
      ),
    },
  ];

  // Orders are already filtered by API, so use them directly
  const filteredOrders = orders;

  // Filter options
  const statusOptions: SelectOption[] = [
    { value: "", label: t("All Statuses", "همه وضعیت‌ها") },
    { value: "pending", label: t("Pending", "در انتظار") },
    { value: "processing", label: t("Processing", "در حال پردازش") },
    { value: "delivered", label: t("Delivered", "تحویل شده") },
    { value: "cancelled", label: t("Cancelled", "لغو شده") },
  ];

  const paymentMethodOptions: SelectOption[] = [
    { value: "", label: t("All Payment Methods", "همه روش‌های پرداخت") },
    { value: "card_to_card", label: t("Card to Card", "کارت به کارت") },
    { value: "online_payment", label: t("Online Payment", "پرداخت آنلاین") },
    { value: "pay_after_delivery", label: t("Pay After Delivery", "پرداخت در محل") },
    { value: "paypal", label: t("PayPal", "پی‌پال") },
  ];

  const clearFilters = () => {
    setStatusFilter("");
    setPaymentMethodFilter("");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
  };

  const hasActiveFilters = statusFilter || paymentMethodFilter || dateFrom || dateTo || searchQuery;

  return (
    <>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h3 className={cardStyles.cardTitle}>
            <FiPackage />
            <span>{t("Order Management", "مدیریت سفارشات")}</span>
          </h3>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "1rem" }}>
          {/* Order Type Filter */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <button
              onClick={() => setFilterType("all")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                background: filterType === "all" ? "#007bff" : "white",
                color: filterType === "all" ? "white" : "#333",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {t("All", "همه")}
            </button>
            <button
              onClick={() => setFilterType("registered")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                background: filterType === "registered" ? "#007bff" : "white",
                color: filterType === "registered" ? "white" : "#333",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {t("Registered", "ثبت‌نام شده")}
            </button>
            <button
              onClick={() => setFilterType("guest")}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                background: filterType === "guest" ? "#007bff" : "white",
                color: filterType === "guest" ? "white" : "#333",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              {t("Guest", "مهمان")}
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid #ddd",
                borderRadius: "0.5rem",
                background: showFilters ? "#007bff" : "white",
                color: showFilters ? "white" : "#333",
                cursor: "pointer",
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FiFilter />
              {t("Filters", "فیلترها")}
              {hasActiveFilters && (
                <span style={{
                  background: showFilters ? "rgba(255,255,255,0.3)" : "#007bff",
                  color: "#fff",
                  borderRadius: "50%",
                  width: "20px",
                  height: "20px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  marginLeft: "0.25rem",
                }}>
                  {[statusFilter, paymentMethodFilter, dateFrom, dateTo, searchQuery].filter(Boolean).length}
                </span>
              )}
            </button>
            <Button
              variant="outline"
              size="small"
              onClick={async () => {
                try {
                  setIsLoading(true);
                  const exportUrl = `/api/admin/orders/export${queryParams ? `?${queryParams}` : ""}`;
                  const response = await fetch(exportUrl);

                  if (response.ok) {
                    const blob = await response.blob();
                    const blobUrl = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = blobUrl;
                    const timestamp = new Date().toISOString().split("T")[0];
                    a.download = `orders-export-${timestamp}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(blobUrl);
                    document.body.removeChild(a);
                    toast.success(t("Orders exported successfully", "سفارشات با موفقیت صادر شد"));
                  } else {
                    toast.error(t("Failed to export orders", "خطا در صادرات سفارشات"));
                  }
                } catch (error) {
                  console.error("Error exporting orders:", error);
                  toast.error(t("An error occurred", "خطایی رخ داد"));
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <FiDownload />
              {t("Export CSV", "صادرات CSV")}
            </Button>
          </div>

          {/* Search Bar */}
          <SearchBar
            placeholder={t("Search by order number, name, email, phone...", "جستجو بر اساس شماره سفارش، نام، ایمیل، تلفن...")}
            value={searchQuery}
            onChange={setSearchQuery}
          />

          {/* Advanced Filters */}
          {showFilters && (
            <div style={{
              padding: "1rem",
              background: "#f8f9fa",
              borderRadius: "0.5rem",
              border: "1px solid #e9ecef",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                <h4 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>
                  {t("Advanced Filters", "فیلترهای پیشرفته")}
                </h4>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    style={{
                      padding: "0.25rem 0.5rem",
                      border: "none",
                      background: "transparent",
                      color: "#007bff",
                      cursor: "pointer",
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                    }}
                  >
                    <FiX />
                    {t("Clear All", "پاک کردن همه")}
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                <div>
                  <Select
                    label={t("Status", "وضعیت")}
                    options={statusOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder={t("All Statuses", "همه وضعیت‌ها")}
                  />
                </div>
                <div>
                  <Select
                    label={t("Payment Method", "روش پرداخت")}
                    options={paymentMethodOptions}
                    value={paymentMethodFilter}
                    onChange={setPaymentMethodFilter}
                    placeholder={t("All Payment Methods", "همه روش‌های پرداخت")}
                  />
                </div>
                <div>
                  <Select
                    label={t("Seller", "فروشنده")}
                    options={[
                      { value: "", label: t("All Sellers", "همه فروشندگان") },
                      ...sellers.map((seller) => ({
                        value: seller.id,
                        label: language === "fa" ? seller.nameFa : seller.nameEn,
                      })),
                    ]}
                    value={sellerFilter}
                    onChange={setSellerFilter}
                    placeholder={t("Filter by seller", "فیلتر بر اساس فروشنده")}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    label={t("Date From", "از تاریخ")}
                    value={dateFrom}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <Input
                    type="date"
                    label={t("Date To", "تا تاریخ")}
                    value={dateTo}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateTo(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
        {isLoading ? (
          <TableSkeleton rows={5} columns={6} />
        ) : (
          <>
            {/* Mobile Card View */}
            <div className={styles.ordersMobileCards}>
              {filteredOrders.length === 0 ? (
                <EmptyState
                  icon={<EmptyIcon />}
                  title={t("No Orders", "هیچ سفارشی وجود ندارد")}
                  titleFa="هیچ سفارشی وجود ندارد"
                  description={t("No orders found matching your filters", "هیچ سفارشی مطابق با فیلترهای شما یافت نشد")}
                  descriptionFa="هیچ سفارشی مطابق با فیلترهای شما یافت نشد"
                />
              ) : (
                filteredOrders.map((order) => {
                  const isExpanded = expandedOrders.has(order.id);
                  return (
                    <div key={order.id} className={styles.orderMobileCard}>
                      <div
                        className={styles.orderMobileCardHeader}
                        onClick={() => toggleOrderExpansion(order.id)}
                      >
                        <div className={styles.orderMobileCardMain}>
                          <div className={styles.orderMobileCardCustomer}>
                            {order.isGuest ? <FiUserX /> : <FiUser />}
                            <span>{order.customerName}</span>
                          </div>
                          <div className={styles.orderMobileCardPayment}>
                            <span className={styles.orderMobileCardPaymentLabel}>
                              {t("Payment", "پرداخت")}:
                            </span>
                            <span className={styles.orderMobileCardPaymentValue}>
                              {getPaymentStatusLabel(order.paymentMethod, order.status)}
                            </span>
                          </div>
                        </div>
                        <div className={styles.orderMobileCardExpand}>
                          {isExpanded ? <FiChevronUp /> : <FiChevronDown />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div className={styles.orderMobileCardDetails}>
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Order ID", "شناسه سفارش")}:
                            </span>
                            <span className={styles.orderMobileCardDetailValue}>
                              {order.orderNumber}
                            </span>
                          </div>
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Email", "ایمیل")}:
                            </span>
                            <span className={styles.orderMobileCardDetailValue}>
                              {order.customerEmail}
                            </span>
                          </div>
                          {order.customerPhone && (
                            <div className={styles.orderMobileCardDetailRow}>
                              <span className={styles.orderMobileCardDetailLabel}>
                                {t("Phone", "تلفن")}:
                              </span>
                              <span className={styles.orderMobileCardDetailValue}>
                                {order.customerPhone}
                              </span>
                            </div>
                          )}
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Items", "آیتم‌ها")}:
                            </span>
                            <div className={styles.orderMobileCardItems}>
                              {order.items.map((item, idx) => (
                                <div key={idx} className={styles.orderMobileCardItem}>
                                  {item.productName} x{item.quantity}
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Amount", "مبلغ")}:
                            </span>
                            <span className={styles.orderMobileCardDetailValue}>
                              {formatPrice(parseFloat(order.total), language, currency || "toman")}
                            </span>
                          </div>
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Date", "تاریخ")}:
                            </span>
                            <span className={styles.orderMobileCardDetailValue}>
                              {formatDate(order.createdAt)}
                            </span>
                          </div>
                          <div className={styles.orderMobileCardDetailRow}>
                            <span className={styles.orderMobileCardDetailLabel}>
                              {t("Status", "وضعیت")}:
                            </span>
                            <span className={styles.orderMobileCardDetailValue}>
                              {getStatusBadge(order.status)}
                            </span>
                          </div>
                          <div className={styles.orderMobileCardActions}>
                            <Button
                              variant="primary"
                              size="small"
                              onClick={() => {
                                setSelectedOrderId(order.id);
                                setIsOrderModalOpen(true);
                              }}
                            >
                              {t("View", "مشاهده")}
                            </Button>
                            <Button
                              variant="danger"
                              size="small"
                              onClick={() => handleDeleteOrder(order.id, order.orderNumber)}
                            >
                              {t("Delete", "حذف")}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }))}
            </div>

            {/* Desktop Table View */}
            <div className={styles.ordersDesktopTable}>
              <DataTable columns={columns} data={filteredOrders} />
            </div>
            <div ref={ordersSentinelRef} />
          </>
        )}
      </AdminCard>

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={isOrderModalOpen}
        onClose={() => {
          setIsOrderModalOpen(false);
          setSelectedOrderId(null);
        }}
        orderId={selectedOrderId}
        onUpdate={() => {
          setOrders([]);
          setOrdersPage(1);
          setHasMoreOrders(true);
        }}
      />
    </>
  );
}

