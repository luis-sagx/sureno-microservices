import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UpdatePrice } from './update-price.use-case.js';
import { DeactivatePrice } from './deactivate-price.use-case.js';
import { UpdatePromotion } from './update-promotion.use-case.js';
import { DeactivatePromotion } from './deactivate-promotion.use-case.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { SetPrice } from './set-price.use-case.js';

const priceId = '00000000-0000-4000-8000-000000000101';
const promotionId = '00000000-0000-4000-8000-000000000102';
const presentationId = '10000000-0000-4000-8000-000000000012';
const actorId = '00000000-0000-4000-8000-000000000002';

describe('pricing administrator use cases', () => {
  const repository = {
    getPrice: vi.fn(),
    updatePrice: vi.fn(),
    deactivatePrice: vi.fn(),
    getPromotion: vi.fn(),
    updatePromotion: vi.fn(),
    deactivatePromotion: vi.fn(),
  } as unknown as PricingRepository;
  const catalog = { getPresentations: vi.fn() } as unknown as PricingCatalogPort;
  const prices = { validate: vi.fn() } as unknown as SetPrice;

  beforeEach(() => {
    vi.mocked(repository.getPrice).mockReset();
    vi.mocked(repository.updatePrice).mockReset();
    vi.mocked(repository.deactivatePrice).mockReset();
    vi.mocked(repository.getPromotion).mockReset();
    vi.mocked(repository.updatePromotion).mockReset();
    vi.mocked(repository.deactivatePromotion).mockReset();
    vi.mocked(catalog.getPresentations).mockReset();
    vi.mocked(prices.validate).mockReset();
    vi.mocked(repository.getPrice).mockResolvedValue({
      id: priceId,
      presentation_id: presentationId,
      segmento: 'B2C',
      importe: '5.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: null,
      activo: true,
    });
    vi.mocked(repository.updatePrice).mockResolvedValue({
      id: priceId,
      presentation_id: presentationId,
      segmento: 'B2C',
      importe: '6.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: null,
      activo: true,
    });
    vi.mocked(prices.validate).mockResolvedValue({
      presentation_id: presentationId,
      segmento: 'B2C',
      importe: '6.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: null,
      activo: true,
    });
    vi.mocked(repository.deactivatePrice).mockResolvedValue({ id: priceId } as never);
    vi.mocked(repository.getPromotion).mockResolvedValue({
      id: promotionId,
      nombre: 'Descuento actual',
      segmento: 'B2B',
      tipo_descuento: 'PERCENTAGE',
      valor_descuento: '10.00',
      vigente_desde: new Date('2026-11-01T00:00:00.000Z'),
      vigente_hasta: new Date('2026-12-01T00:00:00.000Z'),
      activo: true,
      presentation_ids: [presentationId],
    });
    vi.mocked(catalog.getPresentations).mockResolvedValue([
      { id: presentationId, product_id: 'product-1', tipo: 'CAJA', unidades_por_presentacion: 12 },
    ]);
    vi.mocked(repository.updatePromotion).mockResolvedValue({ id: promotionId } as never);
    vi.mocked(repository.deactivatePromotion).mockResolvedValue({ id: promotionId } as never);
  });

  it('updates a price through the same invariant validation and persists the actor', async () => {
    const update = new UpdatePrice(repository, prices);
    await update.execute(priceId, { importe: '6.00' }, actorId);

    expect(repository.getPrice).toHaveBeenCalledWith(priceId);
    expect(prices.validate).toHaveBeenCalledWith(
      expect.objectContaining({ importe: '6.00', presentation_id: presentationId }),
      actorId,
      priceId,
    );
    expect(repository.updatePrice).toHaveBeenCalledWith(
      priceId,
      expect.objectContaining({ importe: '6.00', actor_user_id: actorId }),
    );
  });

  it('deactivates prices and promotions with the admin actor', async () => {
    const deactivatePrice = new DeactivatePrice(repository);
    const deactivatePromotion = new DeactivatePromotion(repository);

    await deactivatePrice.execute(priceId, actorId);
    await deactivatePromotion.execute(promotionId, actorId);

    expect(repository.deactivatePrice).toHaveBeenCalledWith(priceId, actorId);
    expect(repository.deactivatePromotion).toHaveBeenCalledWith(promotionId, actorId);
  });

  it('updates promotion policy and included presentation references as one audited operation', async () => {
    const update = new UpdatePromotion(repository, catalog);
    await update.execute(promotionId, { valor_descuento: '15.00' }, actorId);

    expect(repository.getPromotion).toHaveBeenCalledWith(promotionId);
    expect(repository.updatePromotion).toHaveBeenCalledWith(
      promotionId,
      expect.objectContaining({ valor_descuento: '15.00', actor_user_id: actorId }),
    );
  });
});
