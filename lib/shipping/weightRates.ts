export const SHIPPING_WEIGHT_TIERS = [
  { maxWeightKg: 0.3, labelEn: "Up to 300 g", labelFa: "تا ۳۰۰ گرم" },
  { maxWeightKg: 1, labelEn: "301 g–1 kg", labelFa: "۳۰۱ گرم تا ۱ کیلوگرم" },
  { maxWeightKg: 2, labelEn: "1–2 kg", labelFa: "۱ تا ۲ کیلوگرم" },
  { maxWeightKg: 3, labelEn: "2–3 kg", labelFa: "۲ تا ۳ کیلوگرم" },
  { maxWeightKg: 4, labelEn: "3–4 kg", labelFa: "۳ تا ۴ کیلوگرم" },
  { maxWeightKg: 5, labelEn: "4–5 kg", labelFa: "۴ تا ۵ کیلوگرم" },
  { maxWeightKg: 6, labelEn: "5–6 kg", labelFa: "۵ تا ۶ کیلوگرم" },
  { maxWeightKg: 7, labelEn: "6–7 kg", labelFa: "۶ تا ۷ کیلوگرم" },
  { maxWeightKg: 8, labelEn: "7–8 kg", labelFa: "۷ تا ۸ کیلوگرم" },
  { maxWeightKg: 9, labelEn: "8–9 kg", labelFa: "۸ تا ۹ کیلوگرم" },
] as const;

export const DEFAULT_SHIPPING_WEIGHT_RATES = [
  170000,
  200000,
  250000,
  300000,
  370000,
  440000,
  440000,
  480000,
  520000,
  570000,
];

export function calculateWeightBasedShippingCost(
  totalWeightKg: number,
  rates: number[]
): number {
  if (!Number.isFinite(totalWeightKg) || totalWeightKg < 0) {
    throw new RangeError("Total product weight must be a non-negative number");
  }
  if (
    rates.length !== SHIPPING_WEIGHT_TIERS.length ||
    rates.some((rate) => !Number.isFinite(rate) || rate < 0)
  ) {
    throw new RangeError("Shipping weight rates are not configured correctly");
  }

  const tierIndex = SHIPPING_WEIGHT_TIERS.findIndex(
    (tier, index) =>
      totalWeightKg <= tier.maxWeightKg ||
      index === SHIPPING_WEIGHT_TIERS.length - 1
  );

  return rates[tierIndex];
}
