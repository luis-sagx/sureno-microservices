import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { PriceQuote } from '../models/pricing.models';
import { PricingApiService } from './pricing-api.service';
import { CatalogPricingFacade } from './catalog-pricing.facade';

const unitQuote: PriceQuote = {
  presentation_id: 'unit-id', presentation_type: 'UNIDAD', segmento: 'B2C', base_amount: '5.00',
  promotion_id: null, promotion_name: null, discount_amount: '0.00', final_amount: '5.00', configured: true, currency: 'USD',
};

describe('CatalogPricingFacade', () => {
  it('tracks loading by presentation and maps completed quotes by ID', () => {
    const response = new Subject<PriceQuote[]>();
    const api = { quotes: vi.fn(() => response.asObservable()) };
    TestBed.configureTestingModule({ providers: [CatalogPricingFacade, { provide: PricingApiService, useValue: api }] });
    const facade = TestBed.inject(CatalogPricingFacade);

    facade.load(['unit-id', 'case-id']);
    expect(facade.statusFor('unit-id').loading).toBe(true);
    expect(api.quotes).toHaveBeenCalledWith(['unit-id', 'case-id']);
    response.next([unitQuote]);

    expect(facade.quoteFor('unit-id')).toEqual(unitQuote);
    expect(facade.statusFor('unit-id')).toEqual({ loading: false, error: '' });
    expect(facade.statusFor('case-id')).toEqual({ loading: false, error: '' });
  });

  it('reports a quote request failure for every requested presentation', () => {
    const response = new Subject<PriceQuote[]>();
    TestBed.configureTestingModule({ providers: [CatalogPricingFacade, { provide: PricingApiService, useValue: { quotes: () => response.asObservable() } }] });
    const facade = TestBed.inject(CatalogPricingFacade);
    facade.load(['unit-id', 'case-id']);
    response.error(new Error('pricing offline'));

    expect(facade.statusFor('unit-id').loading).toBe(false);
    expect(facade.statusFor('unit-id').error).toContain('No pudimos consultar');
    expect(facade.statusFor('case-id').error).toContain('No pudimos consultar');
  });
});
