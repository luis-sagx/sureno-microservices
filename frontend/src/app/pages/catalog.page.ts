import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CatalogApiService } from '../features/catalog/data-access/catalog-api.service';
import { Category, Product, Presentation } from '../features/catalog/models/catalog.models';
import { productImagePath } from '../features/catalog/domain/product-media';
import { getAllowedPresentations, selectPresentation } from '../features/catalog/domain/presentation-rules';
import { RevealOnScrollDirective } from '../core/reveal-on-scroll.directive';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, FormsModule, RevealOnScrollDirective],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage implements OnInit {
  private readonly api = inject(CatalogApiService);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
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
    return getAllowedPresentations(product.presentaciones, this.auth.isApprovedBusiness());
  }

  protected selectedPresentation(product: Product): Presentation | undefined {
    const allowed = this.allowedPresentations(product);
    const selected = this.selectedTypes()[product.id];
    const defaultType = this.auth.isApprovedBusiness() ? 'CAJA' : 'UNIDAD';
    return selectPresentation(allowed, selected, defaultType);
  }

  protected selectPresentation(product: Product, type: 'UNIDAD' | 'CAJA') {
    if (!this.allowedPresentations(product).some((presentation) => presentation.tipo === type)) return;
    this.selectedTypes.update((selected) => ({ ...selected, [product.id]: type }));
  }

  protected productImage(product: Product) {
    return productImagePath(product, this.selectedPresentation(product));
  }

  protected openProduct(id: string, event: MouseEvent): void {
    event.preventDefault();
    if (!this.isBrowser) return;
    const windowRef = this.document.defaultView;
    windowRef?.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    void this.router
      .navigate(['/catalogo/producto', id])
      .then(() => windowRef?.scrollTo({ top: 0, left: 0, behavior: 'instant' }));
  }

  protected get isApprovedBusiness() {
    return this.auth.isApprovedBusiness();
  }
}
