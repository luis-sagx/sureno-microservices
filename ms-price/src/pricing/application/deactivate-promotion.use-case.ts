import { PricingError } from '../domain/pricing-error.js';
import type { PromotionRecord } from '../domain/pricing-model.js';
import type { PricingRepository } from './pricing.repository.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class DeactivatePromotion {
  constructor(private readonly repository: PricingRepository) {}

  async execute(id: string, actorUserId: string): Promise<PromotionRecord> {
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('bad_request', 'Identificador de promoción o administrador inválido.');
    }
    const promotion = await this.repository.deactivatePromotion(id, actorUserId);
    if (!promotion) throw new PricingError('not_found', 'No se encontró la promoción.');
    return promotion;
  }
}
