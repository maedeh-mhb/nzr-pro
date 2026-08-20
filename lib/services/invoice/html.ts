/**
 * Invoice HTML generation
 */

import moment from "moment-jalaali";
import { formatPrice } from "@/lib/utils/formatPrice";
import type { InvoiceData } from "./types";

/**
 * Generate invoice HTML
 */
export function generateInvoiceHTML(data: InvoiceData): string {
  const jDate = moment(data.order.createdAt);
  const orderDate = jDate.format("jYYYY/jMM/jDD");

  // Format payment method
  const paymentMethodMap: Record<string, string> = {
    card_to_card: "کارت به کارت",
    online_payment: "پرداخت آنلاین",
    pay_after_delivery: "پرداخت در محل",
    paypal: "پی‌پال",
  };
  const paymentMethod = paymentMethodMap[data.order.paymentMethod || ""] || data.order.paymentMethod || "";

  // Format shipping method
  const shippingMethodMap: Record<string, string> = {
    iranian_post: "پست پیشتاز",
    courier: "پیک",
  };
  const shippingMethod = shippingMethodMap[data.order.shippingMethod || ""] || data.order.shippingMethod || "";

  // Calculate totals
  const subtotal = data.orderItems.reduce((sum, item) => {
    return sum + parseFloat(item.price.toString()) * item.quantity;
  }, 0);
  const discount = data.order.discountAmount ? parseFloat(data.order.discountAmount.toString()) : 0;
  const total = parseFloat(data.order.total.toString());

  // Generate items HTML
  const itemsHTML = data.orderItems
    .map(
      (item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td>
        <div class="item-name">${item.productNameFa || item.productName}</div>
        ${item.category ? `<div class="item-category">دسته‌بندی: ${item.category}</div>` : ""}
      </td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-left">${formatPrice(parseFloat(item.price.toString()), "fa")}</td>
      <td class="text-left">${formatPrice(parseFloat(item.price.toString()) * item.quantity, "fa")}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاکتور فروش</title>
    <style>
        /* No external font - using system fonts only to avoid timeout */
        /* If you have local font files, uncomment and update the path below */
        /*
        @font-face {
            font-family: 'Sahel';
            src: url('/fonts/Sahel.woff2') format('woff2'),
                 url('/fonts/Sahel.woff') format('woff');
            font-weight: normal;
            font-style: normal;
        }
        */

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            direction: rtl;
            background: #f5f5f5;
            padding: 20px;
            font-size: 14px;
            line-height: 1.6;
            color: #333;
        }

        .invoice-container {
            max-width: 210mm;
            min-height: 297mm;
            margin: 0 auto;
            background: white;
            padding: 30mm 25mm;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }

        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #6c9cb8;
        }

        .company-info {
            flex: 1;
        }

        .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #6c9cb8;
            margin-bottom: 10px;
        }

        .company-details {
            font-size: 12px;
            color: #666;
            line-height: 1.8;
        }

        .invoice-title {
            text-align: left;
            flex: 1;
        }

        .invoice-title h1 {
            font-size: 28px;
            color: #6c9cb8;
            margin-bottom: 10px;
        }

        .invoice-number {
            font-size: 14px;
            color: #666;
        }

        .customer-section {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .customer-info {
            flex: 1;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #6c9cb8;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 1px solid #ddd;
        }

        .info-row {
            display: flex;
            margin-bottom: 8px;
            font-size: 13px;
        }

        .info-label {
            font-weight: bold;
            color: #555;
            min-width: 100px;
        }

        .info-value {
            color: #333;
        }

        .order-details {
            flex: 1;
            margin-right: 20px;
        }

        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            font-size: 13px;
        }

        .items-table thead {
            background: #6c9cb8;
            color: white;
        }

        .items-table th {
            padding: 12px 10px;
            text-align: right;
            font-weight: bold;
            font-size: 13px;
        }

        .items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e0e0e0;
            text-align: right;
        }

        .items-table tbody tr:hover {
            background: #f8f9fa;
        }

        .items-table tbody tr:last-child td {
            border-bottom: none;
        }

        .item-name {
            font-weight: 600;
            color: #333;
        }

        .item-category {
            font-size: 11px;
            color: #999;
            margin-top: 3px;
        }

        .text-center {
            text-align: center;
        }

        .text-left {
            text-align: left;
        }

        .price-summary {
            margin-top: 30px;
            margin-bottom: 30px;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            font-size: 14px;
        }

        .summary-label {
            color: #666;
        }

        .summary-value {
            font-weight: 600;
            color: #333;
        }

        .summary-row.total {
            border-top: 2px solid #6c9cb8;
            border-bottom: 2px solid #6c9cb8;
            padding: 15px 0;
            margin-top: 10px;
            margin-bottom: 10px;
        }

        .summary-row.total .summary-label {
            font-size: 18px;
            font-weight: bold;
            color: #6c9cb8;
        }

        .summary-row.total .summary-value {
            font-size: 20px;
            font-weight: bold;
            color: #6c9cb8;
        }

        .summary-row.discount {
            color: #28a745;
        }

        .summary-row.discount .summary-value {
            color: #28a745;
        }

        .payment-info {
            margin-top: 30px;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
        }

        .invoice-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #999;
        }

        @media print {
            body {
                background: white;
                padding: 0;
            }

            .invoice-container {
                box-shadow: none;
                padding: 20mm 15mm;
            }

            @page {
                size: A4;
                margin: 0;
            }
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-info">
                <div class="company-name">${data.companyName}</div>
                <div class="company-details">
                    ${data.companyAddress ? `آدرس: ${data.companyAddress}<br>` : ""}
                    ${data.companyPhone ? `تلفن: ${data.companyPhone}<br>` : ""}
                    ${data.companyEmail ? `ایمیل: ${data.companyEmail}` : ""}
                </div>
            </div>
            <div class="invoice-title">
                <h1>فاکتور فروش</h1>
                <div class="invoice-number">شماره فاکتور: ${data.order.orderNumber}</div>
            </div>
        </div>

        <div class="customer-section">
            <div class="customer-info">
                <div class="section-title">اطلاعات مشتری</div>
                <div class="info-row">
                    <span class="info-label">نام و نام خانوادگی:</span>
                    <span class="info-value">${data.customerName}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">ایمیل:</span>
                    <span class="info-value">${data.customerEmail}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">تلفن:</span>
                    <span class="info-value">${data.customerPhone}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">آدرس:</span>
                    <span class="info-value">${data.customerAddress}</span>
                </div>
            </div>
            <div class="order-details">
                <div class="section-title">اطلاعات سفارش</div>
                <div class="info-row">
                    <span class="info-label">تاریخ سفارش:</span>
                    <span class="info-value">${orderDate}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">روش پرداخت:</span>
                    <span class="info-value">${paymentMethod}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">روش ارسال:</span>
                    <span class="info-value">${shippingMethod}</span>
                </div>
            </div>
        </div>

        <table class="items-table">
            <thead>
                <tr>
                    <th style="width: 5%;">ردیف</th>
                    <th style="width: 40%;">نام محصول</th>
                    <th style="width: 15%;" class="text-center">تعداد</th>
                    <th style="width: 20%;" class="text-left">قیمت واحد</th>
                    <th style="width: 20%;" class="text-left">جمع</th>
                </tr>
            </thead>
            <tbody>
                ${itemsHTML}
            </tbody>
        </table>

        <div class="price-summary">
            <div class="summary-row">
                <span class="summary-label">جمع کل:</span>
                <span class="summary-value">${formatPrice(subtotal, "fa")}</span>
            </div>
            ${discount > 0 ? `
            <div class="summary-row discount">
                <span class="summary-label">تخفیف:</span>
                <span class="summary-value">-${formatPrice(discount, "fa")}</span>
            </div>
            ` : ""}
            <div class="summary-row total">
                <span class="summary-label">مبلغ قابل پرداخت:</span>
                <span class="summary-value">${formatPrice(total, "fa")}</span>
            </div>
        </div>

        <div class="payment-info">
            <div class="section-title">اطلاعات پرداخت</div>
            <div class="info-row">
                <span class="info-label">روش پرداخت:</span>
                <span class="info-value">${paymentMethod}</span>
            </div>
            <div class="info-row">
                <span class="info-label">وضعیت:</span>
                <span class="info-value">${data.order.status === "pending" ? "در انتظار پرداخت" : "پرداخت شده"}</span>
            </div>
        </div>

        <div class="invoice-footer">
            <p>با تشکر از خرید شما</p>
            <p>این فاکتور به صورت خودکار تولید شده است</p>
        </div>
    </div>
</body>
</html>`;
}