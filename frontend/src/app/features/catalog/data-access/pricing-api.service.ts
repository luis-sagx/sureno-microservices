import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { PriceQuote, PriceQuoteResponse } from '../models/pricing.models';

const PRICING_API = '/api/prices';

@Injectable({ providedIn: 'root' })
export class PricingApiService {
  private readonly http = inject(HttpClient);

  quotes(presentationIds: readonly string[]): Observable<PriceQuote[]> {
    const params = new HttpParams().set('presentation_ids', presentationIds.join(','));
    return this.http.get<PriceQuoteResponse>(`${PRICING_API}/quotes`, { params }).pipe(map((response) => response.items));
  }
}
