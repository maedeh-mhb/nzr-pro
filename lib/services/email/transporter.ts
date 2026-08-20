/**
 * Email transporter and base sending functions
 */

import nodemailer from "nodemailer";

// Create transporter for Gmail SMTP
const createTransporter = () => {
  const port = parseInt(process.env.SMTP_PORT || "587");
  const secure = port === 465; // true for 465, false for 587
  return nodemailer.createTransport({
    service: "gmail",
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    secure,
    auth: {
      user: process.env.SMTP_USER || process.env.GMAIL_USER,
      pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
    },
    // Only add tls config if you want to customize certificate validation
    // Remove or comment out the tls block for default secure behavior
  });
};

export interface SendEmailOptions {
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

