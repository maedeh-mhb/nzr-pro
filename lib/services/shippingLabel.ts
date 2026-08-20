import puppeteer from "puppeteer-core";
import { db } from "@/lib/db";
import { orders, orderItems, guestOrders, users, addresses, contactSettings } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import fs from "fs";
import path from "path";

interface ShippingLabelData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  provinceName: string;
  cityName: string;
  postalCode?: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  itemsCount: number;
}

// Helper function to get province name by ID
function getProvinceNameById(provinceId: number): string {
  try {
    // Try Farsi first, then English
    const provincesPaths = [
      path.join(process.cwd(), "public", "data", "provinces-fa.json"),
      path.join(process.cwd(), "public", "data", "provinces-en.json"),
    ];

    for (const provincesPath of provincesPaths) {
      if (fs.existsSync(provincesPath)) {
        const provincesData = JSON.parse(fs.readFileSync(provincesPath, "utf-8"));
        const province = provincesData.find((p: any) => p.id === provinceId);
        if (province) return province.name;
      }
    }
    return `Province ${provinceId}`;
  } catch (error) {
    console.error("Error loading provinces:", error);
    return `Province ${provinceId}`;
  }
}

// Helper function to get city name by ID
function getCityNameById(cityId: number): string {
  try {
    // Try Farsi first, then English
    const citiesPaths = [
      path.join(process.cwd(), "public", "data", "cities-fa.json"),
      path.join(process.cwd(), "public", "data", "cities-en.json"),
    ];

    for (const citiesPath of citiesPaths) {
      if (fs.existsSync(citiesPath)) {
        const citiesData = JSON.parse(fs.readFileSync(citiesPath, "utf-8"));
        const city = citiesData.find((c: any) => c.id === cityId);
        if (city) return city.name;
      }
    }
    return `City ${cityId}`;
  } catch (error) {
    console.error("Error loading cities:", error);
    return `City ${cityId}`;
  }
}

/**
 * Get shipping label data for an order
 */
export async function getShippingLabelData(orderId: string): Promise<ShippingLabelData | null> {
  try {
    // Fetch order
    const order = await db.query.orders.findFirst({
      where: eq(orders.id, orderId),
    });

    if (!order) {
      return null;
    }

    // Fetch order items to count
    const items = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, order.id),
    });

    // Get customer information
    let customerName = "";
    let customerPhone = "";
    let customerAddress = "";
    let provinceName = "";
    let cityName = "";
    let postalCode: string | undefined;

    if (order.userId) {
      // Registered user
      const user = await db.query.users.findFirst({
        where: eq(users.id, order.userId),
      });

      if (user) {
        customerName = `${user.name} ${user.surname || ""}`.trim();
        customerPhone = user.phone || "";

        // Get user's address (use default or first address)
        const userAddresses = await db
          .select()
          .from(addresses)
          .where(eq(addresses.userId, order.userId))
          .orderBy(desc(addresses.createdAt))
          .limit(1);

        const userAddress = userAddresses[0];

        if (userAddress) {
          customerAddress = userAddress.address;
          provinceName = getProvinceNameById(userAddress.provinceId);
          cityName = getCityNameById(userAddress.cityId);
          postalCode = userAddress.postalCode || undefined;
        }
      }
    } else {
      // Guest order
      const guestOrder = await db.query.guestOrders.findFirst({
        where: eq(guestOrders.orderId, orderId),
      });

      if (guestOrder) {
        customerName = guestOrder.guestName;
        customerPhone = guestOrder.guestPhone;
        customerAddress = guestOrder.address;
        provinceName = getProvinceNameById(guestOrder.provinceId);
        cityName = getCityNameById(guestOrder.cityId);
        postalCode = guestOrder.postalCode || undefined;
      }
    }

    // Get company information from contact settings
    const contactSettingsData = await db.query.contactSettings.findFirst();
    const companyName = "Nazira";
    const companyAddress = contactSettingsData?.addressFa || contactSettingsData?.address || "";
    const companyPhone = contactSettingsData?.phone || "";

    return {
      orderNumber: order.orderNumber,
      customerName,
      customerPhone,
      customerAddress,
      provinceName,
      cityName,
      postalCode,
      companyName,
      companyAddress,
      companyPhone,
      itemsCount: items.length,
    };
  } catch (error) {
    console.error("Error getting shipping label data:", error);
    return null;
  }
}

/**
 * Generate shipping label HTML
 */
export function generateShippingLabelHTML(data: ShippingLabelData): string {
  const fullAddress = [
    data.customerAddress,
    data.cityName,
    data.provinceName,
    data.postalCode ? `کد پستی: ${data.postalCode}` : "",
  ]
    .filter(Boolean)
    .join("، ");

  return `
<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shipping Label - ${data.orderNumber}</title>
  <style>
    @font-face {
      font-family: 'Sahel';
      src: url('https://cdn.jsdelivr.net/gh/rastikerdar/sahel-font@v3.4.0/dist/Sahel.woff2') format('woff2');
      font-weight: normal;
      font-style: normal;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Sahel', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 20px;
      background: #fff;
      color: #333;
    }
    .label-container {
      width: 100%;
      max-width: 400px;
      margin: 0 auto;
      border: 2px solid #000;
      padding: 20px;
      background: #fff;
    }
    .label-header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 15px;
    }
    .label-header h1 {
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    .label-header .order-number {
      font-size: 18px;
      color: #666;
    }
    .label-section {
      margin-bottom: 20px;
    }
    .label-section-title {
      font-size: 14px;
      font-weight: bold;
      margin-bottom: 8px;
      color: #000;
      border-bottom: 1px solid #ddd;
      padding-bottom: 4px;
    }
    .label-content {
      font-size: 16px;
      line-height: 1.6;
    }
    .label-content strong {
      font-weight: bold;
    }
    .return-address {
      border-top: 2px solid #000;
      padding-top: 15px;
      margin-top: 20px;
      font-size: 14px;
      text-align: center;
    }
    .return-address-title {
      font-weight: bold;
      margin-bottom: 8px;
    }
    @media print {
      body {
        padding: 0;
      }
      .label-container {
        max-width: 100%;
        border: none;
      }
    }
  </style>
</head>
<body>
  <div class="label-container">
    <div class="label-header">
      <h1>برچسب ارسال</h1>
      <div class="order-number">سفارش: ${data.orderNumber}</div>
    </div>

    <div class="label-section">
      <div class="label-section-title">گیرنده:</div>
      <div class="label-content">
        <strong>${data.customerName}</strong><br>
        ${data.customerPhone ? `تلفن: ${data.customerPhone}<br>` : ""}
        ${fullAddress}
      </div>
    </div>

    <div class="label-section">
      <div class="label-section-title">محتویات:</div>
      <div class="label-content">
        ${data.itemsCount} ${data.itemsCount === 1 ? "آیتم" : "آیتم"}
      </div>
    </div>

    <div class="return-address">
      <div class="return-address-title">آدرس بازگشت:</div>
      <div>${data.companyName}</div>
      ${data.companyAddress ? `<div>${data.companyAddress}</div>` : ""}
      ${data.companyPhone ? `<div>تلفن: ${data.companyPhone}</div>` : ""}
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate PDF shipping label from HTML
 */
export async function generateShippingLabelPDF(orderId: string): Promise<Buffer | null> {
  try {
    const labelData = await getShippingLabelData(orderId);
    if (!labelData) {
      return null;
    }

    const html = generateShippingLabelHTML(labelData);

    // Launch Puppeteer
    let executablePath: string | undefined = undefined;

    const possiblePaths = [
      process.env.CHROME_PATH,
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe") : undefined,
      process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe") : undefined,
      process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe") : undefined,
    ].filter(Boolean) as string[];

    for (const chromePath of possiblePaths) {
      if (chromePath && fs.existsSync(chromePath)) {
        executablePath = chromePath;
        break;
      }
    }

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
      executablePath: executablePath,
    });

    const page = await browser.newPage();

    await page.setContent(html, { waitUntil: "networkidle0" as "load"});

    // Generate PDF with label size (4x6 inches)
    const pdf = await page.pdf({
      width: "4in",
      height: "6in",
      printBackground: true,
      margin: {
        top: "0mm",
        right: "0mm",
        bottom: "0mm",
        left: "0mm",
      },
    });

    await browser.close();

    return Buffer.from(pdf);
  } catch (error) {
    console.error("Error generating shipping label PDF:", error);
    return null;
  }
}

