import { PricingError } from '../domain/pricing-error.js';
import type { PriceRecord } from '../domain/pricing-model.js';
import type { PricingRepository } from './pricing.repository.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class DeactivatePrice {
  constructor(private readonly repository: PricingRepository) {}

  async execute(id: string, actorUserId: string): Promise<PriceRecord> {
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('bad_request', 'Identificador de tarifa o administrador inválido.');
    }
    const price = await this.repository.deactivatePrice(id, actorUserId);
    if (!price) throw new PricingError('not_found', 'No se encontró la tarifa.');
    return price;
  }
}
