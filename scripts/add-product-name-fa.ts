import 'dotenv/config';
import postgres from 'postgres';

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  try {
    await sql.unsafe('ALTER TABLE order_items ADD COLUMN product_name_fa text;');
    console.log('Added product_name_fa column');
  } catch (err) {
    console.error('Alter failed', err);
  } finally {
    await sql.end();
  }
}

main();
