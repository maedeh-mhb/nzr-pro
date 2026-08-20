import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { shippingSettings, products } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import fs from "fs";
import path from "path";
export const dynamic = "force-dynamic";

// Load neighboring provinces data
function getNeighboringProvinces() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "neighborProvinces-en.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    return JSON.parse(fileContents);
  } catch (error) {
    console.error("Error loading neighboring provinces:", error);
    return {};
  }
}

// Get province name by ID (English)
function getProvinceNameById(provinceId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "provinces-en.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const provinces = JSON.parse(fileContents);
    const province = provinces.find((p: any) => p.id === provinceId);
    return province ? province.name : null;
  } catch (error) {
    console.error("Error loading provinces:", error);
    return null;
  }
}

// Get province name by ID (Farsi)
function getProvinceNameByIdFa(provinceId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "provinces-fa.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const provinces = JSON.parse(fileContents);
    const province = provinces.find((p: any) => p.id === provinceId);
    return province ? province.name : null;
  } catch (error) {
    console.error("Error loading provinces (Farsi):", error);
    return null;
  }
}

// Get province slug by ID
function getProvinceSlugById(provinceId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "provinces-en.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const provinces = JSON.parse(fileContents);
    const province = provinces.find((p: any) => p.id === provinceId);
    return province ? province.slug : null;
  } catch (error) {
    console.error("Error loading provinces:", error);
    return null;
  }
}

// Get city name by ID
function getCityNameById(cityId: number): string | null {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "cities-en.json");
    const fileContents = fs.readFileSync(filePath, "utf8");
    const cities = JSON.parse(fileContents);
    const city = cities.find((c: any) => c.id === cityId);
    return city ? city.name : null;
  } catch (error) {
    console.error("Error loading cities:", error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { provinceId, cityId, items, userId } = body; // items: [{ productId, quantity }]

    if (!provinceId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Province ID and items are required" },
        { status: 400 }
      );
    }

    // Get shipping settings
    const settings = await db.select().from(shippingSettings).limit(1);
    if (settings.length === 0) {
      return NextResponse.json(
        { error: "Shipping settings not configured" },
        { status: 404 }
      );
    }

    const shippingConfig = settings[0];
    if (!shippingConfig.adminProvince) {
      return NextResponse.json(
        { error: "Admin province not configured" },
        { status: 404 }
      );
    }

    // Get product IDs from cart items
    const productIds = items.map((item: any) => item.productId);

    // Fetch products with weights
    const productData = await db
      .select({
        id: products.id,
        weight: products.weight,
      })
      .from(products)
      .where(inArray(products.id, productIds));

    // Calculate total weight
    let totalWeight = 0;
    for (const item of items) {
      const product = productData.find((p) => p.id === item.productId);
      if (product && product.weight) {
        const weight = parseFloat(String(product.weight));
        totalWeight += weight * item.quantity;
      }
    }

    // Get province name and slug
    const provinceNameEn = getProvinceNameById(provinceId);
    const provinceNameFa = getProvinceNameByIdFa(provinceId);
    const provinceSlug = getProvinceSlugById(provinceId);
    
    if (!provinceNameEn && !provinceNameFa) {
      return NextResponse.json(
        { error: "Invalid province ID" },
        { status: 400 }
      );
    }

    // Determine shipping price tier
    let basePrice = 0;
    const adminProvinceValue = shippingConfig.adminProvince?.trim() || "";

    // Compare with English name, Farsi name, or slug (case-insensitive)
    const provinceMatches = 
      (provinceNameEn && provinceNameEn.trim().toLowerCase() === adminProvinceValue.toLowerCase()) ||
      (provinceNameFa && provinceNameFa.trim().toLowerCase() === adminProvinceValue.toLowerCase()) ||
      (provinceSlug && provinceSlug.trim().toLowerCase() === adminProvinceValue.toLowerCase());

    if (provinceMatches) {
      // Same as admin province
      basePrice = shippingConfig.priceAdminProvince
        ? parseFloat(String(shippingConfig.priceAdminProvince))
        : 0;
    } else {
      // Check if it's a neighboring province
      // Neighboring provinces map uses English province names as keys
      const neighboringProvinces = getNeighboringProvinces();
      const neighbors = neighboringProvinces[adminProvinceValue] || [];
      // Check against English name (neighboring provinces use English names)
      const isNeighboring = provinceNameEn ? neighbors.includes(provinceNameEn) : false;

      if (isNeighboring) {
        basePrice = shippingConfig.priceNeighboringProvinces
          ? parseFloat(String(shippingConfig.priceNeighboringProvinces))
          : 0;
      } else {
        basePrice = shippingConfig.priceOtherProvinces
          ? parseFloat(String(shippingConfig.priceOtherProvinces))
          : 0;
      }
    }

    // Apply weight multipliers
    let shippingCost = basePrice;
    const weight1 = shippingConfig.weight1 ? parseFloat(String(shippingConfig.weight1)) : null;
    const weight1Multiplier = shippingConfig.weight1Multiplier
      ? parseFloat(String(shippingConfig.weight1Multiplier))
      : null;
    const weight2 = shippingConfig.weight2 ? parseFloat(String(shippingConfig.weight2)) : null;
    const weight2Multiplier = shippingConfig.weight2Multiplier
      ? parseFloat(String(shippingConfig.weight2Multiplier))
      : null;
    const weight3 = shippingConfig.weight3 ? parseFloat(String(shippingConfig.weight3)) : null;
    const weight3Multiplier = shippingConfig.weight3Multiplier
      ? parseFloat(String(shippingConfig.weight3Multiplier))
      : null;

    if (weight3 && weight3Multiplier && totalWeight > weight3) {
      shippingCost = basePrice * weight3Multiplier;
    } else if (weight2 && weight2Multiplier && totalWeight > weight2) {
      shippingCost = basePrice * weight2Multiplier;
    } else if (weight1 && weight1Multiplier && totalWeight > weight1) {
      shippingCost = basePrice * weight1Multiplier;
    }

    // Determine available shipping methods
    const availableMethods: Array<{ value: string; label: string; labelFa: string; cost: number }> = [];
    
    // Iranian Post is always available
    availableMethods.push({
      value: "iranian_post",
      label: "Iranian Post",
      labelFa: "پست ایران",
      cost: shippingCost,
    });

    // Check if "Send by Courier" is available
    // Conditions:
    // 1. User must have cityId (full address)
    // 2. User's province must match admin's province (case-insensitive)
    // 3. User's city must match admin's city
    // Note: provinceMatches is already calculated above for shipping price tier
    let canUseCourier = false;
    
    // Check if cityId is provided and adminCity is configured
    // cityId can be 0, so we need to check for null/undefined specifically
    const hasCityId = cityId !== null && cityId !== undefined && String(cityId).trim() !== "";
    const hasAdminCity = shippingConfig.adminCity !== null && shippingConfig.adminCity !== undefined && shippingConfig.adminCity !== 0;
    
    if (hasCityId && hasAdminCity && provinceMatches) {
      // Convert to numbers for comparison
      const userCityId = Number(cityId);
      const adminCityId = Number(shippingConfig.adminCity);

      // Check if city IDs match (both must be valid numbers and equal)
      const cityMatches = !isNaN(userCityId) && !isNaN(adminCityId) && userCityId === adminCityId;

      if (cityMatches) {
        canUseCourier = true;
        // Courier shipping cost (same as Iranian Post for now, can be configured later)
        availableMethods.push({
          value: "courier",
          label: "Send by Courier",
          labelFa: "ارسال با پیک",
          cost: shippingCost,
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        shippingCost,
        availableMethods,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error calculating shipping cost:", error);
    return NextResponse.json(
      { error: "Failed to calculate shipping cost" },
      { status: 500 }
    );
  }
}

