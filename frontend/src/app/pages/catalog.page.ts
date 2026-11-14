import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../core/auth.service';
import { CatalogApiService } from '../core/catalog-api.service';
import { Category, Product, Presentation } from '../core/api';

const productImageFiles: Record<string, string> = {
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

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly auth = inject(AuthService);
  protected readonly categories = signal<Category[]>([]);
  protected readonly products = signal<Product[]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly hasLoaded = signal(false);
  protected query = '';
  protected categoryId = '';
  protected readonly selectedTypes = signal<Record<string, 'UNIDAD' | 'CAJA'>>({});

  ngOnInit() {
    if (this.isBrowser) this.loadCatalog();
  }

  protected loadCatalog() {
    this.loading.set(true);
    this.error.set('');
    this.api.categories().subscribe({
      next: (categories) => this.categories.set(categories),
      error: () => this.categories.set([]),
    });
    this.api
      .products({
        ...(this.query.trim() && { q: this.query.trim() }),
        ...(this.categoryId && { category_id: this.categoryId }),
        page: 1,
        page_size: 100,
      })
      .subscribe({
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

  protected search() {
    this.loadCatalog();
  }

  protected chooseCategory(value: string) {
    this.categoryId = value;
    this.loadCatalog();
  }

  protected allowedPresentations(product: Product): Presentation[] {
    const active = product.presentaciones.filter((presentation) => presentation.activo);
    return this.auth.isApprovedBusiness()
      ? active.filter((presentation) => presentation.tipo === 'CAJA')
      : active;
  }

  protected selectedPresentation(product: Product): Presentation | undefined {
    const allowed = this.allowedPresentations(product);
    const selected = this.selectedTypes()[product.id];
    return allowed.find((presentation) => presentation.tipo === selected) ??
      allowed.find((presentation) =>
        this.auth.isApprovedBusiness() ? presentation.tipo === 'CAJA' : presentation.tipo === 'UNIDAD',
      ) ?? allowed[0];
  }

  protected selectPresentation(product: Product, type: 'UNIDAD' | 'CAJA') {
    if (!this.allowedPresentations(product).some((presentation) => presentation.tipo === type)) return;
    this.selectedTypes.update((selected) => ({ ...selected, [product.id]: type }));
  }

  protected productImage(product: Product) {
    const file = productImageFiles[product.nombre];
    if (!file) return '/logo-isotipo.png';
    return this.selectedPresentation(product)?.tipo === 'CAJA'
      ? `/img-mayoreo/caja-${file}.webp`
      : `/img-minorista/${file}.webp`;
  }

  protected get isApprovedBusiness() {
    return this.auth.isApprovedBusiness();
  }
}
