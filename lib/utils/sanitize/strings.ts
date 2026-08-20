/**
 * String sanitization utilities
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

