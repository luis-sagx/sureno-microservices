import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { Category, Product } from '../features/catalog/models/catalog.models';
import { CatalogApiService } from '../features/catalog/data-access/catalog-api.service';
import { CatalogPage } from './catalog.page';

@Component({ template: '' })
class ProductDetailRouteStub {}

const category: Category = {
  id: 'category-uuid',
  nombre: 'Licores',
  descripcion: null,
  activo: true,
};

const imageByName: Record<string, string> = {
  'Aguardiente Diamante': 'aguardiente-diamante',
  'Blue Vodka': 'vodka-blue',
  'Media Caña Sureña': 'cana-surena-media',
  'Caña Sureña': 'cana-surena',
  'Cocktail Sabor a Durazno': 'coctel-durazno',
  'Cocktail Sabor a Maracuyá': 'coctel-maracuya',
  'Licor de Cannabis': 'cannabis',
  'Media Ron Oro': 'licor-oro-media',
  'Ron Oro': 'licor-oro',
  'Vodka Seco Glacial': 'vodka-glacial',
  'Whisky Red Diez': 'wisky-red-diez',
};

function makeProduct(name: string, index: number): Product {
  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    category_id: category.id,
    categoria: category,
    nombre: name,
    descripcion: `${name} de Sureño`,
    volumen_ml: 750,
    disponible: true,
    activo: true,
    presentaciones: [
      { id: `unit-${index}`, tipo: 'UNIDAD', unidades_por_presentacion: 1, activo: true },
      { id: `case-${index}`, tipo: 'CAJA', unidades_por_presentacion: 12, activo: true },
    ],
  };
}

describe('CatalogPage', () => {
  let products: Product[];
  let approvedBusiness: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    products = Object.keys(imageByName).map(makeProduct);
    approvedBusiness = vi.fn(() => false);
    await TestBed.configureTestingModule({
      imports: [CatalogPage],
      providers: [
        provideRouter([{ path: 'catalogo/producto/:id', component: ProductDetailRouteStub }]),
        {
          provide: CatalogApiService,
          useValue: {
            categories: () => of([category]),
            products: () => of({ items: products, total: products.length, page: 1, page_size: 100 }),
          },
        },
        {
          provide: AuthService,
          useValue: { isApprovedBusiness: approvedBusiness, user: signal(null) },
        },
      ],
    }).compileComponents();
  });

  afterEach(() => vi.restoreAllMocks());

  it('maps each of the eleven reference products to its local image asset', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const images = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('.product-card img')];

    expect(images).toHaveLength(11);
    for (const image of images) {
      const productName = image.alt;
      const src = `/img-minorista/${imageByName[productName]}.webp`;
      expect(image.getAttribute('src')).toBe(src);
    }
  });

  it('links every product card to its UUID detail route', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const firstProduct = products[0];
    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      `.product-card a[href="/catalogo/producto/${firstProduct.id}"]`,
    );

    expect(link?.textContent).toContain('Ver detalles');
  });

  it('loads the first twelve thumbnails eagerly and defers later cards', () => {
    products = [
      ...products,
      makeProduct('Producto adicional doce', 11),
      makeProduct('Producto adicional trece', 12),
    ];
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const loadingModes = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('.product-card img')]
      .map((image) => image.getAttribute('loading'));

    expect(loadingModes.slice(0, 12).every((mode) => mode === 'eager')).toBe(true);
    expect(loadingModes[12]).toBe('lazy');
  });

  it('resets the viewport to the top when opening a product detail', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.detail-link')!.click();
    await fixture.whenStable();

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'instant' });
  });

  it('limits approved business accounts to full-case presentations', () => {
    approvedBusiness.mockReturnValue(true);
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const options = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLSelectElement>('.presentation-row select')]
      .map((select) => [...select.options].map((option) => option.value));

    expect(options.every((values) => values.length === 1 && values[0] === 'CAJA')).toBe(true);
    const images = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLImageElement>('.product-card img')];
    expect(images[0].getAttribute('src')).toBe('/img-mayoreo/caja-aguardiente-diamante.webp');
  });

  it('shows availability and unconfigured pricing without an active purchase action', () => {
    products = [
      { ...makeProduct('Caña Sureña', 0), disponible: false },
    ];
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.product-card')!;

    expect(card.textContent).toContain('No disponible');
    expect(card.textContent).toContain('No configurado');
    expect(card.querySelector('button, input[type="submit"]')).toBeNull();
  });

  it('keeps cards concise and omits internal service readiness copy', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const card = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.product-card')!;

    expect(card.querySelector('.product-description')).toBeNull();
    expect(card.textContent).not.toContain('Los precios y pedidos estarán disponibles cuando MS04 y MS03 estén habilitados.');
    expect(card.textContent).toContain('Disponibilidad por confirmar');
    expect(card.textContent).toContain('No configurado');
  });

  it('applies the shared scroll-reveal behavior to each product card', () => {
    const fixture = TestBed.createComponent(CatalogPage);
    fixture.detectChanges();
    const cards = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.product-card')];

    expect(cards).toHaveLength(11);
    expect(cards.every((card) => card.hasAttribute('appscrollreveal'))).toBe(true);
  });
});
