/**
 * Helper functions for email service
 */

import path from "path";
import fs from "fs";

/**
 * Get province name by ID (Farsi)
 */
export function getProvinceNameByIdFa(provinceId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "provinces-fa.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const provinces = JSON.parse(fileContents);
    const province = provinces.find((p: any) => p.id === provinceId);
    return province ? province.name : null;
  } catch (error) {
    console.error("Error loading provinces:", error);
    return null;
  }
}

/**
 * Get city name by ID (Farsi)
 */
export function getCityNameByIdFa(cityId: number, provinceId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "cities-fa.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const cities = JSON.parse(fileContents);
    const city = cities.find((c: any) => c.id === cityId && c.province_id === provinceId);
    return city ? city.name : null;
  } catch (error) {
    console.error("Error loading cities:", error);
    return null;
  }
}

/**
 * Format payment method for display (Farsi)
 */
export function formatPaymentMethodFa(method: string): string {
  switch (method.toLowerCase()) {
    case "card_to_card":
      return "کارت به کارت";
    case "pay_after_delivery":
      return "پرداخت در محل";
    case "online":
      return "پرداخت آنلاین";
    default:
      return method;
  }
}

