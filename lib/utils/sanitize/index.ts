/**
 * Input sanitization utilities for security
 * 
 * Re-exports all sanitization functions for convenience
 */

// String sanitization
export {
  sanitizeString,
  sanitizeName,
  sanitizeAddress,
  sanitizeDiscountCode,
  sanitizeProductId,
  sanitizeCartItemId,
} from "./strings";

// Email sanitization
export {
  isValidEmail,
  sanitizeEmail,
} from "./email";

// Phone sanitization
export {
  sanitizePhone,
} from "./phone";

// Number sanitization
export {
  sanitizeNumber,
  sanitizeInteger,
  sanitizeProvinceId,
  sanitizeCityId,
} from "./numbers";

