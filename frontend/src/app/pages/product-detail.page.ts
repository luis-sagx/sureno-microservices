import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, OnInit, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { CatalogApiService } from '../core/catalog-api.service';
import { Presentation, Product } from '../core/api';
import { productImagePath } from '../core/product-media';
import { RevealOnScrollDirective } from '../core/reveal-on-scroll.directive';

const UUID_PATTERN = /^[\da-f]{8}-(?:[\da-f]{4}-){3}[\da-f]{12}$/i;

@Component({
  selector: 'app-product-detail-page',
  imports: [CommonModule, RouterLink, RevealOnScrollDirective],
  templateUrl: './product-detail.page.html',
  styleUrl: './product-detail.page.css',
})
export class ProductDetailPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(CatalogApiService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly product = signal<Product | null>(null);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly selectedType = signal<Presentation['tipo']>('UNIDAD');
  protected readonly allowedPresentations = computed(() => {
    const active = (this.product()?.presentaciones ?? []).filter((presentation) => presentation.activo);
    return this.auth.isApprovedBusiness()
      ? active.filter((presentation) => presentation.tipo === 'CAJA')
      : active;
  });
  protected readonly selectedPresentation = computed(() =>
    this.allowedPresentations().find((presentation) => presentation.tipo === this.selectedType()) ??
    this.allowedPresentations()[0],
  );
  protected readonly productImage = computed(() => {
    const product = this.product();
    return product ? productImagePath(product, this.selectedPresentation()) : '';
  });
  protected readonly isApprovedBusiness = () => this.auth.isApprovedBusiness();

  ngOnInit(): void {
    if (!this.isBrowser) return;
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.loadProduct(params.get('id') ?? '');
    });
  }

  protected selectPresentation(value: string): void {
    if (
      (value === 'UNIDAD' || value === 'CAJA') &&
      this.allowedPresentations().some((presentation) => presentation.tipo === value)
    ) {
      this.selectedType.set(value);
    }
  }

  private loadProduct(id: string): void {
    this.product.set(null);
    this.error.set('');
    this.loading.set(true);
    if (!UUID_PATTERN.test(id)) {
      this.error.set('No encontramos este producto. Revisa el enlace o vuelve al catálogo.');
      this.loading.set(false);
      return;
    }

    this.api.product(id).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (product) => {
        this.product.set(product);
        const defaultType = this.auth.isApprovedBusiness() ? 'CAJA' : 'UNIDAD';
        this.selectedType.set(
          product.presentaciones.some((presentation) => presentation.activo && presentation.tipo === defaultType)
            ? defaultType
            : product.presentaciones.find((presentation) => presentation.activo)?.tipo ?? defaultType,
        );
        this.loading.set(false);
      },
      error: (error: unknown) => {
        const notFound = error instanceof HttpErrorResponse && error.status === 404;
        this.error.set(
          notFound
            ? 'No encontramos este producto. Puede haber sido retirado del catálogo.'
            : 'No pudimos cargar el detalle del producto. Intenta nuevamente más tarde.',
        );
        this.loading.set(false);
      },
    });
  }
}
