/**
 * Email validation and sanitization utilities
 */

import { sanitizeString } from "./strings";

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

