/**
 * Number sanitization utilities
 */

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

