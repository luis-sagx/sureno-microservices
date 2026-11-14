import { PricingError } from '../domain/pricing-error.js';
import type { PriceInput, PriceRecord } from '../domain/pricing-model.js';
import type { PricingRepository } from './pricing.repository.js';
import type { SetPrice } from './set-price.use-case.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class UpdatePrice {
  constructor(
    private readonly repository: PricingRepository,
    private readonly validator: SetPrice,
  ) {}

  history(id: string) { return this.repository.listPriceChanges(id); }

  async execute(id: string, input: Partial<PriceInput>, actorUserId: string): Promise<PriceRecord> {
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('bad_request', 'Identificador de tarifa o administrador inválido.');
    }
    const existing = await this.repository.getPrice(id);
    if (!existing) throw new PricingError('not_found', 'No se encontró la tarifa.');
    const normalized = await this.validator.validate(
      {
        ...existing,
        ...input,
        presentation_id: input.presentation_id ?? existing.presentation_id,
        segmento: input.segmento ?? existing.segmento,
        importe: input.importe ?? existing.importe,
        vigente_desde: input.vigente_desde ?? existing.vigente_desde,
        vigente_hasta: input.vigente_hasta === undefined ? existing.vigente_hasta : input.vigente_hasta,
        activo: input.activo ?? existing.activo,
      },
      actorUserId,
      id,
    );
    const updated = await this.repository.updatePrice(id, {
      ...normalized,
      actor_user_id: actorUserId,
    });
    if (!updated) throw new PricingError('not_found', 'No se encontró la tarifa.');
    return updated;
  }
}
