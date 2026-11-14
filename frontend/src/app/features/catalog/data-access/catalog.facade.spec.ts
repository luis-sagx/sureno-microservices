import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CatalogFacade } from './catalog.facade';
import { CatalogApiService } from './catalog-api.service';

describe('CatalogFacade', () => {
  it('loads categories and queried products into shared page state', async () => {
    const categories = [{ id: 'category', nombre: 'Licores', descripcion: null, activo: true }];
    const products = [{
      id: 'product', category_id: 'category', categoria: categories[0], nombre: 'Sureño',
      descripcion: null, volumen_ml: null, disponible: true, activo: true, presentaciones: [],
    }];
    const api = {
      categories: vi.fn(() => of(categories)),
      products: vi.fn(() => of({ items: products, total: 1, page: 1, page_size: 100 })),
    };

    await TestBed.configureTestingModule({
      providers: [CatalogFacade, { provide: CatalogApiService, useValue: api }],
    }).compileComponents();

    const facade = TestBed.inject(CatalogFacade);
    facade.load({ q: 'Sureño', page: 1, page_size: 100 });

    expect(api.categories).toHaveBeenCalledOnce();
    expect(api.products).toHaveBeenCalledWith({ q: 'Sureño', page: 1, page_size: 100 });
    expect(facade.categories()).toEqual(categories);
    expect(facade.products()).toEqual(products);
    expect(facade.hasLoaded()).toBe(true);
    expect(facade.loading()).toBe(false);
  });
});
