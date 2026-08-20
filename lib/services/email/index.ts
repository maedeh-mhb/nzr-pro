/**
 * Email service - Re-exports all email sending functions
 */

// Base email sending
export { sendEmail, type SendEmailOptions } from "./transporter";

// Verification emails
export { sendVerificationEmail } from "./verification";

// Order-related emails
export {
  sendOrderConfirmationEmail,
  sendGuestOrderConfirmationEmail,
  sendInvoiceEmail,
  sendShippingUpdateEmail,
} from "./orders";

// Password reset emails
export { sendPasswordResetEmail } from "./password";

// Cart followup emails
export { sendCartFollowupEmail } from "./cart";

