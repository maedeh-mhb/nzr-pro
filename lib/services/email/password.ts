/**
 * Password reset email sending
 */

import { render } from "@react-email/render";
import PasswordResetEmail from "@/emails/password-reset";
import { sendEmail } from "./transporter";

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

