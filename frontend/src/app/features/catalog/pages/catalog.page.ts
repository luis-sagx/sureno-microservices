import { CommonModule, DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth.service';
import { CatalogFacade } from '../data-access/catalog.facade';
import { CatalogPricingFacade } from '../data-access/catalog-pricing.facade';
import { Category, Product, Presentation } from '../models/catalog.models';
import { productImagePath } from '../domain/product-media';
import { getAllowedPresentations, selectPresentation } from '../domain/presentation-rules';
import { RevealOnScrollDirective } from '../../../shared/directives/reveal-on-scroll.directive';

@Component({
  selector: 'app-catalog-page',
  imports: [CommonModule, FormsModule, RevealOnScrollDirective],
  templateUrl: './catalog.page.html',
  styleUrl: './catalog.page.css',
})
export class CatalogPage implements OnInit {
  private readonly catalog = inject(CatalogFacade);
  private readonly pricing = inject(CatalogPricingFacade);
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  protected readonly auth = inject(AuthService);
  protected readonly categories = this.catalog.categories;
  protected readonly products = this.catalog.products;
  protected readonly loading = this.catalog.loading;
  protected readonly error = this.catalog.error;
  protected readonly hasLoaded = this.catalog.hasLoaded;
  protected query = '';
  protected categoryId = '';
  protected readonly selectedTypes = signal<Record<string, 'UNIDAD' | 'CAJA'>>({});
  private readonly quoteSync = effect(() => {
    const products = this.products();
    this.auth.user();
    const presentationIds = products
      .map((product) => this.selectedPresentation(product)?.id)
      .filter((id): id is string => !!id);
    if (presentationIds.length > 0) this.pricing.load(presentationIds);
  });

  ngOnInit() {
    if (this.isBrowser) this.loadCatalog();
  }

  protected loadCatalog() {
    this.catalog.load({
      ...(this.query.trim() && { q: this.query.trim() }),
      ...(this.categoryId && { category_id: this.categoryId }),
      page: 1,
      page_size: 100,
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

  protected quoteFor(product: Product) {
    const presentation = this.selectedPresentation(product);
    const quote = this.pricing.quoteFor(presentation?.id);
    if (!quote) return undefined;
    const expectedSegment = this.auth.isApprovedBusiness() ? 'B2B' : 'B2C';
    return quote.segmento === expectedSegment ? quote : undefined;
  }

  protected quoteProfileMismatch(product: Product): boolean {
    const presentation = this.selectedPresentation(product);
    const quote = this.pricing.quoteFor(presentation?.id);
    if (!quote) return false;
    return quote.segmento !== (this.auth.isApprovedBusiness() ? 'B2B' : 'B2C');
  }

  protected quoteStatus(product: Product) {
    return this.pricing.statusFor(this.selectedPresentation(product)?.id);
  }

  protected formatPrice(amount: string): string {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(amount));
  }

  protected hasDiscount(amount: string): boolean {
    return Number(amount) > 0;
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
