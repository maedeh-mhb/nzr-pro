import "dotenv/config";
import fs from "fs";
import path from "path";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders } from "@/lib/db/schema";
import { generateInvoicePDF } from "@/lib/services/invoice";

async function main() {
  const order = await db.query.orders.findFirst({
    orderBy: [desc(orders.createdAt)],
  });

  if (!order) {
    console.error("No orders found in the database.");
    process.exit(1);
  }

  console.log(`Using order id=${order.id}, orderNumber=${order.orderNumber}`);

  const pdfBuffer = await generateInvoicePDF(order.id);

  if (!pdfBuffer) {
    console.error("Invoice generation returned null.");
    process.exit(1);
  }

  const outputFile = path.join(__dirname, `invoice-sample-${order.orderNumber || order.id}.pdf`);
  fs.writeFileSync(outputFile, pdfBuffer);
  console.log(`Invoice PDF written to ${outputFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
