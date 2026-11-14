import type { PresentationReference } from '../domain/pricing-model.js';

export interface PricingCatalogPort {
  getPresentations(ids: readonly string[]): Promise<PresentationReference[]>;
  getProductPresentations(productId: string): Promise<PresentationReference[]>;
}
