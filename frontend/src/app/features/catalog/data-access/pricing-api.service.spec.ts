import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PricingApiService } from './pricing-api.service';

describe('PricingApiService', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('maps batched presentation quotes from the MS04 response', () => {
    const quotes = TestBed.inject(PricingApiService).quotes(['unit-id', 'case-id']);
    let result: unknown;
    quotes.subscribe((value) => result = value);

    const request = http.expectOne('/api/prices/quotes?presentation_ids=unit-id,case-id');
    expect(request.request.method).toBe('GET');
    request.flush({
      items: [
        { presentation_id: 'unit-id', presentation_type: 'UNIDAD', segmento: 'B2C', base_amount: '5.00', promotion_id: null, promotion_name: null, discount_amount: '0.00', final_amount: '5.00', configured: true, currency: 'USD' },
        { presentation_id: 'case-id', presentation_type: 'CAJA', segmento: 'B2C', base_amount: null, promotion_id: null, promotion_name: null, discount_amount: '0.00', final_amount: null, configured: false, currency: 'USD' },
      ],
    });

    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ presentation_id: 'unit-id', final_amount: '5.00', configured: true }),
      expect.objectContaining({ presentation_id: 'case-id', final_amount: null, configured: false }),
    ]));
  });
});
