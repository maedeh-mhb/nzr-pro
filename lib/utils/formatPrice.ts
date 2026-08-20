/**
 * Format price based on currency setting
 * @param price - Price as number or string
 * @param currency - Currency code (usd, eur, gbp, toman)
 * @param language - Language code (en, fa)
 * @returns Formatted price string
 */

export function formatPrice(
  price: number | string,
  language: string = "en",
  currency: string = "toman"
): string {
  const numPrice = typeof price === "string" ? parseFloat(price) : price;

  if (isNaN(numPrice)) {
    return "0";
  }

  // Normalize currency: treat any variant of 'toman' (case-insensitive, with/without s, Persian/English) as toman
  const normalizedCurrency = (() => {
    if (!currency) return "toman";
    const c = currency.toLowerCase().replace(/s$/, "").trim();
    if (["toman", "تومان", "tomans", "تومان ها", "tomaan", "تومانها"].includes(c) || c.startsWith("toman")) {
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

    // If English language, use "Tomans" without sign
    if (language === "en") {
      return `${formattedNumber} Tomans`;
    }
    // If Farsi, use "تومان"
    return `${formattedNumber} تومان`;
  }

  // Standard currency formatting
  const currencyMap: Record<string, string> = {
    usd: "USD",
    eur: "EUR",
    gbp: "GBP",
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

