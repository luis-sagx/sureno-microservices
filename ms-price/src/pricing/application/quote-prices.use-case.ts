import { calculateBestPromotion } from '../domain/pricing-policy.js';
import type { CustomerSegment, PriceRecord } from '../domain/pricing-model.js';
import { PricingError } from '../domain/pricing-error.js';
import type { PricingCatalogPort } from './pricing-catalog.port.js';
import type { PricingRepository } from './pricing.repository.js';
import type { PricingCredentials, PricingSessionPort } from './pricing-session.port.js';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

export interface PriceQuoteItem {
  presentation_id: string;
  presentation_type: 'UNIDAD' | 'CAJA';
  segmento: CustomerSegment;
  base_amount: string | null;
  promotion_id: string | null;
  promotion_name: string | null;
  discount_amount: string;
  final_amount: string | null;
  configured: boolean;
  currency: 'USD';
}

export class QuotePrices {
  constructor(
    private readonly repository: PricingRepository,
    private readonly catalog: PricingCatalogPort,
    private readonly sessions: PricingSessionPort,
  ) {}

  async execute(input: {
    presentationIds: readonly string[];
    credentials: PricingCredentials;
    at?: Date;
  }): Promise<{ items: PriceQuoteItem[] }> {
    const ids = [...input.presentationIds];
    if (ids.length < 1 || ids.length > 100) {
      throw new PricingError('bad_request', 'Envía entre 1 y 100 identificadores de presentación.');
    }
    if (ids.some((id) => !UUID_PATTERN.test(id))) {
      throw new PricingError('bad_request', 'Todos los identificadores deben ser UUID válidos.');
    }
    if (new Set(ids).size !== ids.length) {
      throw new PricingError('bad_request', 'No repitas identificadores de presentación.');
    }

    const at = input.at ?? new Date();
    const [principal, presentations] = await Promise.all([
      this.sessions.resolveOptional(input.credentials),
      this.catalog.getPresentations(ids),
    ]);
    const presentationById = new Map(presentations.map((presentation) => [presentation.id, presentation]));
    if (ids.some((id) => !presentationById.has(id))) {
      throw new PricingError('not_found', 'Una o más presentaciones no existen o no están activas.');
    }

    const segment: CustomerSegment = principal?.roles.includes('CUSTOMER_B2B') ? 'B2B' : 'B2C';
    const eligibleIds = ids.filter((id) => {
      const presentation = presentationById.get(id)!;
      return segment === 'B2C' || presentation.tipo === 'CAJA';
    });
    const [prices, promotions] = await Promise.all([
      eligibleIds.length ? this.repository.findCurrentPrices(eligibleIds, segment, at) : [],
      segment === 'B2B' && eligibleIds.length
        ? this.repository.findCurrentPromotions(eligibleIds, segment, at)
        : [],
    ]);
    const priceByPresentation = new Map<string, PriceRecord>();
    for (const price of prices) priceByPresentation.set(price.presentation_id, price);

    return {
      items: ids.map((id) => {
        const presentation = presentationById.get(id)!;
        const price = priceByPresentation.get(id);
        if (!price) {
          return {
            presentation_id: id,
            presentation_type: presentation.tipo,
            segmento: segment,
            base_amount: null,
            promotion_id: null,
            promotion_name: null,
            discount_amount: '0.00',
            final_amount: null,
            configured: false,
            currency: 'USD',
          };
        }
        const promotion = calculateBestPromotion(price.importe, id, promotions, at);
        return {
          presentation_id: id,
          presentation_type: presentation.tipo,
          segmento: segment,
          base_amount: price.importe,
          ...promotion,
          configured: true,
          currency: 'USD',
        };
      }),
    };
  }
}
