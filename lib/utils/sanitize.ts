/**
 * Input sanitization utilities for security
 */

/**
 * Sanitize a string by trimming and removing dangerous characters
 */
export function sanitizeString(input: string | null | undefined, maxLength?: number): string {
  if (!input) return "";
  
  let sanitized = String(input)
    .trim()
    // Remove null bytes
    .replace(/\0/g, "")
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, "");
  
  // Limit length if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
}

/**
 * Validate email address format
 * Uses RFC 5322 compliant regex (simplified but covers most cases)
 */
export function isValidEmail(email: string): boolean {
  if (!email) return false;
  
  // RFC 5322 compliant email regex (simplified version)
  // Allows: letters, numbers, dots, hyphens, underscores, plus signs before @
  // Domain: letters, numbers, dots, hyphens
  // TLD: at least 2 characters
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(email.trim());
}

/**
 * Sanitize email address
 * Note: This sanitizes but doesn't validate. Use isValidEmail() for validation.
 */
export function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return "";
  
  const sanitized = sanitizeString(email, 255)
    .toLowerCase()
    .trim();
  
  return sanitized;
}

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

/**
 * Sanitize name (first name, last name, etc.)
 */
export function sanitizeName(name: string | null | undefined, maxLength: number = 100): string {
  if (!name) return "";
  
  return sanitizeString(name, maxLength)
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 * Sanitize address
 */
export function sanitizeAddress(address: string | null | undefined, maxLength: number = 500): string {
  if (!address) return "";
  
  return sanitizeString(address, maxLength)
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/**
 * Sanitize discount code
 */
export function sanitizeDiscountCode(code: string | null | undefined): string {
  if (!code) return "";
  
  return sanitizeString(code, 50)
    .toUpperCase()
    // Only allow alphanumeric characters and hyphens/underscores
    .replace(/[^A-Z0-9_-]/g, "");
}

/**
 * Sanitize product ID (CUID2 format)
 */
export function sanitizeProductId(id: string | null | undefined): string {
  if (!id) return "";
  
  // CUID2 format: alphanumeric, typically 24-25 characters
  const sanitized = sanitizeString(id, 50);
  
  // Basic validation: should be alphanumeric
  if (/^[a-z0-9]+$/i.test(sanitized)) {
    return sanitized;
  }
  
  return "";
}

/**
 * Sanitize cart item ID
 * For logged-in users: CUID2 format (alphanumeric, 24-25 chars)
 * For guest users: format like "productId-timestamp" (productId is CUID2, timestamp is number)
 */
export function sanitizeCartItemId(id: string | null | undefined): string {
  if (!id) return "";
  
  const sanitized = sanitizeString(id, 100); // Allow longer IDs for guest format
  
  // Check if it's CUID2 format (alphanumeric, 24-25 chars) - for logged-in users
  if (/^[a-z0-9]{24,25}$/i.test(sanitized)) {
    return sanitized;
  }
  
  // Check if it's guest format: "productId-timestamp" where productId is CUID2
  // Pattern: alphanumeric CUID2, dash, digits (timestamp)
  const guestPattern = /^[a-z0-9]{24,25}-[0-9]+$/i;
  if (guestPattern.test(sanitized)) {
    return sanitized;
  }
  
  // If neither format matches, return empty (invalid)
  return "";
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  
  if (typeof input === "number") {
    return isNaN(input) ? 0 : input;
  }
  
  const num = parseFloat(String(input));
  return isNaN(num) ? 0 : num;
}

/**
 * Sanitize integer input
 */
export function sanitizeInteger(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return 0;
  
  if (typeof input === "number") {
    return isNaN(input) ? 0 : Math.floor(input);
  }
  
  const num = parseInt(String(input), 10);
  return isNaN(num) ? 0 : Math.floor(num);
}

/**
 * Sanitize province ID (should be a number)
 */
export function sanitizeProvinceId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined) return null;
  
  const num = sanitizeInteger(id);
  return num > 0 ? num : null;
}

/**
 * Sanitize city ID (should be a number)
 */
export function sanitizeCityId(id: string | number | null | undefined): number | null {
  if (id === null || id === undefined) return null;
  
  const num = sanitizeInteger(id);
  return num > 0 ? num : null;
}
