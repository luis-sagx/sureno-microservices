import { TestBed } from '@angular/core/testing';
import { WritableSignal, signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RenderMode } from '@angular/ssr';
import { routes } from '../../../app.routes';
import { serverRoutes } from '../../../app.routes.server';
import { AuthService } from '../../../core/auth.service';
import { CatalogPricingFacade } from '../data-access/catalog-pricing.facade';
import { Product } from '../models/catalog.models';
import { PriceQuote } from '../models/pricing.models';

const productId = '98765432-1234-4234-8234-123456789012';
const businessProductId = '98765432-1234-4234-8234-123456789013';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: productId,
    category_id: 'category-uuid',
    categoria: { id: 'category-uuid', nombre: 'Aguardientes', descripcion: null, activo: true },
    nombre: 'Caña Sureña',
    descripcion: 'Aguardiente tradicional elaborado en Quito.',
    volumen_ml: 750,
    disponible: true,
    activo: true,
    presentaciones: [
      { id: 'unit-uuid', tipo: 'UNIDAD', unidades_por_presentacion: 1, activo: true },
      { id: 'case-uuid', tipo: 'CAJA', unidades_por_presentacion: 12, activo: true },
    ],
    ...overrides,
  };
}

describe('ProductDetailPage', () => {
  let http: HttpTestingController;
  let approvedBusiness = false;
  let quotes: WritableSignal<Record<string, PriceQuote>>;
  let statuses: WritableSignal<Record<string, { loading: boolean; error: string }>>;
  let pricing: { load: ReturnType<typeof vi.fn>; quoteFor: ReturnType<typeof vi.fn>; statusFor: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    approvedBusiness = false;
    quotes = signal({});
    statuses = signal({});
    pricing = {
      load: vi.fn(),
      quoteFor: vi.fn((id: string) => quotes()[id]),
      statusFor: vi.fn((id: string) => statuses()[id] ?? { loading: false, error: '' }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: { isApprovedBusiness: () => approvedBusiness },
        },
        { provide: CatalogPricingFacade, useValue: pricing },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows a loading state while requesting a product by UUID, then renders its details', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    expect(harness.routeNativeElement?.querySelector('[data-product-detail-loading]')).toBeTruthy();

    const request = http.expectOne(`/api/catalog/products/${productId}`);
    expect(request.request.method).toBe('GET');
    request.flush(makeProduct());
    harness.detectChanges();

    const page = harness.routeNativeElement!;
    expect(page.querySelector('h1')?.textContent).toContain('Caña Sureña');
    expect(page.textContent).toContain('Aguardientes');
    expect(page.textContent).toContain('750 ml');
    expect(page.querySelector<HTMLImageElement>('.product-detail-image img')?.getAttribute('src'))
      .toBe('/img-minorista/cana-surena.webp');
    expect(page.querySelector('[appscrollreveal]')).toBeTruthy();
    expect(page.textContent).toContain('Precio no configurado');
    expect(page.querySelector('button, input[type="submit"]')).toBeNull();
  });

  it('renders a not-found state when the product UUID does not exist', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    http.expectOne(`/api/catalog/products/${productId}`).flush(
      { message: 'No se encontró el producto.' },
      { status: 404, statusText: 'Not Found' },
    );
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('[role="alert"]')?.textContent).toContain('No encontramos este producto');
  });

  it('offers units and cases to B2C but only full cases to approved B2B', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    http.expectOne(`/api/catalog/products/${productId}`).flush(makeProduct());
    harness.detectChanges();
    const retailOptions = [...harness.routeNativeElement!.querySelectorAll<HTMLSelectElement>('.detail-presentation select')[0].options]
      .map((option) => option.value);
    expect(retailOptions).toEqual(['UNIDAD', 'CAJA']);

    approvedBusiness = true;
    await harness.navigateByUrl(`/catalogo/producto/${businessProductId}`);
    http.expectOne(`/api/catalog/products/${businessProductId}`).flush(makeProduct({ id: businessProductId }));
    harness.detectChanges();
    const businessOptions = [...harness.routeNativeElement!.querySelectorAll<HTMLSelectElement>('.detail-presentation select')[0].options]
      .map((option) => option.value);
    expect(businessOptions).toEqual(['CAJA']);
    expect(harness.routeNativeElement!.querySelector<HTMLImageElement>('.product-detail-image img')?.getAttribute('src'))
      .toBe('/img-mayoreo/caja-cana-surena.webp');
  });

  it('shows unavailable product status and keeps price and ordering explicitly unavailable', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    http.expectOne(`/api/catalog/products/${productId}`).flush(makeProduct({ disponible: false }));
    harness.detectChanges();
    const page = harness.routeNativeElement!;

    expect(page.textContent).toContain('No disponible');
    expect(page.textContent).toContain('Precio no configurado');
    expect(page.textContent).not.toContain('MS04');
    expect(page.textContent).not.toContain('MS03');
    expect(page.querySelector('button, input[type="submit"]')).toBeNull();
  });

  it('shows the verified B2B quote for the selected full case only', async () => {
    approvedBusiness = true;
    quotes.update((current) => ({ ...current, 'case-uuid': {
      presentation_id: 'case-uuid', presentation_type: 'CAJA', segmento: 'B2B', base_amount: '42.00',
      promotion_id: 'promo-id', promotion_name: 'Precio mayorista', discount_amount: '2.00', final_amount: '40.00', configured: true, currency: 'USD',
    } }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${businessProductId}`);
    http.expectOne(`/api/catalog/products/${businessProductId}`).flush(makeProduct({ id: businessProductId }));
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('$40.00');
    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('Precio mayorista');
    expect(harness.routeNativeElement?.textContent).not.toContain('$5.00');
  });

  it('keeps the visible selection aligned with the unit quote when MS02 returns cases first', async () => {
    quotes.update((current) => ({ ...current, 'unit-uuid': {
      presentation_id: 'unit-uuid', presentation_type: 'UNIDAD', segmento: 'B2C', base_amount: '5.00',
      promotion_id: null, promotion_name: null, discount_amount: '0.00', final_amount: '5.00', configured: true, currency: 'USD',
    } }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    http.expectOne(`/api/catalog/products/${productId}`).flush(makeProduct({
      presentaciones: [
        { id: 'case-uuid', tipo: 'CAJA', unidades_por_presentacion: 12, activo: true },
        { id: 'unit-uuid', tipo: 'UNIDAD', unidades_por_presentacion: 1, activo: true },
      ],
    }));
    harness.detectChanges();

    expect(harness.routeNativeElement?.querySelector<HTMLSelectElement>('#detail-presentation')?.value).toBe('UNIDAD');
    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('$5.00');
  });

  it('shows quote loading, error, and unconfigured states without blocking product details', async () => {
    statuses.update((current) => ({ ...current, 'unit-uuid': { loading: true, error: '' } }));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(`/catalogo/producto/${productId}`);
    http.expectOne(`/api/catalog/products/${productId}`).flush(makeProduct());
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('Consultando precio');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent).toContain('Caña Sureña');

    statuses.update((current) => ({ ...current, 'unit-uuid': { loading: false, error: 'No pudimos consultar el precio. Intenta nuevamente.' } }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('No pudimos consultar el precio');

    statuses.update((current) => ({ ...current, 'unit-uuid': { loading: false, error: '' } }));
    harness.detectChanges();
    expect(harness.routeNativeElement?.querySelector('.detail-price')?.textContent).toContain('Precio no configurado');
  });

  it('server-renders dynamic product details and keeps the existing routes prerendered', () => {
    expect(serverRoutes[0]).toEqual({ path: 'catalogo/producto/:id', renderMode: RenderMode.Server });
    expect(serverRoutes.at(-1)).toEqual({ path: '**', renderMode: RenderMode.Prerender });
  });
});
