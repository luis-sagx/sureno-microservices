import { describe, expect, it, vi } from 'vitest';
import {
  buildReferencePriceEntries,
  seedMissingPrices,
} from './reference-seeder.js';

describe('reference price seeder', () => {
  it('derives a B2C case tariff as nine times the unit price rounded to cents', () => {
    expect(buildReferencePriceEntries('unit-id', 'case-id', 1.67, 1.25)).toEqual([
      { presentationId: 'unit-id', segment: 'B2C', amount: '1.67' },
      { presentationId: 'case-id', segment: 'B2C', amount: '15.03' },
      { presentationId: 'case-id', segment: 'B2B', amount: '15.00' },
    ]);
  });

  it('does not replace or audit an existing active tariff', async () => {
    const query = vi.fn().mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await seedMissingPrices({ query }, [
      { presentationId: 'case-id', segment: 'B2C', amount: '45.00' },
    ], 'admin-id');

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][1]).toEqual(['case-id', 'B2C']);
  });

  it('inserts and audits a missing tariff', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rowCount: 0, rows: [] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 'new-price', importe: '45.00' }] })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });

    await seedMissingPrices({ query }, [
      { presentationId: 'case-id', segment: 'B2C', amount: '45.00' },
    ], 'admin-id');

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[1][1]).toEqual(['case-id', 'B2C', '45.00']);
    expect(query.mock.calls[2][1]).toEqual(['new-price', '45.00', 'admin-id']);
  });
});
