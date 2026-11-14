import { Pool } from 'pg';
import {
  buildReferencePriceEntries,
  seedMissingPrices,
  type ReferencePriceEntry,
} from './reference-seeder.js';

// Values copied from the legacy project seed, not derived from the requirements.
const source = [
  ['Aguardiente Diamante', 5, 3.5], ['Blue Vodka', 4, 2.5], ['Media Caña Sureña', 3, 1.67],
  ['Caña Sureña', 5, 3.33], ['Cocktail Sabor a Durazno', 5, 3.33], ['Cocktail Sabor a Maracuyá', 5, 3.33],
  ['Licor de Cannabis', 8, 5.42], ['Media Ron Oro', 6, 3.75], ['Ron Oro', 10, 5.83],
  ['Vodka Seco Glacial', 7, 4.17], ['Whisky Red Diez', 15, 8.33],
] as const;
const actor = '00000000-0000-4000-8000-000000000004';
const catalogUrl = process.env.CATALOG_SERVICE_URL ?? 'http://localhost:3002';
const pool = new Pool({ host: process.env.PRICES_DB_HOST ?? 'localhost', port: Number(process.env.PRICES_DB_PORT ?? 5432), user: process.env.PRICES_DB_USER ?? 'prices_app', password: process.env.PRICES_DB_PASSWORD, database: process.env.PRICES_DB_NAME ?? 'prices_db' });

try {
  const response = await fetch(`${catalogUrl}/catalog/products?page=1&page_size=100`);
  if (!response.ok) throw new Error(`Catalog returned HTTP ${response.status}`);
  const payload = await response.json() as any;
  const products = Array.isArray(payload) ? payload : payload.items ?? payload.data ?? [];
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const entries: ReferencePriceEntry[] = [];
    for (const [name, retail, wholesaleUnit] of source) {
      const product = products.find((item: any) => item.nombre === name || item.name === name);
      if (!product) throw new Error(`Catalog product not found: ${name}`);
      const unit = product.presentaciones?.find((item: any) => item.tipo === 'UNIDAD' && item.unidades_por_presentacion === 1 && item.activo);
      const box = product.presentaciones?.find((item: any) => item.tipo === 'CAJA' && item.unidades_por_presentacion === 12 && item.activo);
      if (!unit || !box) throw new Error(`Expected unit and case of 12 for ${name}`);
      entries.push(...buildReferencePriceEntries(unit.id, box.id, retail, wholesaleUnit));
    }
    const inserted = await seedMissingPrices(client, entries, actor);
    await client.query('COMMIT');
    console.info(`Imported ${source.length} legacy products; created ${inserted} missing B2C unit, B2C case (9x unit), or B2B case prices.`);
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
} finally { await pool.end(); }
