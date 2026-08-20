export function normalizeSearchText(value: string | null | undefined): string {
  if (!value) return "";

  const arabicIndicDigitsMap: Record<string, string> = {
    "۰": "0",
    "۱": "1",
    "۲": "2",
    "۳": "3",
    "۴": "4",
    "۵": "5",
    "۶": "6",
    "۷": "7",
    "۸": "8",
    "۹": "9",
  };

  const normalized = value
    .toString()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[۰-۹]/g, (digit) => arabicIndicDigitsMap[digit] || digit)
    .replace(/[^a-z0-9\u0600-\u06ff]/g, "");

  return normalized;
}

export function matchesOrderSearch(order: {
  orderNumber?: string | null;
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items?: Array<{
    sellerNameEn?: string | null;
    sellerNameFa?: string | null;
    productName?: string | null;
    productNameFa?: string | null;
  }>;
}, search: string): boolean {
  const normalizedSearch = normalizeSearchText(search);

  if (!normalizedSearch) {
    return true;
  }

  const searchableValues = [
    order.orderNumber,
    order.customerName,
    order.customerEmail,
    order.customerPhone,
    ...(order.items || []).flatMap((item) => [
      item.sellerNameEn,
      item.sellerNameFa,
      item.productName,
      item.productNameFa,
    ]),
  ];

  return searchableValues.some((value) => normalizeSearchText(value).includes(normalizedSearch));
}
