import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SetPrice } from './set-price.use-case.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';

const unitId = '10000000-0000-4000-8000-000000000011';
const caseId = '10000000-0000-4000-8000-000000000012';
const actorId = '00000000-0000-4000-8000-000000000002';

describe('SetPrice', () => {
  const repository = {
    listPrices: vi.fn(),
    listPricesForProduct: vi.fn(),
    createPrice: vi.fn(),
  } as unknown as PricingRepository;
  const catalog = {
    getPresentations: vi.fn(),
    getProductPresentations: vi.fn(),
  } as unknown as PricingCatalogPort;

  beforeEach(() => {
    vi.mocked(repository.listPrices).mockReset();
    vi.mocked(repository.listPricesForProduct).mockReset();
    vi.mocked(repository.createPrice).mockReset();
    vi.mocked(catalog.getPresentations).mockReset();
    vi.mocked(catalog.getProductPresentations).mockReset();
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: unitId, product_id: 'product-1', tipo: 'UNIDAD', unidades_por_presentacion: 1 },
    ]);
    vi.mocked(catalog.getProductPresentations).mockResolvedValue([
      { id: unitId, product_id: 'product-1', tipo: 'UNIDAD', unidades_por_presentacion: 1 },
      { id: caseId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(repository.listPrices).mockResolvedValue([]);
    vi.mocked(repository.listPricesForProduct).mockResolvedValue([]);
    vi.mocked(repository.createPrice).mockResolvedValue({
      id: 'price-1',
      presentation_id: unitId,
      segmento: 'B2C',
      importe: '5.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: null,
      activo: true,
    });
  });

  it('rejects B2B unit tariffs because commercial prices are case-only', async () => {
    const setPrice = new SetPrice(repository, catalog);
    await expect(
      setPrice.execute(
        {
          presentation_id: unitId,
          segmento: 'B2B',
          importe: '3.50',
          vigente_desde: '2026-11-01T00:00:00.000Z',
          vigente_hasta: null,
        },
        actorId,
      ),
    ).rejects.toThrow(/caja/i);
    expect(repository.createPrice).not.toHaveBeenCalled();
  });

  it('rejects public case tariffs that are not strictly cheaper than twelve unit prices', async () => {
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: caseId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(repository.listPrices).mockImplementation(async (presentationId) =>
      presentationId === unitId
        ? [{
            id: 'unit-price',
            presentation_id: unitId,
            segmento: 'B2C',
            importe: '3.00',
            vigente_desde: new Date('2026-10-01T00:00:00.000Z'),
            vigente_hasta: null,
            activo: true,
          }]
        : [],
    );
    const setPrice = new SetPrice(repository, catalog);

    await expect(
      setPrice.execute(
        {
          presentation_id: caseId,
          segmento: 'B2C',
          importe: '36.00',
          vigente_desde: '2026-11-01T00:00:00.000Z',
          vigente_hasta: null,
        },
        actorId,
      ),
    ).rejects.toThrow(/menor/i);
    expect(repository.createPrice).not.toHaveBeenCalled();
  });

  it('persists a valid public unit tariff with the authenticated admin actor', async () => {
    const setPrice = new SetPrice(repository, catalog);
    const result = await setPrice.execute(
      {
        presentation_id: unitId,
        segmento: 'B2C',
        importe: '5.00',
        vigente_desde: '2026-11-01T00:00:00.000Z',
        vigente_hasta: null,
      },
      actorId,
    );

    expect(repository.createPrice).toHaveBeenCalledWith({
      presentation_id: unitId,
      segmento: 'B2C',
      importe: '5.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: null,
      activo: true,
      actor_user_id: actorId,
    });
    expect(result.id).toBe('price-1');
  });
});
