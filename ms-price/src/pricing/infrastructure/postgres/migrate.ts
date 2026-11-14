import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';
import { fileURLToPath } from 'node:url';

const pool = new Pool({
  host: process.env.PRICES_DB_HOST ?? 'localhost',
  port: Number(process.env.PRICES_DB_PORT ?? 5432),
  user: process.env.PRICES_DB_USER ?? 'prices_app',
  password: process.env.PRICES_DB_PASSWORD,
  database: process.env.PRICES_DB_NAME ?? 'prices_db',
});
try {
  const sql = await readFile(fileURLToPath(new URL('./001-pricing.sql', import.meta.url)), 'utf8');
  await pool.query(sql);
  console.info('MS04 pricing schema is up to date.');
} finally { await pool.end(); }
