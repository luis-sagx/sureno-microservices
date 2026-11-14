import type { PromotionInput, PromotionRecord } from '../domain/pricing-model.js';
import { PricingError } from '../domain/pricing-error.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { PricingRepository } from './pricing.repository.js';
import { normalizePromotionInput } from './promotion-input.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class CreatePromotion {
  constructor(
    private readonly repository: PricingRepository,
    private readonly catalog: PricingCatalogPort,
  ) {}

  list() { return this.repository.listPromotions(); }

  async execute(input: PromotionInput, actorUserId: string): Promise<PromotionRecord> {
    if (!UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('unauthorized', 'No se pudo identificar al administrador.');
    }
    const normalized = await normalizePromotionInput(input, this.catalog);
    return this.repository.createPromotion({
      ...normalized,
      actor_user_id: actorUserId,
    });
  }
}
