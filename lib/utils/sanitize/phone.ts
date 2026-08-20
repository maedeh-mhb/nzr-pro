/**
 * Phone number sanitization utilities
 */

/**
 * Sanitize phone number (Iranian format: 09XXXXXXXXX)
 */
export function sanitizePhone(phone: string | null | undefined): string {
  if (!phone) return "";
  
  // Remove all non-digit characters
  const digits = String(phone).replace(/\D/g, "");
  
  // Validate Iranian phone format (11 digits starting with 09)
  if (digits.length === 11 && digits.startsWith("09")) {
    return digits;
  }
  
  // Return empty if invalid
  return "";
}

