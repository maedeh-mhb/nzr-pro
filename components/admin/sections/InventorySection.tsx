"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "@/lib/utils/language";
import { formatPrice } from "@/lib/utils/formatPrice";
import { FiPackage, FiSearch, FiChevronDown, FiChevronUp } from "react-icons/fi";
import AdminCard from "../AdminCard";
import SearchBar from "../SearchBar";
import DataTable from "../DataTable";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import cardStyles from "@/styles/components/_adminCard.module.scss";
import tableStyles from "@/styles/components/_adminTable.module.scss";
import formStyles from "@/styles/components/_adminForm.module.scss";
import styles from "@/styles/components/_adminInventory.module.scss";

interface Product {
  id: string;
  name: string;
  nameFa: string | null;
  quantity: number;
  badge: string | null;
  price: string;
  image: string | null;
}

export default function InventorySection() {
  const { t, language, currency } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [productsPage, setProductsPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMoreProducts, setIsLoadingMoreProducts] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [quantityValue, setQuantityValue] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  const productsSentinelRef = useRef<HTMLDivElement | null>(null);
  const isFetchingProductsRef = useRef(false);

  const fetchProducts = useCallback(
    async (pageNumber: number, replace = false) => {
      if (isFetchingProductsRef.current) return;
      isFetchingProductsRef.current = true;

      if (pageNumber === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMoreProducts(true);
      }

      try {
        const params = new URLSearchParams();
        params.set("page", String(pageNumber));
        params.set("limit", "20");

        if (debouncedSearchQuery) {
          params.set("search", debouncedSearchQuery);
        }

        const response = await fetch(`/api/admin/products?${params.toString()}`);
        if (!response.ok) {
          throw new Error("Failed to load products");
        }

        const data = await response.json();
        const fetchedProducts = data.data || data.products || [];

        const nextHasMore =
          typeof data.pagination?.hasNext === "boolean"
            ? data.pagination.hasNext
            : fetchedProducts.length >= 20;

        setProducts((prev) => (replace ? fetchedProducts : [...prev, ...fetchedProducts]));
        setHasMoreProducts(nextHasMore);
      } catch (error) {
        console.error("Error loading products:", error);
        if (productsPage === 1) {
          toast.error(t("Failed to load products", "خطا در بارگذاری محصولات"));
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMoreProducts(false);
        isFetchingProductsRef.current = false;
      }
    },
    [debouncedSearchQuery, t, productsPage]
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(searchQuery.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    setProducts([]);
    setProductsPage(1);
    setHasMoreProducts(true);
    setExpandedProductId(null);
  }, [debouncedSearchQuery]);

  useEffect(() => {
    fetchProducts(productsPage, productsPage === 1);
  }, [productsPage, fetchProducts]);

  useEffect(() => {
    const sentinel = productsSentinelRef.current;
    if (!sentinel || !hasMoreProducts || isLoading || isLoadingMoreProducts) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];

        if (
          first.isIntersecting &&
          hasMoreProducts &&
          !isLoading &&
          !isLoadingMoreProducts &&
          !isFetchingProductsRef.current
        ) {
          setProductsPage((prev) => prev + 1);
        }
      },
      { rootMargin: "250px" }
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [hasMoreProducts, isLoading, isLoadingMoreProducts]);

  const displayedProducts = products;

  // Handle quantity update
  const handleUpdateQuantity = async (productId: string, newQuantity: number) => {
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update quantity");
      }

      toast.success(t("Quantity updated successfully", "تعداد با موفقیت به‌روزرسانی شد"));

      // Refresh products
      setProducts((prev) =>
        prev.map((product) =>
          product.id === productId ? { ...product, quantity: newQuantity } : product
        )
      );
      setEditingProduct(null);
      setQuantityValue("");
      setExpandedProductId(null);
    } catch (error: any) {
      console.error("Error updating quantity:", error);
      toast.error(error.message || t("Failed to update quantity", "خطا در به‌روزرسانی تعداد"));
    } finally {
      setIsUpdating(false);
    }
  };

  // Start editing
  const handleEditClick = (product: Product, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingProduct(product);
    setQuantityValue(product.quantity.toString());
  };

  // Cancel editing
  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setEditingProduct(null);
    setQuantityValue("");
  };

  // Submit quantity update
  const handleSubmitQuantity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const quantity = parseInt(quantityValue);
    if (isNaN(quantity) || quantity < 0) {
      toast.error(t("Please enter a valid quantity", "لطفاً تعداد معتبری وارد کنید"));
      return;
    }

    handleUpdateQuantity(editingProduct.id, quantity);
  };

  // Table columns
  const columns = [
    {
      key: "name",
      label: t("Product", "محصول"),
      render: (value: string, row: Product) => (
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {row.image && (
            <img
              src={row.image}
              alt={value}
              style={{
                width: "40px",
                height: "40px",
                objectFit: "cover",
                borderRadius: "4px",
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          )}
          <span>{language === "fa" && row.nameFa ? row.nameFa : value}</span>
        </div>
      ),
    },
    {
      key: "quantity",
      label: t("Quantity", "تعداد"),
      render: (value: number, row: Product) => {
        if (editingProduct?.id === row.id) {
          return (
            <form onSubmit={handleSubmitQuantity} style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <Input
                type="number"
                value={quantityValue}
                onChange={(e) => setQuantityValue(e.target.value)}
                min="0"
                style={{ width: "100px" }}
                disabled={isUpdating}
              />
              <Button
                type="submit"
                variant="primary"
                size="small"
                disabled={isUpdating}
              >
                {t("Save", "ذخیره")}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                {t("Cancel", "لغو")}
              </Button>
            </form>
          );
        }
        return (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span>{value}</span>
            <Button
              variant="outline"
              size="small"
              onClick={() => handleEditClick(row)}
            >
              {t("Edit", "ویرایش")}
            </Button>
          </div>
        );
      },
    },
    {
      key: "badge",
      label: t("Badge", "نشان"),
      render: (value: string | null) => {
        if (!value || value === "None") return "-";
        return value;
      },
    },
  ];

  if (isLoading) {
    return (
      <div className={cardStyles.cardContainer}>
        <AdminCard>
          <p>{t("Loading...", "در حال بارگذاری...")}</p>
        </AdminCard>
      </div>
    );
  }

  return (
    <div className={cardStyles.cardContainer}>
      <AdminCard>
        <div className={cardStyles.cardHeader}>
          <h2 className={cardStyles.cardTitle}>
            <FiPackage />
            {t("Inventory Management", "مدیریت موجودی")}
          </h2>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t("Search products...", "جستجوی محصولات...")}
          />
        </div>

        {/* Desktop Table View */}
        <div className={tableStyles.desktopTable}>
          <DataTable
            columns={columns}
            data={displayedProducts}
            emptyMessage={t("No products found", "محصولی یافت نشد")}
          />
        </div>

        {/* Mobile Card View */}
        <div className={tableStyles.mobileCards}>
          {displayedProducts.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center" }}>
              {t("No products found", "محصولی یافت نشد")}
            </div>
          ) : (
            displayedProducts.map((product) => (
              <div
                key={product.id}
                className={`${styles.inventoryCard} ${expandedProductId === product.id ? styles.expanded : ""}`}
                onClick={() => setExpandedProductId(expandedProductId === product.id ? null : product.id)}
              >
                <div className={styles.inventoryCardHeader}>
                  <div className={styles.inventoryCardContent}>
                    {product.image && (
                      <img
                        src={product.image}
                        alt={language === "fa" && product.nameFa ? product.nameFa : product.name}
                        className={styles.inventoryCardImage}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    )}
                    <div className={styles.inventoryCardInfo}>
                      <h4 className={styles.inventoryCardTitle}>
                        {language === "fa" && product.nameFa ? product.nameFa : product.name}
                      </h4>
                      <div className={styles.inventoryCardQuantity}>
                        {t("Quantity", "تعداد")}: <strong>{product.quantity}</strong>
                      </div>
                    </div>
                  </div>
                  <div className={styles.inventoryCardChevron}>
                    {expandedProductId === product.id ? <FiChevronUp /> : <FiChevronDown />}
                  </div>
                </div>
                {expandedProductId === product.id && (
                  <div className={styles.inventoryCardDetails}>
                    <div className={styles.inventoryCardDetailRow}>
                      <span className={styles.inventoryCardDetailLabel}>
                        {t("Current Quantity", "تعداد فعلی")}:
                      </span>
                      <span className={styles.inventoryCardDetailValue}>
                        {product.quantity}
                      </span>
                    </div>
                    <div className={styles.inventoryCardDetailRow}>
                      <span className={styles.inventoryCardDetailLabel}>
                        {t("Badge", "نشان")}:
                      </span>
                      <span className={styles.inventoryCardDetailValue}>
                        {product.badge && product.badge !== "None" ? product.badge : "-"}
                      </span>
                    </div>
                    <div className={styles.inventoryCardDetailRow}>
                      <span className={styles.inventoryCardDetailLabel}>
                        {t("Price", "قیمت")}:
                      </span>
                      <span className={styles.inventoryCardDetailValue}>
                        {formatPrice(product.price || "0", language, currency || "toman")}
                      </span>
                    </div>
                    {editingProduct?.id === product.id ? (
                      <form
                        onSubmit={handleSubmitQuantity}
                        className={styles.inventoryCardForm}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={styles.inventoryCardFormGroup}>
                          <label className={styles.inventoryCardFormLabel}>
                            {t("New Quantity", "تعداد جدید")}
                          </label>
                          <Input
                            type="number"
                            value={quantityValue}
                            onChange={(e) => setQuantityValue(e.target.value)}
                            min="0"
                            disabled={isUpdating}
                            className={styles.inventoryCardInput}
                          />
                        </div>
                        <div className={styles.inventoryCardActions}>
                          <Button
                            type="submit"
                            variant="primary"
                            disabled={isUpdating}
                          >
                            {t("Save", "ذخیره")}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={isUpdating}
                          >
                            {t("Cancel", "لغو")}
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <div className={styles.inventoryCardActions}>
                        <Button
                          variant="primary"
                          onClick={(e) => handleEditClick(product, e)}
                        >
                          {t("Edit Quantity", "ویرایش تعداد")}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {isLoadingMoreProducts && (
          <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
            {t("Loading more products...", "در حال بارگذاری محصولات بیشتر...")}
          </div>
        )}

        <div ref={productsSentinelRef} style={{ height: 1 }} />

        {!hasMoreProducts && products.length > 0 && !isLoadingMoreProducts && (
          <div style={{ textAlign: "center", padding: "1rem", color: "#666" }}>
            {t("You have reached the end of products", "به انتهای لیست محصولات رسیدید")}
          </div>
        )}
      </AdminCard>
    </div>
  );
}

