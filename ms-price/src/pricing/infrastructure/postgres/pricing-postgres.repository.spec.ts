import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { PricingPostgresRepository } from './pricing-postgres.repository.js';

const priceRow = { id: 'price-id', presentation_id: 'presentation-id', segmento: 'B2C', importe: '5.00', vigente_desde: new Date('2026-01-01'), vigente_hasta: null, activo: true };
const promotionRow = { id: 'promotion-id', nombre: 'Deal', segmento: 'B2B', tipo_descuento: 'PERCENTAGE', valor_descuento: '10.00', vigente_desde: new Date('2026-01-01'), vigente_hasta: new Date('2027-01-01'), activo: true, presentation_ids: ['case-id'] };

function harness(failOnAudit = false) {
  const statements: string[] = [];
  const query = vi.fn(async (sql: string) => {
    statements.push(sql);
    if (failOnAudit && (sql.includes('INSERT INTO price_changes') || sql.includes('INSERT INTO promotion_changes'))) throw new Error('audit insert failed');
    if (sql.includes('FROM prices')) return { rows: [priceRow] };
    if (sql.includes('FROM promotions')) return { rows: [promotionRow] };
    if (sql.includes('UPDATE prices')) return { rows: [{ ...priceRow, activo: false }] };
    if (sql.includes('UPDATE promotions')) return { rows: [{ ...promotionRow, activo: false }] };
    return { rows: [] };
  });
  const client = {
    query,
    release: vi.fn(),
  };
  const pool = { query, connect: vi.fn(async () => client) } as unknown as Pool;
  return { repository: new PricingPostgresRepository(pool), statements, client };
}

describe('PricingPostgresRepository mutation audit transactions', () => {
  const cases = [
    ['price update', (repo: PricingPostgresRepository) => repo.updatePrice('price-id', { importe: '6.00', actor_user_id: 'admin-id' }), 'price_changes'],
    ['price deactivation', (repo: PricingPostgresRepository) => repo.deactivatePrice('price-id', 'admin-id'), 'price_changes'],
    ['promotion update', (repo: PricingPostgresRepository) => repo.updatePromotion('promotion-id', { nombre: 'New', actor_user_id: 'admin-id' }), 'promotion_changes'],
    ['promotion deactivation', (repo: PricingPostgresRepository) => repo.deactivatePromotion('promotion-id', 'admin-id'), 'promotion_changes'],
  ] as const;

  it.each(cases)('%s commits its audit row in the same transaction', async (_label, operation, auditTable) => {
    const { repository, statements } = harness();
    await operation(repository);
    expect(statements[0]).toBe('BEGIN');
    expect(statements.some((sql) => sql.includes(`INSERT INTO ${auditTable}`))).toBe(true);
    expect(statements.at(-1)).toBe('COMMIT');
  });

  it.each(cases)('%s rolls back the record change if audit insertion fails', async (_label, operation) => {
    const { repository, statements } = harness(true);
    await expect(operation(repository)).rejects.toThrow('audit insert failed');
    expect(statements[0]).toBe('BEGIN');
    expect(statements.at(-1)).toBe('ROLLBACK');
  });
});
