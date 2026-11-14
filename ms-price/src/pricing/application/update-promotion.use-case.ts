import { PricingError } from '../domain/pricing-error.js';
import type { PromotionInput, PromotionRecord } from '../domain/pricing-model.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';
import { normalizePromotionInput } from './promotion-input.js';
import type { PricingRepository } from './pricing.repository.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export class UpdatePromotion {
  constructor(
    private readonly repository: PricingRepository,
    private readonly catalog: PricingCatalogPort,
  ) {}

  history(id: string) { return this.repository.listPromotionChanges(id); }

  async execute(
    id: string,
    input: Partial<PromotionInput>,
    actorUserId: string,
  ): Promise<PromotionRecord> {
    if (!UUID_PATTERN.test(id) || !UUID_PATTERN.test(actorUserId)) {
      throw new PricingError('bad_request', 'Identificador de promoción o administrador inválido.');
    }
    const existing = await this.repository.getPromotion(id);
    if (!existing) throw new PricingError('not_found', 'No se encontró la promoción.');
    const normalized = await normalizePromotionInput(
      {
        ...existing,
        ...input,
        nombre: input.nombre ?? existing.nombre,
        segmento: input.segmento ?? existing.segmento,
        tipo_descuento: input.tipo_descuento ?? existing.tipo_descuento,
        valor_descuento: input.valor_descuento ?? existing.valor_descuento,
        vigente_desde: input.vigente_desde ?? existing.vigente_desde,
        vigente_hasta: input.vigente_hasta ?? existing.vigente_hasta,
        presentation_ids: input.presentation_ids ?? existing.presentation_ids,
        activo: input.activo ?? existing.activo,
      },
      this.catalog,
    );
    const promotion = await this.repository.updatePromotion(id, {
      ...normalized,
      actor_user_id: actorUserId,
    });
    if (!promotion) throw new PricingError('not_found', 'No se encontró la promoción.');
    return promotion;
  }
}
