import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CreatePromotion } from './create-promotion.use-case.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';

const caseId = '10000000-0000-4000-8000-000000000012';
const actorId = '00000000-0000-4000-8000-000000000002';

describe('CreatePromotion', () => {
  const repository = {
    createPromotion: vi.fn(),
  } as unknown as PricingRepository;
  const catalog = {
    getPresentations: vi.fn(),
  } as unknown as PricingCatalogPort;

  beforeEach(() => {
    vi.mocked(repository.createPromotion).mockReset();
    vi.mocked(catalog.getPresentations).mockReset();
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: caseId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(repository.createPromotion).mockResolvedValue({
      id: 'promotion-1',
      nombre: 'Descuento mayorista',
      segmento: 'B2B',
      tipo_descuento: 'PERCENTAGE',
      valor_descuento: '10.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
      activo: true,
      presentation_ids: [caseId],
    });
  });

  it('creates an explicit B2B promotion for verified catalog box presentations and records the admin', async () => {
    const create = new CreatePromotion(repository, catalog);
    const result = await create.execute(
      {
        nombre: '  Descuento mayorista ',
        segmento: 'B2B',
        tipo_descuento: 'PERCENTAGE',
        valor_descuento: '10',
        vigente_desde: '2026-11-01T00:00:00.000Z',
        vigente_hasta: '2026-12-01T00:00:00.000Z',
        presentation_ids: [caseId],
      },
      actorId,
    );

    expect(repository.createPromotion).toHaveBeenCalledWith({
      nombre: 'Descuento mayorista',
      segmento: 'B2B',
      tipo_descuento: 'PERCENTAGE',
      valor_descuento: '10.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
      presentation_ids: [caseId],
      activo: true,
      actor_user_id: actorId,
    });
    expect(result.id).toBe('promotion-1');
  });

  it('rejects B2C-exclusive promotions and non-case or unknown presentations', async () => {
    const create = new CreatePromotion(repository, catalog);
    await expect(
      create.execute(
        {
          nombre: 'No es pública',
          segmento: 'B2C',
          tipo_descuento: 'FIXED_AMOUNT',
          valor_descuento: '5.00',
          vigente_desde: '2026-11-01T00:00:00.000Z',
          vigente_hasta: '2026-12-01T00:00:00.000Z',
          presentation_ids: [caseId],
        },
        actorId,
      ),
    ).rejects.toThrow(/B2B/i);

    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: caseId, product_id: 'product-1', tipo: 'UNIDAD', unidades_por_presentacion: 1 },
    ]);
    await expect(
      create.execute(
        {
          nombre: 'Solo cajas',
          segmento: 'B2B',
          tipo_descuento: 'FIXED_AMOUNT',
          valor_descuento: '5.00',
          vigente_desde: '2026-11-01T00:00:00.000Z',
          vigente_hasta: '2026-12-01T00:00:00.000Z',
          presentation_ids: [caseId],
        },
        actorId,
      ),
    ).rejects.toThrow(/caja/i);
    expect(repository.createPromotion).not.toHaveBeenCalled();
  });

  it('rejects malformed, duplicate, empty, and invalid-window promotions', async () => {
    const create = new CreatePromotion(repository, catalog);
    const base = {
      nombre: 'Válida',
      segmento: 'B2B',
      tipo_descuento: 'FIXED_AMOUNT',
      valor_descuento: '5.00',
      vigente_desde: '2026-11-01T00:00:00.000Z',
      vigente_hasta: '2026-12-01T00:00:00.000Z',
      presentation_ids: [caseId],
    };
    await expect(create.execute({ ...base, tipo_descuento: 'UNKNOWN' }, actorId)).rejects.toThrow();
    await expect(create.execute({ ...base, presentation_ids: [caseId, caseId] }, actorId)).rejects.toThrow();
    await expect(
      create.execute({ ...base, vigente_hasta: '2026-10-31T00:00:00.000Z' }, actorId),
    ).rejects.toThrow(/posterior/i);
    await expect(
      create.execute({ ...base, tipo_descuento: 'PERCENTAGE', valor_descuento: '150.00' }, actorId),
    ).rejects.toThrow(/100/i);
    expect(repository.createPromotion).not.toHaveBeenCalled();
  });
});
