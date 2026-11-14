import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuotePrices } from './quote-prices.use-case.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { PricingSessionPort } from './pricing-session.port.js';

const unitId = '10000000-0000-4000-8000-000000000011';
const caseId = '10000000-0000-4000-8000-000000000012';
const now = new Date('2026-11-14T12:00:00.000Z');

const activePrice = (
  presentationId: string,
  segmento: 'B2B' | 'B2C',
  importe: string,
) => ({
  id: `${presentationId}-${segmento}`,
  presentation_id: presentationId,
  segmento,
  importe,
  vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
  vigente_hasta: null,
  activo: true,
});

describe('QuotePrices', () => {
  const repository = {
    findCurrentPrices: vi.fn(),
    findCurrentPromotions: vi.fn(),
  } as unknown as PricingRepository;
  const catalog = {
    getPresentations: vi.fn(),
  } as unknown as PricingCatalogPort;
  const sessions = {
    resolveOptional: vi.fn(),
  } as unknown as PricingSessionPort;

  beforeEach(() => {
    vi.mocked(repository.findCurrentPrices).mockReset();
    vi.mocked(repository.findCurrentPromotions).mockReset();
    vi.mocked(catalog.getPresentations).mockReset();
    vi.mocked(sessions.resolveOptional).mockReset();
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: unitId, product_id: 'product-1', tipo: 'UNIDAD', unidades_por_presentacion: 1 },
      { id: caseId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(sessions.resolveOptional).mockResolvedValue(null);
    vi.mocked(repository.findCurrentPrices).mockResolvedValue([activePrice(unitId, 'B2C', '5.00')]);
    vi.mocked(repository.findCurrentPromotions).mockResolvedValue([]);
  });

  it('quotes public prices without accepting a client-supplied segment', async () => {
    const quote = new QuotePrices(repository, catalog, sessions);
    const result = await quote.execute({
      presentationIds: [unitId],
      credentials: {},
      at: now,
    });

    expect(sessions.resolveOptional).toHaveBeenCalledWith({});
    expect(repository.findCurrentPrices).toHaveBeenCalledWith([unitId], 'B2C', now);
    expect(result.items[0]).toMatchObject({
      presentation_id: unitId,
      presentation_type: 'UNIDAD',
      segmento: 'B2C',
      base_amount: '5.00',
      discount_amount: '0.00',
      final_amount: '5.00',
      configured: true,
      currency: 'USD',
    });
  });

  it('uses commercial rates and only B2B promotions for a verified approved business', async () => {
    vi.mocked(sessions.resolveOptional).mockResolvedValue({
      userId: '00000000-0000-4000-8000-000000000001',
      roles: ['CUSTOMER', 'CUSTOMER_B2B'],
    });
    vi.mocked(repository.findCurrentPrices).mockResolvedValue([activePrice(caseId, 'B2B', '42.00')]);
    vi.mocked(repository.findCurrentPromotions).mockResolvedValue([
      {
        id: 'promotion-1',
        nombre: 'Descuento comercial',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '10.00',
        vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
        vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
        activo: true,
        presentation_ids: [caseId],
      },
    ]);
    const quote = new QuotePrices(repository, catalog, sessions);

    const result = await quote.execute({ presentationIds: [caseId], credentials: {}, at: now });

    expect(repository.findCurrentPrices).toHaveBeenCalledWith([caseId], 'B2B', now);
    expect(repository.findCurrentPromotions).toHaveBeenCalledWith([caseId], 'B2B', now);
    expect(result.items[0]).toMatchObject({
      presentation_id: caseId,
      segmento: 'B2B',
      base_amount: '42.00',
      promotion_id: 'promotion-1',
      discount_amount: '4.20',
      final_amount: '37.80',
      configured: true,
    });
  });

  it('does not expose a B2B unit tariff to an approved business account', async () => {
    vi.mocked(sessions.resolveOptional).mockResolvedValue({
      userId: '00000000-0000-4000-8000-000000000001',
      roles: ['CUSTOMER_B2B'],
    });
    vi.mocked(repository.findCurrentPrices).mockResolvedValue([activePrice(unitId, 'B2C', '5.00')]);
    const quote = new QuotePrices(repository, catalog, sessions);

    const result = await quote.execute({ presentationIds: [unitId], credentials: {}, at: now });

    expect(repository.findCurrentPrices).not.toHaveBeenCalled();
    expect(result.items[0]).toMatchObject({
      segmento: 'B2B',
      base_amount: null,
      final_amount: null,
      configured: false,
    });
  });

  it('returns an explicit unconfigured state when the selected B2C box rate has not been set', async () => {
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: caseId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(repository.findCurrentPrices).mockResolvedValue([]);
    const quote = new QuotePrices(repository, catalog, sessions);

    const result = await quote.execute({ presentationIds: [caseId], credentials: {}, at: now });

    expect(result.items[0]).toMatchObject({
      presentation_id: caseId,
      base_amount: null,
      final_amount: null,
      configured: false,
      currency: 'USD',
    });
  });

  it('rejects unknown and duplicated presentation IDs before querying prices', async () => {
    vi.mocked(catalog.getPresentations).mockResolvedValue([]);
    const quote = new QuotePrices(repository, catalog, sessions);

    await expect(
      quote.execute({ presentationIds: ['30000000-0000-4000-8000-000000000003'], credentials: {}, at: now }),
    ).rejects.toThrow();
    await expect(
      quote.execute({ presentationIds: [unitId, unitId], credentials: {}, at: now }),
    ).rejects.toThrow();
    expect(repository.findCurrentPrices).not.toHaveBeenCalled();
  });
});
