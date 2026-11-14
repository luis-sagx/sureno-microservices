import type {
  CustomerSegment,
  PriceChangeRecord,
  PriceInput,
  PriceRecord,
  PromotionChangeRecord,
  PromotionInput,
  PromotionRecord,
} from '../domain/pricing-model.js';

export interface PricingRepository {
  findCurrentPrices(presentationIds: readonly string[], segment: CustomerSegment, at: Date): Promise<PriceRecord[]>;
  listPrices(presentationId: string, segment: CustomerSegment): Promise<PriceRecord[]>;
  listPricesForProduct(presentationIds: readonly string[], segment: CustomerSegment): Promise<PriceRecord[]>;
  findCurrentPromotions(presentationIds: readonly string[], segment: CustomerSegment, at: Date): Promise<PromotionRecord[]>;
  getPrice(id: string): Promise<PriceRecord | null>;
  listPriceChanges(id: string): Promise<PriceChangeRecord[] | null>;
  createPrice(input: PriceInput & { actor_user_id: string }): Promise<PriceRecord>;
  updatePrice(id: string, input: Partial<PriceInput> & { actor_user_id: string }): Promise<PriceRecord | null>;
  deactivatePrice(id: string, actorUserId: string): Promise<PriceRecord | null>;
  listPromotions(): Promise<PromotionRecord[]>;
  getPromotion(id: string): Promise<PromotionRecord | null>;
  listPromotionChanges(id: string): Promise<PromotionChangeRecord[] | null>;
  createPromotion(input: PromotionInput & { actor_user_id: string }): Promise<PromotionRecord>;
  updatePromotion(id: string, input: Partial<PromotionInput> & { actor_user_id: string }): Promise<PromotionRecord | null>;
  deactivatePromotion(id: string, actorUserId: string): Promise<PromotionRecord | null>;
}
