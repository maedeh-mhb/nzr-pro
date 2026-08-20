/**
 * Cart-related email sending
 */

import { render } from "@react-email/render";
import CartFollowupEmail from "@/emails/cart-followup";
import { sendEmail } from "./transporter";

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

