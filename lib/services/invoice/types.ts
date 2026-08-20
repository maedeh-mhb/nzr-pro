/**
 * Invoice service type definitions
 */

import { orders, orderItems } from "@/lib/db/schema";

export interface InvoiceData {
  order: typeof orders.$inferSelect;
  orderItems: Array<typeof orderItems.$inferSelect & { productNameFa?: string | null; category?: string | null }>;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerAddress: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

