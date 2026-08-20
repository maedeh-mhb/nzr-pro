import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';

async function main() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client, { schema });

  const products = await db.select().from(schema.products).limit(1);
  console.log('product', products[0]);

  const orders = await db.select().from(schema.orders).limit(1);
  console.log('order', orders[0]);

  if (!orders[0]) {
    console.log('No orders to test against');
    await client.end();
    return;
  }

  try {
    const testItem = {
      orderId: orders[0].id,
      productId: products[0].id,
      productName: products[0].name,
      productNameFa: products[0].nameFa ?? null,
      price: products[0].price,
      quantity: 1,
    };
    const result = await db.insert(schema.orderItems).values(testItem);
    console.log('insert result', result);
  } catch (error) {
    console.error('error inserting order item', error);
  } finally {
    await client.end();
  }
}

main();
