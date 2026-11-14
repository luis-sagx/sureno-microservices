import { Injectable, signal, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { PriceQuote, PriceQuoteStatus } from '../models/pricing.models';
import { PricingApiService } from './pricing-api.service';

@Injectable({ providedIn: 'root' })
export class CatalogPricingFacade {
  private readonly api = inject(PricingApiService);
  private readonly quotes = signal<Record<string, PriceQuote>>({});
  private readonly statuses = signal<Record<string, PriceQuoteStatus>>({});
  private request?: Subscription;

  quoteFor(presentationId: string | undefined): PriceQuote | undefined {
    return presentationId ? this.quotes()[presentationId] : undefined;
  }

  statusFor(presentationId: string | undefined): PriceQuoteStatus {
    return presentationId
      ? this.statuses()[presentationId] ?? { loading: true, error: '' }
      : { loading: false, error: '' };
  }

  load(presentationIds: readonly string[]): void {
    const ids = [...new Set(presentationIds.filter(Boolean))];
    this.request?.unsubscribe();
    if (ids.length === 0) {
      this.statuses.set({});
      return;
    }

    this.quotes.update((current) => {
      const next = { ...current };
      for (const id of ids) delete next[id];
      return next;
    });
    this.statuses.set(Object.fromEntries(ids.map((id) => [id, { loading: true, error: '' }])));
    this.request = this.api.quotes(ids).subscribe({
      next: (quotes) => {
        this.quotes.update((current) => ({ ...current, ...Object.fromEntries(quotes.map((quote) => [quote.presentation_id, quote])) }));
        this.statuses.set(Object.fromEntries(ids.map((id) => [id, { loading: false, error: '' }])));
      },
      error: () => this.statuses.set(Object.fromEntries(ids.map((id) => [id, {
        loading: false,
        error: 'No pudimos consultar el precio. Intenta nuevamente.',
      }]))),
    });
  }
}
