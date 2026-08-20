/**
 * Order-related email sending
 */

import { render } from "@react-email/render";
import RegisteredOrderConfirmationEmail from "@/emails/registered-order-confirmation";
import GuestOrderConfirmationEmail from "@/emails/guest-order-confirmation";
import InvoiceEmailTemplate from "@/emails/invoice-email";
import ShippingUpdateEmail from "@/emails/shipping-update";
import { sendEmail } from "./transporter";
import { formatPaymentMethodFa, getProvinceNameByIdFa, getCityNameByIdFa } from "./helpers";

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

