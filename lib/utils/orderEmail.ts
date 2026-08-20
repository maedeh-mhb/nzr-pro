/**
 * Generate order confirmation email content
 * This is a placeholder for email functionality
 * In production, integrate with an email service (e.g., SendGrid, Resend, Nodemailer)
 */

export interface OrderEmailData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productName: string;
    quantity: number;
    price: string;
  }>;
  total: string;
  paymentMethod: string;
  shippingAddress?: {
    provinceId: number;
    cityId: number;
    address: string;
  };
  isGuest: boolean;
  language: "en" | "fa";
  currency: string;
}

export function generateOrderConfirmationEmail(data: OrderEmailData): {
  subject: string;
  html: string;
  text: string;
} {
  const { orderNumber, customerName, items, total, paymentMethod, language, currency } = data;

  const subject =
    language === "fa"
      ? `تأیید سفارش ${orderNumber}`
      : `Order Confirmation ${orderNumber}`;

  const itemsList = items
    .map(
      (item) =>
        `<li>${item.productName} x${item.quantity} - ${formatPrice(
          parseFloat(item.price) * item.quantity,
          currency,
          language
        )}</li>`
    )
    .join("");

  const html = `
    <!DOCTYPE html>
    <html dir="${language === "fa" ? "rtl" : "ltr"}" lang="${language}">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #007bff;">
        ${language === "fa" ? "سفارش شما با موفقیت ثبت شد" : "Your Order Has Been Confirmed"}
      </h1>
      <p>
        ${language === "fa" ? `سلام ${customerName},` : `Hello ${customerName},`}
      </p>
      <p>
        ${
          language === "fa"
            ? "از سفارش شما متشکریم. جزئیات سفارش شما در زیر آمده است:"
            : "Thank you for your order. Your order details are below:"
        }
      </p>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <p><strong>${language === "fa" ? "شماره سفارش" : "Order Number"}:</strong> ${orderNumber}</p>
        <p><strong>${language === "fa" ? "روش پرداخت" : "Payment Method"}:</strong> ${paymentMethod}</p>
        <p><strong>${language === "fa" ? "مجموع" : "Total"}:</strong> ${formatPrice(parseFloat(total), currency, language)}</p>
      </div>
      <h2>${language === "fa" ? "آیتم‌های سفارش" : "Order Items"}</h2>
      <ul>
        ${itemsList}
      </ul>
      <p style="margin-top: 30px;">
        ${
          language === "fa"
            ? "سفارش شما به زودی پردازش و ارسال خواهد شد."
            : "Your order will be processed and shipped soon."
        }
      </p>
      <p>
        ${
          language === "fa"
            ? "در صورت هرگونه سوال، لطفاً با ما تماس بگیرید."
            : "If you have any questions, please contact us."
        }
      </p>
    </body>
    </html>
  `;

  const text = `
${subject}

${language === "fa" ? `سلام ${customerName},` : `Hello ${customerName},`}

${
  language === "fa"
    ? "از سفارش شما متشکریم. جزئیات سفارش شما در زیر آمده است:"
    : "Thank you for your order. Your order details are below:"
}

${language === "fa" ? "شماره سفارش" : "Order Number"}: ${orderNumber}
${language === "fa" ? "روش پرداخت" : "Payment Method"}: ${paymentMethod}
${language === "fa" ? "مجموع" : "Total"}: ${formatPrice(parseFloat(total), currency, language)}

${language === "fa" ? "آیتم‌های سفارش" : "Order Items"}:
${items.map((item) => `- ${item.productName} x${item.quantity}`).join("\n")}

${
  language === "fa"
    ? "سفارش شما به زودی پردازش و ارسال خواهد شد."
    : "Your order will be processed and shipped soon."
}
  `;

  return { subject, html, text };
}

// Helper function to format price (reuse from formatPrice utility)
function formatPrice(price: number, currency: string, language: string): string {
  const numPrice = typeof price === "string" ? parseFloat(String(price)) : price;

  if (isNaN(numPrice)) {
    return "0";
  }

  if (currency === "toman" || currency === "تومان") {
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
  };

  const currencyCode = currencyMap[currency.toLowerCase()] || "USD";

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

