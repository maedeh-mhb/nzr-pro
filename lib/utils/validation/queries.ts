/**
 * Query parameter validation schemas
 */

import { z } from "zod";

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int().positive()),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(z.number().int().positive().max(100)), // Max 100 items per page
  search: z.string().optional().default(""),
});

