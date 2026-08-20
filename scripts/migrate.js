const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  try {
    require('dotenv').config();
  } catch (err) {
    console.warn('Could not load .env file for migrations:', err?.message || err);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// List of PostgreSQL error codes to ignore
const IGNORABLE_ERROR_CODES = [
  '42701', // duplicate_column - column already exists
  '42P07', // duplicate_table - relation already exists
  '23505', // unique_violation - duplicate key value
  '42P06', // duplicate_schema - schema already exists
  '42710', // duplicate_function - function already exists
  '42P11', // duplicate_operator - operator already exists
  '42723', // duplicate_trigger - trigger already exists
  '42P19', // duplicate_domain - domain already exists
];

async function runMigrations() {
  console.log('Starting database migrations...');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  const db = drizzle(pool);
  
  try {
    await migrate(db, { 
      migrationsFolder: './drizzle',
      migrationsTable: '__drizzle_migrations'
    });
    console.log('✅ Migrations completed successfully!');
  } catch (error) {
    // Check if this is an ignorable error
    const errorCode = error?.code || error?.cause?.code;
    if (IGNORABLE_ERROR_CODES.includes(errorCode)) {
      console.log(`⚠️  Ignoring: ${error.message}`);
      console.log(`   Ignorable database error code: ${errorCode}`);
      console.log('   Continuing with deployment...');
    } else {
      console.error('❌ Migration failed with non-ignorable error:', error);
      process.exit(1);
    }
  }
  
  await pool.end();
}

runMigrations();