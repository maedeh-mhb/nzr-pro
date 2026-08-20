/**
 * Zod validation schemas for API endpoints
 * 
 * Re-exports all validation schemas and helpers for convenience
 */

// Common field schemas
export {
  emailSchema,
  passwordSchema,
  phoneSchema,
  nameSchema,
  optionalNameSchema,
  textSchema,
  optionalTextSchema,
  urlSchema,
  positiveIntegerSchema,
  nonNegativeIntegerSchema,
  decimalSchema,
} from "./common";

// Request body schemas
export {
  signupSchema,
  contactFormSchema,
  passwordResetSchema,
  changePasswordSchema,
  productSchema,
} from "./requests";

// Query parameter schemas
export {
  paginationQuerySchema,
} from "./queries";

// Helper functions
export {
  parseRequestBody,
  parseQueryParams,
} from "./helpers";

