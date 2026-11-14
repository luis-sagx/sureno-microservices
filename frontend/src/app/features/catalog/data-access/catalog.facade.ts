import { Injectable, inject, signal } from '@angular/core';
import { CatalogApiService } from './catalog-api.service';
import { CatalogQuery, Category, Product } from '../models/catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogFacade {
  private readonly api = inject(CatalogApiService);

  readonly categories = signal<Category[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly hasLoaded = signal(false);

  load(query: CatalogQuery): void {
    this.loading.set(true);
    this.error.set('');
    this.api.categories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.api.products(query).subscribe({
      next: (page) => {
        this.products.set(page.items);
        this.hasLoaded.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar el catálogo. Intenta nuevamente cuando los servicios estén disponibles.');
        this.hasLoaded.set(true);
        this.loading.set(false);
      },
    });
  }
}
