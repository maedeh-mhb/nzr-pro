import nodemailer from "nodemailer";
import { render } from "@react-email/render";
import path from "path";
import fs from "fs";

// Email template imports
import VerificationEmail from "@/emails/verification";
import InvoiceEmailTemplate from "@/emails/invoice-email";
import CartFollowupEmail from "@/emails/cart-followup";
import OrderConfirmationEmail from "@/emails/order-confirmation";
import ShippingUpdateEmail from "@/emails/shipping-update";
import PasswordResetEmail from "@/emails/password-reset";
import GuestOrderConfirmationEmail from "@/emails/guest-order-confirmation";
import RegisteredOrderConfirmationEmail from "@/emails/registered-order-confirmation";

// Create transporter for Gmail SMTP
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
    },
    tls: {
      // Do not fail on invalid certificates (useful for development)
      // In production, you should use proper certificates
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
  });
};

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType?: string;
  }>;
}

export const sendEmail = async ({ to, subject, html, attachments }: SendEmailOptions) => {
  try {
    const transporter = createTransporter();

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject,
      html,
      attachments: attachments || [],
    });

    return { success: true };
  } catch (error) {
    console.error("Error sending email:", error);
    return { success: false, error };
  }
};

// Email template senders
export const sendVerificationEmail = async (data: {
  to: string;
  name: string;
  verificationCode: string;
  telegram?: string | null;
  instagram?: string | null;
  whatsapp?: string | null;
  address?: string | null;
  addressFa?: string | null;
  email?: string | null;
  language?: "en" | "fa";
}) => {
  const html = await render(VerificationEmail(data));
  const subject = data.language === "fa"
    ? "تأیید آدرس ایمیل - Nazira"
    : "Verify your email address - Nazira";
  return sendEmail({
    to: data.to,
    subject,
    html,
  });
};

export const sendCartFollowupEmail = async (
  to: string,
  data: {
    name: string;
    items: Array<{ name: string; quantity: number; price: string }>;
    total: string;
    checkoutLink: string;
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
    language?: "en" | "fa";
  }
) => {
  const html = await render(CartFollowupEmail({
    name: data.name,
    items: data.items,
    total: data.total,
    checkoutLink: data.checkoutLink,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    address: data.contactAddress,
    addressFa: data.contactAddressFa,
    email: data.contactEmail,
    language: data.language || "fa",
  }));

  const subject = data.language === "en"
    ? "Complete your purchase - Nazira"
    : "تکمیل خرید شما - Nazira";

  return sendEmail({
    to,
    subject,
    html,
  });
};

export const sendOrderConfirmationEmail = async (
  to: string,
  data: {
    orderNumber: string;
    customerName: string;
    orderDate: string;
    items: Array<{ name: string; quantity: number; price: string }>;
    total: string;
    paymentMethod: string;
    language?: "en" | "fa";
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
  }
) => {
  // Format payment method for display
  const paymentMethodDisplay = formatPaymentMethodFa(data.paymentMethod);

  const html = await render(RegisteredOrderConfirmationEmail({
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    orderDate: data.orderDate,
    items: data.items,
    total: data.total,
    paymentMethod: data.paymentMethod,
    paymentMethodDisplay,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    contactAddress: data.contactAddress,
    contactAddressFa: data.contactAddressFa,
    contactEmail: data.contactEmail,
    language: data.language || "fa",
  }));

  const subject = data.language === "fa"
    ? `تأیید سفارش ${data.orderNumber}`
    : `Order confirmation for ${data.orderNumber}`;

  return sendEmail({
    to,
    subject,
    html,
  });
};

export const sendInvoiceEmail = async (
  to: string,
  data: {
    orderNumber: string;
    customerName: string;
    language?: "en" | "fa";
    pdfBuffer: Buffer;
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
  }
) => {
  const html = await render(InvoiceEmailTemplate({
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    contactAddress: data.contactAddress,
    contactAddressFa: data.contactAddressFa,
    contactEmail: data.contactEmail,
    language: data.language || "fa",
  }));

  const subject = data.language === "fa"
    ? `فاکتور سفارش ${data.orderNumber}`
    : `Invoice for order ${data.orderNumber}`;

  return sendEmail({
    to,
    subject,
    html,
    attachments: [
      {
        filename: `invoice-${data.orderNumber}.pdf`,
        content: data.pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
};

export const sendShippingUpdateEmail = async (
  to: string,
  data: {
    orderNumber: string;
    customerName: string;
    status: string;
    trackingNumber?: string;
    trackingLink?: string;
    estimatedDelivery?: string;
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
    language?: "en" | "fa";
  }
) => {
  const html = await render(ShippingUpdateEmail({
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    status: data.status,
    trackingNumber: data.trackingNumber,
    trackingLink: data.trackingLink,
    estimatedDelivery: data.estimatedDelivery,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    address: data.contactAddress,
    addressFa: data.contactAddressFa,
    email: data.contactEmail,
    language: data.language || "fa",
  }));

  const subject = data.language === "en"
    ? `Shipping update for order ${data.orderNumber} - Nazira`
    : `به‌روزرسانی ارسال سفارش ${data.orderNumber} - Nazira`;

  return sendEmail({
    to,
    subject,
    html,
  });
};

// HTML Email Templates (embedded)
const GUEST_ORDER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأیید سفارش - Nazira</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #e8e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header-section { background: linear-gradient(135deg, #367260 0%, #6c9cb8 100%); padding: 30px 20px; text-align: center; }
        .logo-container { margin: 0 0 20px 0; text-align: center; }
        .logo-text { display: inline-block; width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; line-height: 80px; font-size: 40px; font-weight: 700; color: #367260; text-align: center; }
        .header-title { margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; }
        .header-subtitle { margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95; }
        .body-section { padding: 40px 30px; }
        .text-style { margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6; }
        .order-number-section { padding: 0 0 30px 0; }
        .order-number-box { background-color: #e8e9ea; border: 3px dashed #6c9cb8; border-radius: 12px; padding: 20px 40px; display: inline-block; margin: 0; text-align: center; }
        .order-number-text { font-size: 32px; font-weight: 700; color: #367260; letter-spacing: 4px; font-family: 'Courier New', monospace; }
        .h2 { margin: 30px 0 15px 0; color: #2c3e50; font-size: 20px; font-weight: 600; }
        .h3 { margin: 25px 0 15px 0; color: #2c3e50; font-size: 18px; font-weight: 600; }
        .info-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .info-row { margin: 8px 0; color: #2c3e50; font-size: 15px; line-height: 1.6; }
        .items-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .item-row { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; }
        .item-row:last-of-type { border-bottom: none; }
        .item-name { margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600; }
        .item-details { margin: 0; color: #666666; font-size: 14px; }
        .items-divider { border-top: 2px solid #6c9cb8; margin: 15px 0; }
        .total-row { margin-top: 10px; }
        .total-label { margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600; display: block; }
        .total-value { margin: 0; color: #367260; font-size: 24px; font-weight: 700; display: block; }
        .info-box-section { padding: 0 30px 40px 30px; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #6c9cb8; padding: 20px; border-radius: 8px; margin: 0; }
        .info-box-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 14px; font-weight: 600; display: block; }
        .info-box-list { margin: 0; color: #666666; font-size: 14px; line-height: 1.8; display: block; white-space: pre-line; }
        .divider { border-top: 1px solid #e8e9ea; margin: 0 30px; }
        .footer-section { padding: 30px; text-align: center; background-color: #f8f9fa; }
        .social-links-container { margin-bottom: 20px; font-size: 14px; color: #666666; }
        .social-link { text-decoration: none; font-size: 14px; color: #6c9cb8; font-weight: 600; margin: 0 5px; display: inline-block; }
        .footer-text { margin: 0 0 10px 0; color: #999999; font-size: 12px; }
        .email-link { color: #6c9cb8; text-decoration: none; }
        .unsubscribe-container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .unsubscribe-text { margin: 0; color: #999999; font-size: 12px; }
        [dir="rtl"] { direction: rtl; text-align: right; }
        [dir="ltr"] { direction: ltr; text-align: left; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header-section">
            <div class="logo-container"><span class="logo-text">N</span></div>
            <h1 class="header-title">Nazira</h1>
            <p class="header-subtitle">سفارش شما ثبت شد!</p>
        </div>
        <div class="body-section" dir="rtl">
            <p class="text-style">از خرید شما متشکریم [نام مشتری]! سفارش شما با موفقیت ثبت شد و در حال پردازش است.</p>
            <div class="order-number-section"><div style="text-align: center;"><div class="order-number-box"><span class="order-number-text">ORD-123456</span></div></div></div>
            <h2 class="h2">اطلاعات شما:</h2>
            <div class="info-section">
                <p class="info-row"><strong>نام و نام خانوادگی:</strong> [نام] [نام خانوادگی]</p>
                <p class="info-row"><strong>شماره تماس:</strong> [شماره تماس]</p>
                <p class="info-row"><strong>ایمیل:</strong> [ایمیل]</p>
                <p class="info-row"><strong>آدرس:</strong> [استان]، [شهر]، [آدرس کامل]، کد پستی: [کد پستی]</p>
            </div>
            <p class="text-style" style="color: #e67e22; font-size: 14px; margin-top: -10px; margin-bottom: 25px;">اگر اطلاعات فوق اشتباه میباشد، سریعا ما را مطلع کنید.</p>
            <h2 class="h2">جزئیات سفارش:</h2>
            <div class="info-section">
                <p class="info-row"><strong>شماره سفارش:</strong> ORD-123456</p>
                <p class="info-row"><strong>تاریخ سفارش:</strong> [تاریخ سفارش]</p>
                <p class="info-row"><strong>روش پرداخت:</strong> [روش پرداخت]</p>
            </div>
            <h3 class="h3">اقلام سفارش:</h3>
            <div class="items-section">
                <!-- Order Items Placeholder -->
                <div class="item-row"><p class="item-name">نام محصول</p><p class="item-details">تعداد: 2 • قیمت: 150,000 تومان</p></div>
                <!-- End Order Items -->
                <hr class="items-divider">
                <div class="total-row"><span class="total-label">مجموع:</span><span class="total-value">500,000 تومان</span></div>
            </div>
            <p class="text-style">ما به محض آماده شدن سفارش شما، اطلاع‌رسانی خواهیم کرد. در صورت نیاز به هرگونه کمک، با ما تماس بگیرید.</p>
        </div>
        <div class="info-box-section">
            <div class="info-box">
                <span class="info-box-title">📦 وضعیت سفارش:</span>
                <span class="info-box-list">• سفارش شما در حال پردازش است
• به محض آماده شدن، اطلاع‌رسانی خواهیم کرد
• در صورت نیاز به کمک، با ما تماس بگیرید</span>
            </div>
        </div>
        <hr class="divider">
        <div class="footer-section">
            <div class="social-links-container"><a href="https://t.me/[telegram]" class="social-link">Telegram</a> • <a href="https://instagram.com/[instagram]" class="social-link">Instagram</a> • <a href="https://wa.me/[whatsapp]" class="social-link">WhatsApp</a></div>
            <p class="footer-text">© 2025 Nazira. All rights reserved.</p>
            <p class="footer-text">[آدرس]<br><a href="mailto:[email]" class="email-link">[email]</a></p>
        </div>
    </div>
    <div class="unsubscribe-container"><p class="unsubscribe-text">این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید.</p></div>
</body>
</html>`;

const REGISTERED_ORDER_CONFIRMATION_TEMPLATE = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تأیید سفارش - Nazira</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #e8e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header-section { background: linear-gradient(135deg, #367260 0%, #6c9cb8 100%); padding: 30px 20px; text-align: center; }
        .logo-container { margin: 0 0 20px 0; text-align: center; }
        .logo-text { display: inline-block; width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; line-height: 80px; font-size: 40px; font-weight: 700; color: #367260; text-align: center; }
        .header-title { margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; }
        .header-subtitle { margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95; }
        .body-section { padding: 40px 30px; }
        .text-style { margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6; }
        .order-number-section { padding: 0 0 30px 0; }
        .order-number-box { background-color: #e8e9ea; border: 3px dashed #6c9cb8; border-radius: 12px; padding: 20px 40px; display: inline-block; margin: 0; text-align: center; }
        .order-number-text { font-size: 32px; font-weight: 700; color: #367260; letter-spacing: 4px; font-family: 'Courier New', monospace; }
        .h2 { margin: 30px 0 15px 0; color: #2c3e50; font-size: 20px; font-weight: 600; }
        .info-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .info-row { margin: 8px 0; color: #2c3e50; font-size: 15px; line-height: 1.6; }
        .items-section { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .item-row { margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px solid #e0e0e0; }
        .item-row:last-of-type { border-bottom: none; }
        .item-name { margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600; }
        .item-details { margin: 0; color: #666666; font-size: 14px; }
        .items-divider { border-top: 2px solid #6c9cb8; margin: 15px 0; }
        .total-row { margin-top: 10px; }
        .total-label { margin: 0 0 5px 0; color: #2c3e50; font-size: 16px; font-weight: 600; display: block; }
        .total-value { margin: 0; color: #367260; font-size: 24px; font-weight: 700; display: block; }
        .info-box-section { padding: 0 30px 40px 30px; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #6c9cb8; padding: 20px; border-radius: 8px; margin: 0; }
        .info-box-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 14px; font-weight: 600; display: block; }
        .info-box-list { margin: 0; color: #666666; font-size: 14px; line-height: 1.8; display: block; white-space: pre-line; }
        .divider { border-top: 1px solid #e8e9ea; margin: 0 30px; }
        .footer-section { padding: 30px; text-align: center; background-color: #f8f9fa; }
        .social-links-container { margin-bottom: 20px; font-size: 14px; color: #666666; }
        .social-link { text-decoration: none; font-size: 14px; color: #6c9cb8; font-weight: 600; margin: 0 5px; display: inline-block; }
        .footer-text { margin: 0 0 10px 0; color: #999999; font-size: 12px; }
        .email-link { color: #6c9cb8; text-decoration: none; }
        .unsubscribe-container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .unsubscribe-text { margin: 0; color: #999999; font-size: 12px; }
        [dir="rtl"] { direction: rtl; text-align: right; }
        [dir="ltr"] { direction: ltr; text-align: left; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header-section">
            <div class="logo-container"><span class="logo-text">N</span></div>
            <h1 class="header-title">Nazira</h1>
            <p class="header-subtitle">سفارش شما ثبت شد!</p>
        </div>
        <div class="body-section" dir="rtl">
            <p class="text-style">از خرید شما متشکریم [نام مشتری]! سفارش شما با موفقیت ثبت شد و در حال پردازش است.</p>
            <div class="order-number-section"><div style="text-align: center;"><div class="order-number-box"><span class="order-number-text">ORD-123456</span></div></div></div>
            <h2 class="h2">جزئیات سفارش:</h2>
            <div class="info-section">
                <p class="info-row"><strong>شماره سفارش:</strong> ORD-123456</p>
                <p class="info-row"><strong>تاریخ سفارش:</strong> [تاریخ سفارش]</p>
                <p class="info-row"><strong>روش پرداخت:</strong> [روش پرداخت]</p>
            </div>
            <h2 class="h2">اقلام سفارش:</h2>
            <div class="items-section">
                <!-- Order Items Placeholder -->
                <div class="item-row"><p class="item-name">نام محصول</p><p class="item-details">تعداد: 2 • قیمت: 150,000 تومان</p></div>
                <!-- End Order Items -->
                <hr class="items-divider">
                <div class="total-row"><span class="total-label">مجموع:</span><span class="total-value">500,000 تومان</span></div>
            </div>
            <p class="text-style">ما به محض آماده شدن سفارش شما، اطلاع‌رسانی خواهیم کرد. در صورت نیاز به هرگونه کمک، با ما تماس بگیرید.</p>
        </div>
        <div class="info-box-section">
            <div class="info-box">
                <span class="info-box-title">📦 وضعیت سفارش:</span>
                <span class="info-box-list">• سفارش شما در حال پردازش است
• به محض آماده شدن، اطلاع‌رسانی خواهیم کرد
• در صورت نیاز به کمک، با ما تماس بگیرید</span>
            </div>
        </div>
        <hr class="divider">
        <div class="footer-section">
            <div class="social-links-container"><a href="https://t.me/[telegram]" class="social-link">Telegram</a> • <a href="https://instagram.com/[instagram]" class="social-link">Instagram</a> • <a href="https://wa.me/[whatsapp]" class="social-link">WhatsApp</a></div>
            <p class="footer-text">© 2025 Nazira. All rights reserved.</p>
            <p class="footer-text">[آدرس]<br><a href="mailto:[email]" class="email-link">[email]</a></p>
        </div>
    </div>
    <div class="unsubscribe-container"><p class="unsubscribe-text">این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید.</p></div>
</body>
</html>`;

const GUEST_INVOICE_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>فاکتور سفارش - Nazira</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #e8e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header-section { background: linear-gradient(135deg, #367260 0%, #6c9cb8 100%); padding: 30px 20px; text-align: center; }
        .logo-container { margin: 0 0 20px 0; text-align: center; }
        .logo-text { display: inline-block; width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; line-height: 80px; font-size: 40px; font-weight: 700; color: #367260; text-align: center; }
        .header-title { margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; }
        .header-subtitle { margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95; }
        .body-section { padding: 40px 30px; }
        .text-style { margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6; }
        .order-number-section { padding: 0 0 30px 0; }
        .order-number-box { background-color: #e8e9ea; border: 3px dashed #6c9cb8; border-radius: 12px; padding: 20px 40px; display: inline-block; margin: 0; text-align: center; }
        .order-number-text { font-size: 32px; font-weight: 700; color: #367260; letter-spacing: 4px; font-family: 'Courier New', monospace; }
        .info-box-section { padding: 0 0 40px 0; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #6c9cb8; padding: 20px; border-radius: 8px; margin: 0; }
        .info-box-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 16px; font-weight: 600; display: block; }
        .info-box-text { margin: 0; color: #666666; font-size: 14px; line-height: 1.8; display: block; }
        .divider { border-top: 1px solid #e8e9ea; margin: 0 30px; }
        .footer-section { padding: 30px; text-align: center; background-color: #f8f9fa; }
        .social-links-container { margin-bottom: 20px; font-size: 14px; color: #666666; }
        .social-link { text-decoration: none; font-size: 14px; color: #6c9cb8; font-weight: 600; margin: 0 5px; display: inline-block; }
        .footer-text { margin: 0 0 10px 0; color: #999999; font-size: 12px; }
        .email-link { color: #6c9cb8; text-decoration: none; }
        .unsubscribe-container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .unsubscribe-text { margin: 0; color: #999999; font-size: 12px; }
        [dir="rtl"] { direction: rtl; text-align: right; }
        [dir="ltr"] { direction: ltr; text-align: left; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header-section">
            <div class="logo-container"><span class="logo-text">N</span></div>
            <h1 class="header-title">Nazira</h1>
            <p class="header-subtitle">فاکتور سفارش شما</p>
        </div>
        <div class="body-section" dir="rtl">
            <p class="text-style">از خرید شما متشکریم [نام مشتری]! فاکتور سفارش شما به پیوست این ایمیل ارسال شده است.</p>
            <div class="order-number-section"><div style="text-align: center;"><div class="order-number-box"><span class="order-number-text">ORD-123456</span></div></div></div>
            <div class="info-box-section">
                <div class="info-box">
                    <span class="info-box-title">📄 فاکتور سفارش:</span>
                    <span class="info-box-text">فاکتور سفارش شما به صورت PDF در پیوست این ایمیل قرار دارد. لطفاً آن را دانلود و نگهداری کنید.</span>
                </div>
            </div>
            <p class="text-style">در صورت نیاز به هرگونه کمک یا سوال، با ما تماس بگیرید.</p>
        </div>
        <hr class="divider">
        <div class="footer-section">
            <div class="social-links-container"><a href="https://t.me/[telegram]" class="social-link">Telegram</a> • <a href="https://instagram.com/[instagram]" class="social-link">Instagram</a> • <a href="https://wa.me/[whatsapp]" class="social-link">WhatsApp</a></div>
            <p class="footer-text">© 2025 Nazira. All rights reserved.</p>
            <p class="footer-text">[آدرس]<br><a href="mailto:[email]" class="email-link">[email]</a></p>
        </div>
    </div>
    <div class="unsubscribe-container"><p class="unsubscribe-text">این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید.</p></div>
</body>
</html>`;

const PASSWORD_RESET_EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>بازیابی رمز عبور - Nazira</title>
    <!--[if mso]>
    <style type="text/css">
        body, table, td {font-family: Arial, sans-serif !important;}
    </style>
    <![endif]-->
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; background-color: #e8e9ea; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
        .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header-section { background: linear-gradient(135deg, #367260 0%, #6c9cb8 100%); padding: 30px 20px; text-align: center; }
        .logo-container { margin: 0 0 20px 0; text-align: center; }
        .logo-text { display: inline-block; width: 80px; height: 80px; background-color: #ffffff; border-radius: 50%; line-height: 80px; font-size: 40px; font-weight: 700; color: #367260; text-align: center; }
        .header-title { margin: 0; color: #ffffff; font-size: 32px; font-weight: 700; }
        .header-subtitle { margin: 10px 0 0 0; color: #ffffff; font-size: 16px; opacity: 0.95; }
        .body-section { padding: 40px 30px; }
        .text-style { margin: 0 0 20px 0; color: #2c3e50; font-size: 16px; line-height: 1.6; }
        .reset-button-container { text-align: center; margin: 30px 0; }
        .reset-button { display: inline-block; background: linear-gradient(135deg, #367260 0%, #6c9cb8 100%); color: #ffffff; text-decoration: none; padding: 16px 40px; border-radius: 8px; font-size: 18px; font-weight: 600; box-shadow: 0 4px 12px rgba(54, 114, 96, 0.3); transition: transform 0.2s, box-shadow 0.2s; }
        .reset-button:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(54, 114, 96, 0.4); }
        .reset-link-container { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #6c9cb8; }
        .reset-link-text { margin: 0 0 10px 0; color: #2c3e50; font-size: 14px; font-weight: 600; display: block; }
        .reset-link { word-break: break-all; color: #6c9cb8; text-decoration: none; font-size: 12px; font-family: 'Courier New', monospace; }
        .warning-box { background-color: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 20px; margin: 25px 0; }
        .warning-title { margin: 0 0 10px 0; color: #856404; font-size: 16px; font-weight: 600; display: block; }
        .warning-text { margin: 0; color: #856404; font-size: 14px; line-height: 1.6; }
        .info-box-section { padding: 0 30px 40px 30px; }
        .info-box { background-color: #f8f9fa; border-left: 4px solid #6c9cb8; padding: 20px; border-radius: 8px; margin: 0; }
        .info-box-title { margin: 0 0 10px 0; color: #2c3e50; font-size: 14px; font-weight: 600; display: block; }
        .info-box-list { margin: 0; color: #666666; font-size: 14px; line-height: 1.8; display: block; white-space: pre-line; }
        .divider { border-top: 1px solid #e8e9ea; margin: 0 30px; }
        .footer-section { padding: 30px; text-align: center; background-color: #f8f9fa; }
        .social-links-container { margin-bottom: 20px; font-size: 14px; color: #666666; }
        .social-link { text-decoration: none; font-size: 14px; color: #6c9cb8; font-weight: 600; margin: 0 5px; display: inline-block; }
        .footer-text { margin: 0 0 10px 0; color: #999999; font-size: 12px; }
        .email-link { color: #6c9cb8; text-decoration: none; }
        .unsubscribe-container { max-width: 600px; margin: 0 auto; padding: 20px; text-align: center; }
        .unsubscribe-text { margin: 0; color: #999999; font-size: 12px; }
        .expiry-notice { margin: 15px 0 0 0; color: #666666; font-size: 14px; text-align: center; }
        [dir="rtl"] { direction: rtl; text-align: right; }
        [dir="ltr"] { direction: ltr; text-align: left; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header-section">
            <div class="logo-container"><span class="logo-text">N</span></div>
            <h1 class="header-title">Nazira</h1>
            <p class="header-subtitle">بازیابی رمز عبور</p>
        </div>
        <div class="body-section" dir="rtl">
            <p class="text-style">سلام [نام کاربری]،</p>
            <p class="text-style">ما درخواست شما برای بازیابی رمز عبور حساب کاربری‌تان را دریافت کردیم. برای تنظیم رمز عبور جدید، روی دکمه زیر کلیک کنید:</p>
            
            <div class="reset-button-container">
                <a href="[لینک بازیابی]" class="reset-button">بازیابی رمز عبور</a>
            </div>
            
            <div class="reset-link-container">
                <span class="reset-link-text">اگر دکمه کار نمی‌کند، این لینک را کپی و در مرورگر خود باز کنید:</span>
                <a href="[لینک بازیابی]" class="reset-link">[لینک بازیابی]</a>
            </div>
            
            <p class="expiry-notice">⏰ این لینک تا 10 دقیقه معتبر است.</p>
            
            <div class="warning-box">
                <span class="warning-title">⚠️ امنیت:</span>
                <p class="warning-text">• اگر شما این درخواست را ارسال نکرده‌اید، لطفاً این ایمیل را نادیده بگیرید.<br>
                • لینک بازیابی فقط یک بار قابل استفاده است.<br>
                • برای امنیت بیشتر، رمز عبور جدید خود را در جایی امن نگه دارید.</p>
            </div>
            
            <p class="text-style">اگر مشکلی دارید یا سوالی دارید، لطفاً با پشتیبانی ما تماس بگیرید.</p>
        </div>
        <div class="info-box-section">
            <div class="info-box">
                <span class="info-box-title">💡 نکات مهم:</span>
                <span class="info-box-list">• لینک بازیابی فقط 10 دقیقه معتبر است
• پس از استفاده، لینک دیگر کار نمی‌کند
• اگر لینک منقضی شد، می‌توانید دوباره درخواست بازیابی ارسال کنید</span>
            </div>
        </div>
        <hr class="divider">
        <div class="footer-section">
            <div class="social-links-container"><a href="https://t.me/[telegram]" class="social-link">Telegram</a> • <a href="https://instagram.com/[instagram]" class="social-link">Instagram</a> • <a href="https://wa.me/[whatsapp]" class="social-link">WhatsApp</a></div>
            <p class="footer-text">© 2025 Nazira. All rights reserved.</p>
            <p class="footer-text">[آدرس]<br><a href="mailto:[email]" class="email-link">[email]</a></p>
        </div>
    </div>
    <div class="unsubscribe-container"><p class="unsubscribe-text">این یک ایمیل خودکار است. لطفاً به این پیام پاسخ ندهید.</p></div>
</body>
</html>`;

// Helper function to get province name by ID (Farsi)
function getProvinceNameByIdFa(provinceId: number): string | null {
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

// Helper function to get city name by ID (Farsi)
function getCityNameByIdFa(cityId: number, provinceId: number): string | null {
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

// Format payment method for display (Farsi)
function formatPaymentMethodFa(method: string): string {
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

// Send guest order confirmation email using React Email template
export const sendGuestOrderConfirmationEmail = async (
  to: string,
  data: {
    orderNumber: string;
    customerName: string;
    customerSurname?: string;
    phone: string;
    email: string;
    provinceId: number;
    cityId: number;
    address: string;
    postalCode?: string | null;
    orderDate: string;
    items: Array<{ name: string; quantity: number; price: string }>;
    total: string;
    paymentMethod: string;
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
  }
) => {
  // Get province and city names
  const provinceName = getProvinceNameByIdFa(data.provinceId) || null;
  const cityName = getCityNameByIdFa(data.cityId, data.provinceId) || null;

  // Format payment method for display
  const paymentMethodDisplay = formatPaymentMethodFa(data.paymentMethod);

  const html = await render(GuestOrderConfirmationEmail({
    orderNumber: data.orderNumber,
    customerName: data.customerName,
    customerSurname: data.customerSurname,
    phone: data.phone,
    email: data.email,
    provinceId: data.provinceId,
    cityId: data.cityId,
    address: data.address,
    postalCode: data.postalCode,
    orderDate: data.orderDate,
    items: data.items,
    total: data.total,
    paymentMethod: data.paymentMethod,
    paymentMethodDisplay,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    contactAddress: data.contactAddress,
    contactAddressFa: data.contactAddressFa,
    contactEmail: data.contactEmail,
    provinceName,
    cityName,
    language: "fa",
  }));

  const subject = `تأیید سفارش ${data.orderNumber}`;

  return sendEmail({
    to,
    subject,
    html,
  });
};

// Send password reset email using React Email template
export const sendPasswordResetEmail = async (
  to: string,
  data: {
    userName: string;
    resetLink: string;
    telegram?: string | null;
    instagram?: string | null;
    whatsapp?: string | null;
    contactAddress?: string | null;
    contactAddressFa?: string | null;
    contactEmail?: string | null;
    language?: "en" | "fa";
  }
) => {
  const html = await render(PasswordResetEmail({
    userName: data.userName,
    resetLink: data.resetLink,
    telegram: data.telegram,
    instagram: data.instagram,
    whatsapp: data.whatsapp,
    address: data.contactAddress,
    addressFa: data.contactAddressFa,
    email: data.contactEmail,
    language: data.language || "fa",
  }));

  const subject = data.language === "en"
    ? "Reset your password - Nazira"
    : "بازیابی رمز عبور - Nazira";

  return sendEmail({
    to,
    subject,
    html,
  });
};

