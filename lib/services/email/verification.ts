/**
 * Email verification email sending
 */

import { render } from "@react-email/render";
import VerificationEmail from "@/emails/verification";
import { sendEmail } from "./transporter";

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

