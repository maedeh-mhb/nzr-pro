"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/utils/language";

export interface EditableOrderItem {
  productId: string;
  productName: string;
  productNameFa?: string | null;
  quantity: number;
  price: string;
}

interface OrderEditorProps {
  orderId: string;
  items: EditableOrderItem[];
  editExpiresAt: string;
  editToken?: string | null;
  onSaved: (
    total: string,
    items: EditableOrderItem[],
    shippingCost: number,
    discountAmount: string | null,
    paymentRequired?: boolean,
    refundAmount?: number
  ) => void;
}

interface ProductOption {
  id: string;
  name: string;
  nameFa: string | null;
}

export default function OrderEditor({
  orderId,
  items,
  editExpiresAt,
  editToken,
  onSaved,
}: OrderEditorProps) {
  const { t, language } = useLanguage();
  const [draft, setDraft] = useState(items);
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => setDraft(items), [items]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/products?search=${encodeURIComponent(search.trim())}&limit=20&page=1`
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Product search failed");
        const currentIds = new Set(draft.map((item) => item.productId));
        setProducts((data.data || []).filter(
          (product: ProductOption) => !currentIds.has(product.id)
        ));
      } catch (searchError) {
        setError(searchError instanceof Error ? searchError.message : "Product search failed");
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search, draft]);

  if (!editExpiresAt || Date.parse(editExpiresAt) <= now) return null;

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/user/orders/${orderId}/modify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.map(({ productId, quantity }) => ({ productId, quantity })),
          editToken,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update order");
      onSaved(
        data.order.total,
        data.order.items,
        data.order.shippingCost,
        data.order.discountAmount,
        data.paymentRequired,
        data.refundAmount
      );
      if (data.paymentRequired) {
        const paymentResponse = await fetch("/api/payment/zibal/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, editToken }),
        });
        const paymentData = await paymentResponse.json();
        if (!paymentResponse.ok || !paymentData.paymentUrl) {
          throw new Error(paymentData.error || "Unable to start additional payment");
        }
        window.location.assign(paymentData.paymentUrl);
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update order");
    } finally {
      setSaving(false);
    }
  };

  const setQuantity = (productId: string, quantity: number) => {
    setDraft((current) =>
      current.map((item) => item.productId === productId
        ? { ...item, quantity: Math.max(0, Math.min(1000, quantity || 0)) }
        : item)
    );
  };

  return (
    <section aria-label={t("Edit order", "ویرایش سفارش")} style={{ borderTop: "1px solid #e5e7eb", marginTop: "1rem", paddingTop: "1rem" }}>
      <h4>{t("Edit order items", "ویرایش اقلام سفارش")}</h4>
      <p>{t("You can change this order for one hour after it was placed.", "تا یک ساعت پس از ثبت سفارش می‌توانید آن را تغییر دهید.")}</p>
      {draft.map((item) => (
        <div key={item.productId} style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "0.5rem 0" }}>
          <span style={{ flex: 1 }}>{language === "fa" && item.productNameFa ? item.productNameFa : item.productName}</span>
          <label>
            <span className="sr-only">{t("Quantity", "تعداد")}</span>
            <input type="number" min={0} max={1000} value={item.quantity} onChange={(event) => setQuantity(item.productId, Number(event.target.value))} style={{ width: "5rem" }} />
          </label>
          <button type="button" onClick={() => setQuantity(item.productId, 0)}>{t("Remove", "حذف")}</button>
        </div>
      ))}
      <label style={{ display: "block", marginTop: "0.75rem" }}>
        {t("Add a product", "افزودن محصول")}
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Search products", "جستجوی محصولات")} style={{ display: "block", width: "100%", marginTop: "0.25rem" }} />
      </label>
      {loading && <p>{t("Searching...", "در حال جستجو...")}</p>}
      {products.map((product) => (
        <button
          key={product.id}
          type="button"
          onClick={() => {
            setDraft((current) => [...current, {
              productId: product.id,
              productName: product.name,
              productNameFa: product.nameFa,
              price: "0",
              quantity: 1,
            }]);
            setSearch("");
            setProducts([]);
          }}
          style={{ display: "block", margin: "0.4rem 0" }}
        >
          {language === "fa" && product.nameFa ? product.nameFa : product.name}
        </button>
      ))}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <button type="button" onClick={save} disabled={saving}>
        {saving ? t("Saving...", "در حال ذخیره...") : t("Save order changes", "ذخیره تغییرات سفارش")}
      </button>
    </section>
  );
}
