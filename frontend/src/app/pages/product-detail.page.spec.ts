import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { RenderMode } from '@angular/ssr';
import { routes } from '../app.routes';
import { serverRoutes } from '../app.routes.server';
import { AuthService } from '../core/auth.service';
import { Product } from '../features/catalog/models/catalog.models';

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

  beforeEach(() => {
    approvedBusiness = false;
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter(routes),
        {
          provide: AuthService,
          useValue: { isApprovedBusiness: () => approvedBusiness },
        },
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

  it('server-renders dynamic product details and keeps the existing routes prerendered', () => {
    expect(serverRoutes[0]).toEqual({ path: 'catalogo/producto/:id', renderMode: RenderMode.Server });
    expect(serverRoutes.at(-1)).toEqual({ path: '**', renderMode: RenderMode.Prerender });
  });
});
