/**
 * Format price based on currency setting
 * @param price - Price as number or string
 * @param currency - Currency code (usd, eur, gbp, toman)
 * @param language - Language code (en, fa)
 * @returns Formatted price string
 */

function normalizePriceInput(value: number | string): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : NaN;
  }

  const normalized = String(value)
    .trim()
    .replace(/[,٬]/g, "")
    .replace(/[۰-۹]/g, (digit) => ({
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
    }[digit] ?? digit))
    .replace(/[^0-9.\-]/g, "");

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

export function formatPrice(
  price: number | string,
  language: string = "en",
  currency: string = "toman"
): string {
  const numPrice = normalizePriceInput(price);

  if (isNaN(numPrice)) {
    return "0";
  }

  const normalizedCurrency = (() => {
    if (!currency) return "toman";
    const c = String(currency)
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/s$/, "");

    if (["toman", "تومان", "tomans", "تومانها", "تومانها", "tomaan", "تومان‌ها"].includes(c) || c.startsWith("toman")) {
      return "toman";
    }

    return c;
  })();

  if (normalizedCurrency === "toman") {
    const formattedNumber = new Intl.NumberFormat(
      language === "fa" ? "fa-IR" : "en-US",
      {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }
    ).format(numPrice);

    if (language === "en") {
      return `${formattedNumber} Tomans`;
    }

    return `${formattedNumber} تومان`;
  }

  const currencyMap: Record<string, string> = {
    usd: "USD",
    eur: "EUR",
    gbp: "GBP",
    irr: "IRR",
    rial: "IRR",
    rials: "IRR",
    toman: "TOMAN",
  };

  const currencyCode = currencyMap[normalizedCurrency] || "USD";

  return new Intl.NumberFormat(
    language === "fa" ? "fa-IR" : "en-US",
    {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  ).format(numPrice);
}

